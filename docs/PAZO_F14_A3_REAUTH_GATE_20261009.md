# PAZO F14 A3 — server reauthentication + internal service authentication

**Fecha:** 2026-10-09. **Estado:** código y octava migración DRAFT, no desplegados ni aplicados. PR #38 sigue apilado sobre los PR #37/#36, todos sin merge.

## Protocolo de autenticación de servicios

- Supabase recomienda `@supabase/server` con `auth: 'secret:<nombre>'` y header `apikey` en llamadas entre servicios. El borrador usa `npm:@supabase/server@1.8.1` fijado y nombre `pazo-a3-review`.
- `supabase/config.toml` deja `[functions.f14-a3-account-deletion]` en `enabled=false`. Para claves `sb_secret_...` no JWT se usa `verify_jwt=false`, **pero la autenticación se realiza explícitamente con `withSupabase({auth:'secret:pazo-a3-review'})` antes de ejecutar el handler**.
- Segundo factor independiente: `x-a3-worker-key` cotejado con secreto privado `PAZO_A3_REVIEW_INVOKE_SECRET`, además de `PAZO_A3_REVIEW_WORKER_ENABLED=true`; ambos ausentes por defecto. NO hay clave nombrada, secreto ni deployment. Usuarios normales NO se aceptan en el endpoint.
- **Limitación:** GitHub CI valida código/contratos, no el runtime Edge ni la configuración efectiva de API keys. Antes de cualquier despliegue: pruebas 401 sin clave, clave pública, clave de otra función, segundo secreto incorrecto, payload indebido, y servicio válido. No degradar a `auth:'none'`.

## Nueva verificación de contraseña (aún sin endpoint público)

- `supabase/functions/f14-a3-account-deletion/reauth.ts` requiere asociación de **tres identidades**: cuenta de JWT actual validado por Auth, cuenta propietaria de un job `requested` y cuenta de un nuevo `signInWithPassword`. Además exige ID de sesión verificado y entrega únicamente `recorded_for_review`, nunca permiso para borrar.
- `reauthAdapter.ts` usa `Auth.getUser(jwt)` (red real del proveedor) más `Auth.getClaims(jwt)` (firma y session_id). El login de contraseña debe ejecutarse desde un cliente Auth **nuevo y aislado**, con `persistSession=false` y `autoRefreshToken=false`; al obtener credenciales revoca SOLO la sesión temporal mediante `signOut({scope:'local'})` (no cerrar todos los dispositivos).
- El puerto RPC propuesto comprueba propiedad del job por servidor y guarda prueba únicamente si sesión actual corresponde al titular. **No registrar en ningún lugar contraseñas, JWT, tokens temporales ni emails de credenciales**.
- `supabase/drafts/20261009_f14_a3_recent_auth_NOT_APPLIED.sql` (octavo DRAFT): recibo privado de job/user/session, fecha de verificación y vencimiento **5 minutos**, sin secreto ni contraseña. RPC service_role exclusiva para propietario, registro y consulta. La consulta del worker requiere receipt **consumido** por una transición futura a `reviewing`; dicha transición atómica con bloqueo de todas las escrituras sigue **SIN IMPLEMENTAR**, por lo que no puede pasar legítimamente esa puerta.
- `reauthAdapter.ts` recibe factoría del cliente aislado; la factoria/endpoint HTTP de prueba de contraseña no se expone ni ha sido desplegada. La reautenticación del usuario NO funciona todavía desde la UI y el flag A3 sigue OFF.

## Pruebas ejecutadas

- GitHub Actions ejecuta pruebas de identidad/propiedad, sesión falsificada, job ajeno, contraseña inválida, contraseña de otra identidad, error de revocación, registros de evidencia denegados, error de BD sin filtrado de datos. Una expresión UUID inválida y una fixture con null mal simulado provocaron CI fallidos y se corrigieron.
- Se ejecutó en PostgreSQL alojado un fixture **solo temporal**: `BEGIN;`, tablas `pg_temp`, las tres funciones RPC adaptadas a `pg_temp`, con `ROLLBACK;`. PASS: propietario correcto, sesión de otro usuario rechazada, idempotencia de receipt sin duplicados, `reviewing` con receipt no consumido rechazada, receipt consumido fresco aprobado para lectura y expirado rechazado, rol authenticated rechazado.
- **Limitación:** no se probó login real con contraseña de una cuenta de PAZO, no se creó evidencia de usuario ni se desplegó el servicio. La prueba no representa un apply completo de migración y RLS en esquema real.
- Verificar la última corrida CI de PR #38 antes de considerar cerrado el checkpoint.

## Bloqueos siguientes y seguridad

La transición segura `requested → reviewing` requiere consumir comprobante de reautenticación con el mismo lock que congelará todas las escrituras; hoy no existe. Siguen sin resolver write fence integral (Storage/rescate/QR/notificaciones, etc.), integridad de FK/UGC, pruebas de dos conexiones reales, limpieza por Storage API y verificación CDN/backup, revocación de JWT viejos y Auth al final. Mantener `supabase/config.toml` desactivado, siete borradores anteriores + este octavo sin apply y los PR sin merge. Un botón de UI nunca sustituirá evidencia del servidor.

Fuentes técnicas: [Supabase Securing Edge Functions](https://supabase.com/docs/guides/functions/auth), [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Signing out](https://supabase.com/docs/guides/auth/signout).
