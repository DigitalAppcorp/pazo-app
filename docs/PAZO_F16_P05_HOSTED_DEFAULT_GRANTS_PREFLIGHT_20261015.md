# PAZO F16-P05 — Hallazgo real de permisos predeterminados y bloqueo de migraciones

**Fecha:** 2026-10-15 · **Rama:** `f13/section-titles-20261012` · **Estado:** seguridad auditada en Supabase alojado (solo lectura); sin cambios de configuración ni DDL. PR #44 DRAFT. F16 para pagos públicos: NO-GO.

## 1. Qué está protegido hoy

Consulta READ-ONLY contra el proyecto Supabase de PAZO con `supabase/queries/f16_p05_public_grants_preflight_READ_ONLY.sql`:

| Comprobación | Resultado alojado |
|---|---|
| Las 7 funciones públicas existentes `f16_paypal_*` tienen `SECURITY DEFINER`, `EXECUTE` solo `service_role` | **PASS** |
| Las 6 tablas privadas mantienen RLS habilitada/forzada y no permiten lectura directa a `anon`, `authenticated` ni `service_role` | **PASS** |
| Nuevas funciones `public` creadas por `postgres` no reciben acceso automáticamente de roles externos | **BLOCK_NEW_DDL** |
| Nuevas RPC privilegiadas de claim/inverse/ledger P05 de `DO_NOT_APPLY` no aparecen instaladas | **PASS** |

Auditoría de estado sin leer IDs ni contenido de compradores: **1 intent BOUND, 8 eventos pendientes, 0 pagos en ledger y 0 reversos**. No se han generado nuevos pagos ni beneficios.

El resultado `BLOCK_NEW_DDL` **no significa que las siete RPC existentes estén expuestas**. Significa que los *permisos predeterminados* para nuevas funciones `public` de propietario `postgres` incluyen `EXECUTE` para `anon` y `authenticated`. Si una futura migración crea una función privilegiada sin revocar esos permisos, podría exponerla inmediatamente. La revocación explícita debe estar en la **misma transacción** que el `CREATE FUNCTION`, o preferentemente utilizar esquema no expuesto con una conexión privada de servidor.

## 2. Qué quedó preparado ahora

- **Consulta de catálogo read-only:** `supabase/queries/f16_p05_public_grants_preflight_READ_ONLY.sql` revisa permisos existentes, FORCE RLS, privilegios por defecto y ausencia de drafts instalados. Ejecutada realmente mediante la conexión Supabase; resultados arriba.
- **Guardia estática de CI:** `src/features/supporter/testing/p05PrivilegedDraftGrantAudit.mjs`, con `.test.mjs`. Examina los cinco borradores protegidos P05 y comprueba las guardas `f14_synthetic/f14_admin`, transacción, `SECURITY DEFINER`, `search_path=''`, `REVOKE ALL ... FROM PUBLIC,anon,authenticated` por función y `GRANT EXECUTE ... TO service_role`. Rechaza grants públicos añadidos y nuevas funciones que carezcan de sus revocaciones. El runner `npm run test:f16:synthetic` incorpora el archivo de test automáticamente. **Esto es una comprobación heurística, no un parser SQL completo, auditoría legal ni autorización de instalación**.
- **Nueva documentación y handoff:** registrar el riesgo y mantener los permisos por defecto alojados intactos hasta disponer de revisión de impacto y GO específico. No se ejecutó `ALTER DEFAULT PRIVILEGES` en el proyecto.

## 3. Decisión pendiente y acciones antes de un deploy

1. **No aplicar ninguno de los borradores `DO_NOT_APPLY`**, ni editar grants del proyecto mediante un «ok sigue» genérico. Los borradores tienen guardias que solo aceptan PostgreSQL desechable.
2. Para un futuro servidor P05, decidir con el PO y seguridad si se usa un esquema privado no expuesto + acceso interno directo o RPC `public` con `REVOKE` y `GRANT` atómicos. **Actualmente el adaptador offline del ledger espera llamadas REST/RPC**: un cambio a esquema no expuesto necesita rediseñar ese adaptador, no simplemente mover la función.
3. Auditar la **fecha efectiva de actualización de permisos de Supabase** y volver a consultar la configuración del proyecto antes de instalar. No asumir que el comportamiento cambiará automáticamente o que los objetos previos perderán sus permisos.
4. Conservar F16-P05 en NO-GO mientras falten aprobaciones legales/retención y procedencia de pago/ciclo. Las firmas Ed25519 de laboratorio solo prueban integridad, no autorizan captura.
5. Después de GO **específico**, aplicar un plan SQL único y reversible en Sandbox, comprobar inmediatamente `has_function_privilege` para los tres roles y RLS/FORCE, y revertir si aparece un solo `anon_exec/auth_exec=true`. Los permisos de otras funciones F14 no pertenecen a este gate.

**Fuente:** [Documentación oficial de Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api). Ningún dato financiero, política alojada, función Edge o PayPal fue modificado.
