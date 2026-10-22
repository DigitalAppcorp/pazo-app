# PAZO F16-P42 — GO de permisos administrativos alojados SIN claves (2026-10-17)

**Product Owner autorizó:** un gate de capacidad administrativa real y operación inocua delimitada, **sin** generación/provisión de secretos, cambios financieros, EDGE write, permisos nuevos, despliegues o costos. Rama `f13/section-titles-20261012`, PR #44 DRAFT, Brain OS 1.4.1.

## 1. Comprobaciones alojadas realizadas por ChatGPT (conector Supabase)

Proyecto `mrybvqdebbgcayuvgkkr` ACTIVO; PostgreSQL 17.11.

Consulta administrativa de solo lectura:
- `cli_login_postgres` existe; `pg_has_role('cli_login_postgres','postgres','SET')=true`.
- Rol `postgres` conectado por el **conector** puede INSERT sobre `supporter_private.p42_activation_signing_keys`.
- Rol `postgres` no puede hacer `SET ROLE cli_login_postgres`: `pg_has_role('postgres','cli_login_postgres','SET')=false`. **No permite simular localmente autenticación temporal** desde el conector.
- Antes: claves `0`, writer P42 `false`, worker P21 `false`, bindings `0`, ledger `0`, RPC P42 denegada a service_role; tabla propietaria `postgres` sin triggers de usuario.
- Se ejecutó **únicamente con el rol conectado `postgres`** este control SQL: `BEGIN`; timeout; guardas de cero filas/gates; `INSERT INTO ... SELECT NULL::text,NULL::bytea,false,NULL::timestamptz,NULL::timestamptz WHERE false RETURNING key_id`; resultado `P42_POSTGRES_ZERO_ROW_INSERT_PERMISSION_PASS_ROLLBACK_PENDING`; `ROLLBACK`.
- **Postflight INDEPENDIENTE** después del rollback: cero keys, writer OFF, P21 OFF, bindings/ledger vacíos, `service_role` sin EXECUTE. Resultado todo TRUE. **0 filas insertadas, ninguna clave creada**. Esto acredita permiso y sintaxis de un 0-row INSERT usando conector `postgres`, **no** TLS/CA/local login ni privilegios ejercidos mediante `cli_login_postgres`.
- El SQL de prueba jamás contuvo bytes secretos: `NULL::bytea` está protegido por `WHERE false`; no se seleccionaron ni registraron `key_bytes`.

Edge Functions: conector leyó ocho slugs activos; ninguna de las ocho fuentes alojadas referenció directamente `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` en el contenido revisado. **No prueba** ausencia de acceso indirecto ni confirma existencia de secretos, permisos Edge Secret read/write o que otras funciones futuras no lean el nombre. `list_edge_functions` y `get_edge_function` son read-only, **no** son Management Secrets API. No se creó/retiró ningún secreto.

## 2. Prueba privada de login temporal: código preparado, no ejecutado

Nuevos artefactos:
- `supabase/queries/f16_p42_ephemeral_zero_row_write_probe_ONCE.sql` contiene transacción acotada con `session_user` exacto cli-login, `current_user=postgres`, `INSERT ... WHERE false`, ROLLBACK y postflight READ ONLY. No crea claves y aborta ante drift de gates/ledger/bindings/privilegios.
- `scripts/f16-p42-ephemeral-zero-row-write-once.mjs`: Windows solamente, versiones fijadas Supabase CLI `2.121.0` y `psql 17.11`, SQL blob inmovilizado `cdd7bc9033671fea01263d55e05510d7e82a6cdc`, CA X509 local válida, TLS `verify-full`, host/rol/PGDB filtrados por parser P43B reutilizado; `PGGSSENCMODE=disable`, única solicitud CLI `db dump --dry-run` sin dump ni SQL expuesto, un único `psql` y outputs estáticos sanitizados. Credential request puede **crear o refrescar** rol efímero `cli_login_postgres` en Supabase; no es cero efectos administrativos.
- Lock distinto `%LOCALAPPDATA%/PAZO/CodexOps/p42-write-ephemeral-20261017-01.lock` creado con `wx` **antes** de la petición CLI, sin borrarlo para reintentar; no reutilizar locks/autoridad P43/P43B. Captura CLI/psql en memoria del proceso privado y solo devuelve marcadores fijos; no afirmar borrado criptográfico total de RAM.
- Test `src/features/supporter/testing/f16P42EphemeralZeroRowWriteOnce.test.mjs` integrado al glob `npm run test:f16:synthetic`. CI del commit final debe confirmarse; código no probado todavía en el ordenador del PO.
- **Sin cliente HTTPS Edge real** y sin token de Management API. No se solicita al PO pegar token ni contraseña en chat.

