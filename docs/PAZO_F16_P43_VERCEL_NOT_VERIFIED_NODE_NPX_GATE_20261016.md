# PAZO F16-P43 — Resultado segundo inventario y clasificación segura de Vercel

**Fecha:** 2026-10-16. **Alcance:** solo preparación/diagnóstico,
sin cambios alojados, sin autenticación nueva y sin secretos.

## Resultado comunicado por el operador (NO auditado en archivo local)

```text
NODE=AVAILABLE
NPM=AVAILABLE
SCOOP=MISSING
PSQL=MISSING
SUPABASE_CLI=MISSING
VERCEL_SESSION=NOT_VERIFIED
VERCEL_DIGITALAPP_TEAM=NOT_CHECKED
P43_TOOLING_SCOPE_READ_ONLY_NO_SECRETS
```

El operador indicó que guardó `PREREQUISITOS_20261016.txt` en disco
local. No se ha leído ese archivo mediante este chat: los valores
provienen de su mensaje. `VERCEL_SESSION=NOT_VERIFIED` **no prueba**
que el CLI carezca de login; también puede fallar por red, token,
permisos o cambio de CLI. El script original ocultó deliberadamente
la causa y no imprimió errores, nombres de usuario ni tokens.

## Corrección lista para ejecución local

Se actualizó `scripts/f16-p43-next-prereqs-readonly.ps1` para:

- Emitir `NODE_MAJOR` y `SUPABASE_NPX_ELIGIBLE`, solo cuando
  `node --version` es un formato conocido, sin descargar nada.
- Clasificar la salida local de `vercel whoami` y `vercel teams ls`
  exclusivamente **en memoria** y devolver estados sanitizados:
  `LOGIN_REQUIRED_OR_EXPIRED`, `FORBIDDEN_OR_SCOPE`,
  `NETWORK_OR_TLS`, `CLI_OR_ARGUMENTS`, `UNKNOWN`
  o `EXECUTION_ERROR`.
- No imprimir **ninguna** salida CLI sin filtrar, email, token,
  valores de variables, host ni credenciales. No ejecutar `vercel
  login`, `vercel link`, `vercel env ls/pull`, `supabase login`,
  `supabase db dump`, SQL, ni cambios a proyectos.

Comando local:

```powershell
./scripts/f16-p43-next-prereqs-readonly.ps1
```

La ejecución esperada debe terminar en
`P43_TOOLING_SCOPE_READ_ONLY_NO_SECRETS`. Interpretación:

- `VERCEL_SESSION_REASON=LOGIN_REQUIRED_OR_EXPIRED`:
  pedir al **usuario** que abra sesión en Vercel de manera privada
  (`vercel login`) y luego repetir diagnóstico. No automatizar login
  ni compartir enlace/token de autenticación en chats.
- `VERCEL_SESSION_REASON=FORBIDDEN_OR_SCOPE` o
  `VERCEL_TEAM_REASON=FORBIDDEN_OR_SCOPE`:
  restaurar acceso autorizado al team `digitalapp`; no crear
  accesos por iniciativa del agente.
- `NETWORK_OR_TLS`: validar conexión de red, proxy y fecha del
  sistema local; nunca desactivar verificaciones TLS.
- `UNKNOWN`/`EXECUTION_ERROR`: analizar error **localmente**
  para clasificar sin publicar stdout/stderr completo.
- `VERCEL_SESSION=AUTHENTICATED` y
  `VERCEL_DIGITALAPP_TEAM=LISTED`: significa que el equipo
  aparece en los metadatos, **NO** que ya se hayan auditado
  variables de entorno de los dos proyectos.

## Supabase CLI sin Scoop

Node y npm están presentes pero se desconoce versión. Supabase
documenta que CLI con npx requiere **Node 20 o posterior**.
Fuente: https://supabase.com/docs/guides/local-development/cli/getting-started

Si `SUPABASE_NPX_ELIGIBLE=YES`, el operador puede ejecutar **en su
equipo, con su aprobación del descargado local/cache**:

```powershell
npx --yes supabase --help
npx --yes supabase db dump --help
```

Ambos son comandos de ayuda, no conectan a PAZO ni emiten credenciales
DB; `npx` **puede descargar el paquete CLI al caché local**.
No instalar globalmente con `npm install -g supabase`, método no
soportado. No ejecutar `db dump --dry-run` ya que puede emitir
secreto temporal/crear rol. `psql` permanece sin instalar; no se
soluciona por instalar Supabase CLI.

Si Node es anterior a 20 o npx no está disponible, optar por
instalación local desde fuente oficial (p. ej. Scoop, binario firmado)
con permiso del operador; no habilitar add-ons, servidores locales
ni recursos pagados de manera automática.

## Estado y gates

- No se ha obtenido sesión Vercel válida ni se ha auditado el nombre/
  destino de las variables de sus dos proyectos.
- No hay `psql`, `supabase` global, archivos locales de credenciales
  ni conexión administrativa PostgreSQL demostrada.
- La clave P42 real y `not_before`/`not_after` siguen pendientes;
  no deducir fechas a partir del TTL HMAC de 120 segundos.
- Mantener P42/P21 y checkout apagados, P40 vacío, ledger sin pagos,
  PayPal Sandbox buyer OFF, P28 diferido, PR #44 DRAFT, F16 NO-GO.
- Esta revisión **no** autoriza restablecer password,
  habilitar JIT, solicitar rol temporal, instalar secretos, cambiar
  permisos, actualizar Vercel o ejecutar operaciones hospedadas.

**Próximo resultado requerido:** líneas sanitizadas del script
actualizado y, si Node>=20, resultado de comandos `--help`
**sin pegar información privada**.
