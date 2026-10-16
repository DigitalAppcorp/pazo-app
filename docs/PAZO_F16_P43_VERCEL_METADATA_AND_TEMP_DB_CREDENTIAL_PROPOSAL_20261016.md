# PAZO — F16-P43 | Metadatos Vercel y gate de credencial DB temporal

**Fecha:** 2026-10-16. **Acceso al equipo Windows reportado por Codex, no
repetido desde este chat.** PO permitió herramientas locales, pero NO
autorizó generar nuevas credenciales temporales, crear roles ni escribir
en hosted PostgreSQL.

## Nuevo baseline informado por Codex

- Supabase CLI `2.121.0`, PostgreSQL `psql 17.11` instalados.
- Sesión CLI Vercel autenticada y team `digitalapp` alcanzable desde
  PC; dos proyectos PAZO identificados. Conector Vercel de ChatGPT
  permanece en **403** al consultar variables del equipo, por lo que
  la auditoría debe hacerse en la PC autorizada.
- Flags `--dry-run`, `--linked`, `--project-ref`, `--agent`
  verificados en ayuda local por Codex. No son prueba de que usar
  `db dump` sea inocuo: puede obtener un rol de acceso temporal.
- No se leyó el informe `C:/Users/osori/Downloads/Nuevo pazo
  app/continuidad/RESULTADO_P43_CODEX_LOCAL_SETUP_20261016.md`
  desde este chat: información declarada por el operador.

## 1. Auditar Vercel solamente como metadatos

`scripts/f16-p43-vercel-db-env-names-readonly.mjs` ejecuta dos veces
`vercel env ls`, con IDs de proyecto y scope `digitalapp` fijados,
en un proceso local y capturando **toda salida y errores exclusivamente
en memoria**, sin imprimir stdout/stderr crudo.

```powershell
node ./scripts/f16-p43-vercel-db-env-names-readonly.mjs
```

El proceso emite solo:

- `pazo-app=METADATA_PARSED`, `METADATA_EMPTY`,
  `BLOCKED_OR_UNRECOGNIZED` o `UNRECOGNIZED_CLI_FORMAT`.
- Conteo y **nombres** de variables indicativas de conexión
  PostgreSQL (`DATABASE_URL`, `PG...`, `POSTGRES...`,
  `SUPABASE_DB_URL`, etc.), sin leer/devolver sus valores.
- Destinos como enumeraciones `production`, `preview` o
  `development` si aparecen literalmente en el listado.
- `P43_VERCEL_METADATA_REVIEW_ONLY_NO_SECRETS` solo si
  ambas consultas fueron interpretables; en otro caso
  `P43_VERCEL_METADATA_INCOMPLETE_NO_SECRETS`.

El formato CLI no está garantizado entre versiones: si la salida no
encaja en el parser, NO afirmar ausencia de variables, no volcarla
para depurar. Nunca utilizar `vercel env pull`, `--decrypt`,
`env add`, `env rm`, ni pegar stdout crudo en chats.
Se agregó test sintético sin secretos reales para comprobar el
formateo, fallo cerrado y exclusión de valores.

**Si aparecen variables DB directas**, registrar dependencias
potenciales antes de considerar un reset de contraseña. Si no aparecen
y el parser reconoce la tabla, significa únicamente que no aparecen
nombres DB reconocibles en esos metadatos. No prueba que servicios
externos/alias/conectores no tengan otras credenciales.

## 2. Propuesta técnica: acceso temporal de CLI (NO EJECUTAR)

**Necesita GO independiente del PO porque puede crear credencial y
rol temporal `cli_login_postgres` en PostgreSQL administrado.**

Alcance propuesto, solo después del GO:

1. Auditar host/project, CLI versión `2.121.0`, flags y permisos
   del operador. Asegurar consola privada sin PowerShell transcript,
   sin session replay, sin `--debug`, sin subida de logs y sin
   historial de comandos que incluya secretos.
2. Con tiempo limitado y una única ejecución controlada, usar el
   flujo oficial de Supabase CLI para obtener credenciales efímeras
   bajo control administrativo del proyecto, capturando íntegramente
   stdout/stderr **en proceso local privado y memoria, nunca en chat,
   GitHub, fichero ni en argumento de línea de comandos**. El código
   `scripts/backup-database.ps1` ya muestra una variante de
   `db dump --dry-run`; **NO ejecutarlo sin revisión del parser
   contra salida real en entorno aislado/sintético**, pues puede
   devolver comandos y secretos y no se ha validado con CLI 2.121.0.
3. Verificar tiempo de expiración de la credencial/rol, identidad
   de proyecto y mínimos permisos suficientes. No reemplazar contraseña
   `postgres`, no habilitar acceso JIT, no escribir tablas P42 ni
   cambiar RLS/grants. Exigir TLS verificado y CA correcta, y
   usar `psql` solo para ejecutar preflight existente en
   `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`,
   con transacción READ ONLY.
4. Reportar únicamente PASS/FAIL, rol/versión/expiración
   **no secreta**, contadores/gates. Borrar variables temporales
   y finalizar proceso, evitando conservar login o credenciales.
5. Si resulta imposible asegurar canal o confidencialidad,
   detenerse sin emisión y solicitar nuevo mecanismo; no improvisar
   SQL Editor, Management API personalizado ni resets.

Esta propuesta **no** autoriza hacer `supabase db dump --dry-run`
ni emitir credencial temporal. Una firma interna HMAC tampoco valida
cobros PayPal. Los 120 segundos del token firmado no definen
`not_before`/`not_after` de la futura clave real.

### Estado financiero y de privacidad

P42 signing keys 0, P42 gate OFF, P21 worker OFF, P40 bindings 0,
payments 0 según último hosted postflight. No reinterpretar CI PASS
como cobros autorizados; fase F16 NO-GO, PR #44 DRAFT, P28 diferido.

**Próximo gate propuesto:** auditoría Vercel de solo metadatos desde
PC + autorización PO exclusiva para acceso administrativo temporal
READ-ONLY (no provisioning). No existe GO para Live, secretos P42,
worker, checkout ni beneficios.