### Ejecución única autorizada, solo en equipo privado Windows

Precondiciones operacionales: checkout limpio de la rama y CI del HEAD PASS; CA oficial ya descargada y validada previamente; Supabase CLI/psql compatibles y Supabase CLI autenticada en la estación; sesión sin transcript/debug/video ni grabación de procesos. Si falta algo, detenerse antes de reclamar el lock. **No ejecutar ni reiniciar P43/P43B.**

Comando, desde la raíz del repositorio, reemplazando solo la ruta local de CA (no contiene secretos):

```powershell
node .\scripts\f16-p42-ephemeral-zero-row-write-once.mjs --execute-approved-write-check --attempt-id P42-WRITE-EPHEMERAL-20261017-01 --ca "C:\RUTA_PRIVADA\certificado-ca.crt"
```

**No ejecutar desde chat, CI ni agente remoto.** Un fallo después de crear lock consume el intento; **no repetir**, no borrar lock, no probar contraseñas alternativas. La entrada de acceso CLI se administra privadamente en la estación. Nunca copiar stdout/stderr de proveedor, JWT, password, host completo ni URI en chat. Compartir solo los tres marcadores sintéticos finales:
- `P42_EPHEMERAL_ZERO_ROW_WRITE_PASS`
- `P42_EPHEMERAL_ZERO_KEYS_GATES_OFF_POSTFLIGHT_PASS`
- `P42_EDGE_SECRET_WRITE_UNVERIFIED_NO_PROVISIONING_NO_PAYMENT`

Las fallas tienen categoría `P42_WRITE_EPHEMERAL_BLOCKED_*`, sin reintento. Este PASS solo demostraría rol efímero + TLS/CA cliente y posibilidad del **INSERT cero filas**; no capacidad de inserción real de bytes ni operación Edge Secret.

## 3. Gate Edge Secrets sigue pendiente

El conector Supabase de esta sesión **no ofrece** `GET /v1/projects/{ref}/secrets` autenticado ni lectura de scopes, `POST`, `DELETE`. Una comprobación de inventario `GET` vía canal privado solo puede acreditar **read**; la capacidad efectiva de **write** no puede acreditarse sin una operación de escritura o garantía oficial verificable de permisos. No intentar crear un secreto sintético en el proyecto real con este GO, ni borrar el nombre P42 u otro existente para probar permisos. No usar API token en chat, logs, argv o `.env`.

## 4. Resultado y siguiente condición

**Resultado alojado real:** `P42_HOSTED_POSTGRES_ZERO_ROW_INSERT_ROLLBACK_PASS` y postflight CLEAN.
**Resultado remoto privado cli:** `P42_EPHEMERAL_SESSION_EXECUTION_PENDING_LOCAL`.
**Edge Secrets CRUD:** `P42_EDGE_MANAGEMENT_PERMISSION_UNVERIFIED`.

F16 **NO-GO**. `P42_V1` no creada, `T0` no elegido. El PO permanece custodio único, vigencia futura 24 horas exactas, revocación manual supervisada, writer/worker OFF, checkout, contabilidad, beneficios y PayPal Live desactivados.

El siguiente paso real mínimo es que el operador local ejecute **una sola vez** el script tras CI PASS y comunique exclusivamente sus marcadores. Después diseñar/verificar canal privado Edge GET sin imprimir cuerpo, permisos y trazas; cualquier POST/DELETE requiere GO específico de provisión o retiro. No confundir permiso de rol DB con disponibilidad de Edge.
