# PAZO A3 — Evidencia real limitada y Gate de Auth service-to-service (2026-10-09)

**Branch:** `f14/a3-account-deletion-draft-20261009` / PR #38 DRAFT, sin merge. Autorización PO vigente: código, migraciones borrador y pruebas temporales reversibles. No aplicación, deploy ni eliminación.

## Verificadores reales conectados

El motor de revisión usa `A3_REVIEW_GATES` (diez requisitos). Dos tienen provider server-only en `supabase/functions/f14-a3-account-deletion/checks.ts`: `worker_lease_valid`, que consulta lease actual a PostgreSQL; y `legacy_authorship_reconciled`, que consulta si NO existe JSON antiguo de comentarios sin resolver. El adaptador jamás recibe una autorización de un navegador. Ambos requieren boolean true exacto y fallan con RPC error/no dato.

**No sobreinterpretar:** `legacy_clear=true` prueba exclusivamente ausencia de JSON legacy no vacío, nunca autoría reconciliada de registros ajenos en otras tablas. Incluso si ambas RPC existen y devuelven true, el primer gate `recent_reauthentication` sigue sin provider, por lo que el worker siempre se detiene antes de llegar a ellas en el orden de ejecución actual. Las otras ocho verificaciones continúan sin implementación y no hay ejecutor de eliminación. Esto es preparación, no funcionalidad activa.

## SQL y tests

La séptima migración `supabase/drafts/20261009_f14_a3_worker_legacy_clear_NOT_APPLIED.sql` está bloqueada por excepción transaccional. Propone RPC SECURITY DEFINER con rol servicio solamente, consulta privada de propietario y estado del job, y retorno verdadero únicamente si las publicaciones del titular tienen comments NULL, JSON null o [] sin comentarios embebidos. Un objeto JSON, cadena o array no vacío provoca bloqueo. No realiza UPDATE/DELETE/Storage.

Pruebas de GitHub Actions #38004703115 y #38004748138 SUCCESS. PostgreSQL temporal en Supabase hospedado `BEGIN` / `ROLLBACK`: rechazo de cuenta no `reviewing`, rol `authenticated`, comentario JSON con autoría no verificada y objeto no-array; aceptación solo de ausencia verificable de comentarios legacy. Sin cambios permanentes. Validación de solo lectura posterior: 6 Auth, 6 pets, 20 Storage, RPC A3 ausentes.

## Conflicto por resolver antes de publicar Edge

Documentación oficial de Supabase: https://supabase.com/docs/guides/functions/auth. Service-to-service moderno propone claves secretas en header `apikey`, middleware de autenticación `withSupabase({auth:'secret'})` y `verify_jwt=false`. El borrador de PAZO tiene `verify_jwt=true` y segundo secreto interno en header `x-a3-worker-key`, que podría no ser compatible con nuevas claves no-JWT. Es **incompatibilidad pendiente**, no razón para desactivar la seguridad del gateway sin sustituirla por validación oficial. La función permanece `enabled=false` y con env flag apagado. Debe elegirse modelo seguro y probar denegación de clientes normales y acceso de servicio en Edge antes de activar.

## Gates restantes

Reautenticación reciente probada por servidor (no JWT `iat`), freeze real para todas las escrituras, archivo de aportes ajenos/legacy, Storage API/CDN verificado, sesión antigua invalidada, backup/retención, FK real y worker físico con Auth al final; pruebas reales con dos sesiones y migration apply aislado antes de desplegar. Los gates de autorización PO para SQL alojado, despliegues, borrados y merge siguen separados.

## Reconciliación de autenticación de Edge — borrador actualizado (2026-10-09)

Se eligió el protocolo moderno de Supabase para llamadas *servicio a servicio*: `@supabase/server@1.8.1` (pin) con `withSupabase({auth:'secret:pazo-a3-review'})`. El middleware validaría exclusivamente una **clave secreta nombrada** del proveedor en el header `apikey`; `verify_jwt=false` en `supabase/config.toml` es necesario para aceptar `sb_secret_...` no JWT, **no es una apertura pública**, porque la validación de clave se hace en `@supabase/server`. Además, el handler existente exige un segundo secreto independiente `x-a3-worker-key` y la variable de habilitación `PAZO_A3_REVIEW_WORKER_ENABLED=true`. La función continúa `enabled=false` en config, la variable no está configurada y la clave nombrada NO se ha creado. Ninguna llamada API se ha desplegado.

**Gate pendiente:** probar en runtime Edge/Deno que solicitudes sin `apikey`, con `apikey` público/usuario, con clave equivocada y sin segundo secreto reciben denegación; que una clave nombrada válida solo llega al motor de revisión (no al de eliminación); y validar en GitHub/Deno el SDK pinneado. No se puede afirmar E2E del middleware basándose solo en tests Node/estáticos. Una autorización futura de deploy/clave deberá ser específica y no incluye borrado de cuentas.

## A3.4f — Auth service-to-service y contraseña server-side DRAFT (2026-10-09)

- PR #38 cambió `index.ts` a `@supabase/server@1.8.1` middleware `auth:'secret:pazo-a3-review'` con credencial nombrada de servidor por `apikey`. Por diseño `verify_jwt=false` (solo gateway) y `enabled=false` (función desactivada); segundo secreto privado y flag de runtime siguen necesarios. **No se crearon claves, secrets, recursos ni deploy**. No publicar sin pruebas reales del gateway.
- Nuevos módulos server-only `reauth.ts`/`reauthAdapter.ts` + tests: exigir sesión JWT consultada con Auth.getUser y claims válidos; job pertenece al usuario; `signInWithPassword` vuelve a validar contraseña en sesión aislada y signOut local; solo entonces registrar prueba privada, sin exponer contraseña, token ni email. **Sin endpoint HTTP de reauth**, UI A3 OFF.
- Octava migración protegida por aborto transaccional `supabase/drafts/20261009_f14_a3_recent_auth_NOT_APPLIED.sql`: prueba de sesión y propietario, TTL 5 minutos; la puerta worker necesita prueba consumida de una futura transición segura que NO está implementada, por lo que no libera eliminaciones.
- SQL alojado PG_TEMP con rollback: pertenencia y sesión externa, recibo idempotente, prueba sin consumir/rechazada, consumida/fresca permitida, caducada/rechazada, rol normal/rechazado. Ningún dato real alterado. Detalles: `docs/PAZO_F14_A3_REAUTH_GATE_20261009.md`.
- **A3/Scope Gate continúan ABIERTOS**: falta transición atómica para freeze real, cobertura de todas las escrituras, pruebas Edge/Deno con credenciales válidas, Storage/CDN/retención, Auth final. No merge ni despliegue.
