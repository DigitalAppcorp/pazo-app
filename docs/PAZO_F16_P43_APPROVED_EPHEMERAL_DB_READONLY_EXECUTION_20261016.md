# PAZO — F16-P43 | Ejecución única de acceso efímero y SQL de solo lectura

**Fecha:** 2026-10-16. **Gate:** Product Owner respondió «sí» a la
petición concreta de solicitar **una sola credencial administrativa
temporal de Supabase** y utilizarla únicamente en el **preflight SQL
versionado P42 de solo lectura**. Este GO no es autorización para
generar/provisionar claves P42, usar HMAC, crear cuentas, habilitar
checkout/worker, pagos, beneficios o modificar contraseña principal.

## Contexto revisado

- Repo `DigitalAppcorp/pazo-app`, rama `f13/section-titles-20261012`,
  PR #44 **DRAFT**.
- Supabase project ref `mrybvqdebbgcayuvgkkr`.
- Operador informó Supabase CLI `2.121.0`, PostgreSQL client `17.11`
  y certificado CA TLS descargado en su equipo Windows.
- Supabase documenta `cli_login_postgres` como rol temporal administrado
  cuando CLI opera sin password DB. Su duración exacta **no fue
  comprobada para este intento**; no inferir un TTL preciso.
- La CLI `db dump --dry-run` podría crear dicho rol y devolver una
  contraseña; **esa es la única mutación de autenticación potencial
  autorizada** en este gate. No ejecutar un dump real.
- Documento estructural SQL exacto con blob Git:
  `ac9246a0106ebefd6d425a549d9f207242760eec`,
  `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`.
  No sustituir por un comando SQL improvisado.
- Se reportó previamente metadata Vercel PASS de ambos proyectos con
  cero identificadores de conexión DB reconocidos; no significa
  ausencia universal de consumidores DB.
- **No se ha ejecutado desde ChatGPT** la solicitud CLI efímera ni
  la conexión psql: esta orden se entrega al Codex con acceso a
  la computadora del operador.

## Orden a Codex (una sola ejecución, sin nuevos permisos)

1. Leer `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`,
   `docs/PAZO_MASTER_ROADMAP.md` y esta orden, y
   confirmar la rama de trabajo sin alterar archivos locales.
   Actualizar por `git pull --ff-only` si es seguro; abortar si
   existen conflictos o cambios locales relevantes. No forzar reset.
2. Verificar PowerShell/Windows privado del operador, no máquina
   compartida, consola sin `Start-Transcript`, sin
   session replay, sin copias automáticas de la consola ni
   `--debug`. Si algún servicio de ejecución/agent captura
   stdout/stderr crudo de subprocesos a sus logs, **NO ejecutar**:
   se requiere captura privada estrictamente en memoria.
3. Confirmar que la CA oficial de Supabase previamente descargada
   está en un archivo accesible y que su procedencia fue validada
   fuera del chat. No deshabilitar TLS.
4. Validar sintaxis de la CLI y prueba sintética antes de ejecutar:
   ```powershell
   node --check .\scripts\f16-p43-ephemeral-readonly-preflight.mjs
   node --test .\src\features\supporter\testing\f16P43EphemeralReadOnlyPreflight.test.mjs
   ```
5. En la carpeta raíz de PAZO, **una sola vez**:
   ```powershell
   node .\scripts\f16-p43-ephemeral-readonly-preflight.mjs --execute-approved-readonly --ca "C:\RUTA_PRIVADA\certificado-supabase.pem"
   ```
   La ruta es un ejemplo de formato, **no** el archivo real.
   Codex debe sustituirla desde el disco privado del operador;
   no imprimir ni inventar la ruta. El argumento CA no es la
   contraseña DB. La credencial efímera NO se pega en consola.

### Controles aplicados por script

- Antes de solicitar nada: CA existente, SQL exacto (blob Git),
  Supabase CLI **2.121.0** y `psql` **17.11**. Si hay deriva,
  detenerse antes de solicitar credencial.
- Crea marcador local no secreto con apertura exclusiva
  `%LOCALAPPDATA%\PAZO\CodexOps\p43-ephemeral-readonly-one-attempt-20261016.lock`
  **antes** de CLI para impedir un segundo intento casual.
  **No borrar ni reintentar** tras fallo sin GO adicional del PO.
- Invoca UNA VEZ `supabase db dump --linked --project-ref
  mrybvqdebbgcayuvgkkr --dry-run --agent no` desde subproceso
  privado. Captura stdout/stderr **en memoria**; no los imprime,
  persiste ni interpreta como shell.
- Solo acepta exportaciones inequívocas de `PGHOST`, `PGPORT`,
  `PGDATABASE`, `PGUSER`, `PGPASSWORD`; hostname/rol
  correspondientes al proyecto; puerto `5432`; base `postgres`;
  prueba comando de proveedor con `--role=postgres`.
  Cualquier variación aborta y NO ejecuta SQL.
- `psql` se ejecuta como subproceso sin shell,
  con contraseña exclusivamente en entorno del proceso hijo,
  nunca argumento URL, SQL Editor, commit, log ni chat.
  `PGSSLMODE=verify-full`, `PGSSLROOTCERT` CA, timeout,
  `PGOPTIONS` con `default_transaction_read_only=on`.
  El SQL comienza `BEGIN TRANSACTION READ ONLY` y solo audita
  estructura, ACL, RLS, llaves y gates.
- Su resultado debe igualar EXACTAMENTE:
  `P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY|f|f|f|f|f`.
  No emite credenciales ni psql stdout; solo marcadores
  estáticos de éxito o falla.
- Las credenciales viven transitoriamente en memoria de
  los procesos mientras trabajan, condición inevitable para
  autenticarse; no afirmar eliminación criptográfica de RAM.
  Se cierran al terminar. El rol es administrado por proveedor:
  no ejecutar DROP ROLE/NOLOGIN ni otra mutación.

## Resultado esperado

```text
P43_EPHEMERAL_DB_READ_ONLY_PASS
P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY
P43_NO_REAL_KEY_NO_CHECKOUT_NO_PAYMENT
```

En fallas devuelve categorías como `BLOCKED`,
`CLI_REQUEST_FAILED`, `CREDENTIAL_FORMAT_BLOCKED` o
`PSQL_READONLY_FAILED` sin exponer secretos.
**Cualquier fallo consume el intento una vez reclamado el
marcador local.** No repetir ni cambiar flags automáticamente.

Codex deberá informar solamente **estado, commit, versión, y
marcadores sanitizados** a este chat; si ejecutó SQL,
confirmar la cuenta sin publicar password ni salida cruda.
Dejar reporte local de resultado sin credenciales y no
subirlo automáticamente.

## Lo que sigue expresamente bloqueado

- Generar/guardar `P42_V1` o tocar Edge Secrets/Postgres signing keys.
- Cambiar `p42_activation_writer_gate`, P21, P40, ledger,
  PayPal Sandbox/Live, checkout público o beneficios.
- Cambiar password principal, grants/RLS, habilitar JIT,
  migraciones u operaciones SQL distintas a la prueba exacta.
- Elegir `not_before` o `not_after` sin decisión específica;
  los 120 segundos documentados son vigencia de firma HMAC,
  no de la clave.

**F16 NO-GO; PR #44 DRAFT; P28 diferido.** Incluso con PASS
esta prueba no autoriza ningún cobro.
