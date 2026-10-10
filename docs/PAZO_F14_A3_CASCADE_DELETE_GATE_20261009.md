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
