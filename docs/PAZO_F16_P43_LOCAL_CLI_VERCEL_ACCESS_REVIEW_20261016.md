# PAZO F16-P43 — Revisión de CLI y acceso a Vercel (sin mutaciones)
**2026-10-16. Estado:** inventario de solo lectura; ningún secreto temporal emitido.

## Hallazgos
- Supabase documenta que el CLI puede gestionar el rol temporal `cli_login_postgres`, pero el `supabase db dump --dry-run` usado por `scripts/backup-database.ps1` puede incluir credenciales y no se ejecutó. No se ha demostrado que los flags y la versión local sean compatibles. El mecanismo JIT es diferente y puede exigir activación; no habilitarlo.
- El repositorio tiene `scripts/f16-p43-local-tooling-inventory.ps1`: comprueba existencia/versiones de `supabase`, `psql` y `vercel`, y únicamente si existen `database.credential.xml` y `connection.json` en `%LOCALAPPDATA%\PAZO\CodexOps`. No lee contenidos, no genera credenciales, no contacta DB y no ejecuta `db dump`, `link` o `login`.
- Vercel: la conexión actual lista **cero equipos accesibles** y no permite auditar las variables de `pazo-app` y `pazo-app-t83r` (403 anterior). La sesión del navegador no ofrece una pestaña Vercel con acceso administrativo verificable. Requiere acceso autorizado al equipo `digitalapp` antes de concluir sobre dependencias. Cuando haya acceso, listar solamente **nombres, destinos y ramas** de variables con `decrypt=false`, nunca valores.
- Supabase: el estado P42 permanece sin clave, writer gate false, worker P21 false, sin P40 ni pagos. No modificar.

## Orden para Codex en equipo Windows
1. Leer AGENTS, handoff y este informe. Abrir PowerShell 7 en checkout de rama `f13/section-titles-20261012` y ejecutar `./scripts/f16-p43-local-tooling-inventory.ps1`. Compartir solo líneas de estado, no rutas privadas ni credenciales.
2. Si no existe `psql`, instalar **solo** PostgreSQL Command Line Tools mediante instalador oficial compatible; requiere acción/confirmación local del operador. No instalar servidor PostgreSQL adicional ni cambiar Supabase.
3. Si `supabase` está instalado, inspeccionar `supabase db dump --help` en consola privada y determinar disponibilidad de `--linked`, `--dry-run`, `--agent`; **no ejecutar** `supabase db dump` aún, ya que podría pedir credenciales, emitir un secreto o crear rol temporal en servicio.
4. Solicitar al usuario acceso autorizado a Vercel team `digitalapp` mediante sesión de conexión; no crear tokens ni proyectos por iniciativa del agente.
5. Al obtener inventario local y Vercel, determinar si procede ensayo temporal del CLI bajo autorización específica; si no, preparar nueva decisión PO sobre restablecimiento.
6. No seleccionar `not_before` ni `not_after`: no existe fecha aprobada. El TTL HMAC de 120s no es la duración de la clave.
7. Mantener TODO apagado. No generar material P42, no cambiar contraseña, roles o secretos.

## Resultado esperado
`P43_TOOLING_INVENTORY_ONLY_NO_DB_AUTH_OR_MUTATION`

El resultado no es conexión administrativa ni autorización para usar clave real. Sigue P43 pendiente, F16 NO-GO, P28 diferido, PR #44 DRAFT.
