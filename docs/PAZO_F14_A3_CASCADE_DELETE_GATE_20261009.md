# PAZO F14 A3 — Bloqueo Auth-last / CASCADE vs write fence
Fecha: 2026-10-09. Estado: **GATE 8 ABIERTO, DRAFT**; sin DDL, merge, flags ni borrado real.

## Evidencia verificada en PostgreSQL alojado (READ ONLY)
- `public.profiles.id → auth.users.id ON DELETE CASCADE`.
- `public.pets.owner_id → auth.users.id` es **NO ACTION**; el Auth DELETE requiere eliminar o reubicar pets antes.
- `public.posts.user_id → auth.users.id` es **NO ACTION**; el Auth DELETE requiere eliminar o reubicar posts antes.
- `public.pet_documents.pet_id → public.pets.id` es **ON DELETE RESTRICT**; la eliminación física de una mascota se bloquea mientras quedan documentos.
- Existen otras FKs CASCADE desde Auth a communities, memberships, follows indirectos, checkins, validations, etc. Una cascada puede eliminar contribuciones de terceros si las dependencias no se preservan antes.

## Contradicción confirmada en el borrador
El trigger A3 `a3_write_fence_profiles BEFORE INSERT OR UPDATE OR DELETE` propuesto llama al guard, que niega (42501) escrituras si `deletion_jobs.status NOT IN ('requested','cancelled')`. Cuando un job esté en `reviewing`, un futuro `auth.admin.deleteUser` activaría la cascada `auth.users→profiles`, pero el trigger la bloquearía. **No existe una excepción de limpieza terminal autorizada**; el sistema actual no puede prometer ejecución de borrado completo.

## Prueba real, aislada de datos
- SQL reproducible: `scripts/f14-a3-cascade-temp-qa.sql`.
- Se ejecutó en Supabase alojado con `BEGIN`, tablas `pg_temp`, guard sintético que replica **solo el predicado relevante** de bloqueo de `profiles`, y `ROLLBACK`; ningún objeto permanente ni dato real cambiado.
- **PASS:** `reviewing` → cascade DELETE rechazado por 42501 y filas sintéticas intactas; cuentas sin job y `requested` → cascade DELETE permitido en fixture. Esto confirma **ese conflicto específico**, no ejecuta los diez borradores originales ni simula Auth/Storage reales.

## Solución futura: condiciones antes de desbloquear
1. Diseñar una operación de limpieza **exclusiva de servicio**, condicionada a lease/capacidad y evidencias verificadas, que proteja contra bypass arbitrario o del cliente. Nunca permitir un `SET` de sesión público que desactive triggers ni una excepción global `service_role`.
2. Conservar contenidos aportados por terceros y comentarios históricos; resolver restricciones/cascadas `posts`, `pets`, `pet_documents`, `profiles` y comunidad, con secuencia de borrado idempotente y respaldos/retención.
3. Finalizar primero Storage privado/compartido, enlaces/CDN, señales/RPC y revocación de sesiones; Auth estrictamente último con evidencia de que no quedan FKs restrictivas; reconciliar estado final del job y su FK a Auth.
4. Probar el flujo en una DB **aislada** con 2 conexiones, roles reales, RLS, reintentos, fallos parciales y preservación de terceros. Requiere aprobación específica para cualquier apply/ejecución real.

**DoD de A3 bloqueado:** `full_write_fence_ready()` permanece `SELECT false`. El worker actual no tiene permiso para borrar Auth/Storage; ningún resultado de `pg_temp` o CI equivale a aprobación del servicio.

## Contrato puro de secuencia terminal añadido al PR #38 (DRAFT)

- `supabase/functions/f14-a3-account-deletion/terminalPlan.ts`: verificador sin I/O que enumera pasos y evidencia exacta para freeze, archivo privado de terceros, despublicación, Storage, filas con FK, retención, revocación, Auth al final y verificación/auditoría posterior.
- Los dos bloqueos estructurales `frozen_profile_cascade_rejected` y `deletion_job_auth_fk_restrict` son constantes **no controladas por input**, incluso si todos los flags de evidencia son `true`. `authDeleteAllowed` y `destructiveExecutionAllowed` son `false` incondicionalmente. No importa ni modifica el worker actual.
- `terminalPlan.test.mjs`: verifica orden y cobertura sin saltarse etapas, rechazo de evidencias `'true'` y claves extras, bloqueos estructurales persistentes, y ausencia de APIs de delete. Añadido a CI.
- **No es implementación de un executor, ni certificación de reauth/Storage/Auth/PG concurrente.** Próximo gate: acordar y verificar cómo el esquema y el lease autorizan únicamente la limpieza terminal de un job; adaptar transiciones/FKs/triggers en SQL DRAFT protegido por aborto, con pruebas en DB aislada. Ninguna acción de backend real autorizada.

## A3.5 — Scope transaccional de perfil (propuesta 2026-10-09)

- Archivo número 11 **NO_APLICADO**: `supabase/drafts/20261009_f14_a3_terminal_profile_scope_NOT_APPLIED.sql`. Solo `profiles DELETE` si la operación procede de RPC `service_role` con `job_id`, dueño, lease token+versión+vencimiento y estado exacto `deleting_auth`, bajo un único backend y el `xid8` de la transacción. Tabla `account_private.deletion_terminal_scopes` privada sin grants a anon/authenticated/service_role. El guard A3 usa una excepción únicamente para perfiles y **solo si** la verificación del scope coincide.
- Dos gates son **SELECT false**: `f14_a3_full_write_fence_ready()` preexistente y `f14_a3_terminal_profile_cleanup_ready()` nuevo. Además todos los archivos abortan por defecto antes de DDL; no hay manera activa de borrar perfiles en Supabase.
- Prueba `pg_temp` real bajo BEGIN/ROLLBACK PASS: sin scope deniega, con scope correcto permite verificación, cuenta diferente/status `reviewing`/versión incorrecta/lease expirado deniegan. NO se instaló RPC ni se eliminó perfil real. Faltan pruebas de trigger completo, 2 sesiones, FK real y roles.
- **Bloqueos restantes:** el lease existente de worker solo permite adquirir/validar `reviewing`, no `deleting_auth`; job FK Auth RESTRICT y otros FKs/cascadas requieren diseño adicional. Esta excepción NO resuelve Auth delete ni ejecuta limpieza. No activar readiness ni permiso de borrado.

### A3.5 — Scoped profile transaction draft, still disabled

Se agregó `supabase/drafts/20261009_f14_a3_terminal_profile_scope_NOT_APPLIED.sql` (11º SQL DRAFT) y la extensión acotada del `f14_a3_guard_social_write`: `profiles DELETE` puede exceptuar un propietario **solo** si existe autorización privada de la **misma transacción/backend**, mismo `job_id` y lease vigente y estado `deleting_auth`. Ninguna excepción global del rol `service_role` ni GUC de bypass. El nuevo `f14_a3_terminal_profile_cleanup_ready()` y el antiguo `f14_a3_full_write_fence_ready()` permanecen siempre `false`; todos los SQL abortan antes del DDL. QA `pg_temp` ROLLBACK del predicado aislado PASS; integración real NO probada. Conflicto del lease `reviewing` y FK Auth siguen abiertos.
