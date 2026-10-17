# PAZO F16-P43B — Nuevo acceso administrativo efímero: preparación READ ONLY, NO-GO

**Fecha:** 2026-10-17. **Proyecto:** PAZO / Supabase `mrybvqdebbgcayuvgkkr`. **Rama:** `f13/section-titles-20261012`, PR #44 DRAFT. **Estado:** DOCUMENTACIÓN Y CÓDIGO DE PREPARACIÓN; NO APROBADO NI EJECUTADO contra PostgreSQL alojado.

## 1. Decisión de arquitectura y límites

El Product Owner indicó «ok go» para **preparar y auditar**, SIN abrir nuevas conexiones, una alternativa al intento consumido `P42-NEW-PASSWORD-20261017-01`, que devolvió `P42_TLS_READ_ONLY_ONCE_BLOCKED_AFTER_CONNECTION_ATTEMPT_PSQL_EXIT_NONZERO` sin causa determinada. Ya se restableció la contraseña PostgreSQL del rol `postgres`; NO cambiarla nuevamente.

**Preferir por ahora el flujo oficial de Supabase CLI sin contraseña DB**, que en P43 anteriormente produjo `P43_EPHEMERAL_DB_READ_ONLY_PASS`. Esto NO equivale a la función de Dashboard **Temporary Access / JIT**. El CLI puede crear/refrescar un rol `cli_login_postgres` temporal administrado por Supabase, cuya contraseña tiene vigencia limitada; la duración concreta debe verificarse en la operación, NO inventarse. Por lo tanto, solicitar credenciales temporales **no es de cero efectos en Supabase**, aunque la consulta SQL posterior sí sea exclusivamente de lectura.

Fuentes oficiales:
- https://supabase.com/docs/guides/troubleshooting/permission-denied-when-deleting-the-cli_login_postgres-role-808bae
- https://supabase.com/docs/guides/platform/temporary-access
- https://supabase.com/docs/guides/troubleshooting/supabase-cli-failed-sasl-auth-or-invalid-scram-server-final-message
- https://supabase.com/docs/guides/database/psql

JIT es otra función, desactivada por defecto, que requiere habilitación, SSL enforcement y mapeo de roles del operador. **NO activar JIT ni SSL enforcement** para P43B: habilitar SSL enforcement puede reiniciar temporalmente la base. El CLI efímero ya fue funcional sin esta preparación en el gate histórico.

## 2. Código preparado, sin efecto remoto

Nuevo archivo `scripts/f16-p43b-ephemeral-readonly-preflight.mjs`; prueba `src/features/supporter/testing/f16P43BEphemeralReadOnlyPreflight.test.mjs`; CI incorpora `node --check` y usa `npm run test:f16:synthetic` para incluir automáticamente los tests `*.test.mjs`.

El script P43B copia **el flujo exitoso histórico P43**, no reusa su lock ni su autorización. Endurecimientos:
- Requiere bandera explícita `--execute-approved-readonly` **y** `--attempt-id P43B-EPHEMERAL-20261017-01`. Los flags **no sustituyen** el GO humano registrado en handoff.
- Falla cerrado si varía el blob exacto del SQL versionado (Git blob `ac9246a0106ebefd6d425a549d9f207242760eec`), `Supabase CLI 2.121.0`, `psql 17.11` o archivos/CA.
- Reclama `%LOCALAPPDATA%/PAZO/CodexOps/p43b-ephemeral-readonly-one-attempt-20261017-01.lock` con `wx`, antes de emitir una credencial. No borrar locks de P43 ni P42; **cada gate one-shot es consumido si se crea su lock**. No repetir con otra ID por iniciativa del ejecutor.
- Invoca exactamente una solicitud `supabase db dump --linked --project-ref mrybvqdebbgcayuvgkkr --dry-run --agent no`, captura stdout/stderr SOLO EN MEMORIA privada, jamás imprime ni evalúa script devuelto. **`--dry-run` no garantiza que no cree o renueve el rol temporal de autenticación**; no hace un dump real.
- El entorno hijo CLI omite `SUPABASE_DB_PASSWORD` y variables heredadas libpq, para exigir vía efímera en vez de autenticar por contraseña larga. **NO** eliminar `SUPABASE_ACCESS_TOKEN` del hijo CLI: se necesita su sesión oficial y permanece confidencial.
- Rechaza salida CLI si host/usuario/puerto/base no coinciden con el proyecto, si faltan exportaciones únicas de PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD, si el formato contiene escapes inesperados o si no se acredita `--role=postgres`. Nunca acepta SQL ni shell remoto.
- Tras obtener la credencial efímera, lanza **UN** `psql` (sin shell) con `PGSSLMODE=verify-full`, CA validada, `PGGSSENCMODE=disable`, TLSv1.2–1.3, `PGSSLNEGOTIATION=postgres`, timeout y `default_transaction_read_only=on`. Solo ejecuta `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`, que contiene transacción `BEGIN TRANSACTION READ ONLY`; la opción de `role=postgres` imita el `--role=postgres` autorizado del CLI, NO otorga permiso para escribir en este paso. Captura crudo privado en memoria y compara marcador exacto, sin imprimir contenido.
- **No** escribir Edge Secrets, tabla de signing keys, migraciones, `GRANT`, activar gates, PayPal/checkout/ledger ni contraseñas.
- **No** emitir por chat/log GitHub/token, salida CLI ni error sin sanitizar, `PGPASSWORD`, ruta de conexión con contraseña, certificado, contenido de lock, ni stdout/stderr crudo. La credencial efímera vive transitoriamente en memoria durante los subprocesos: no afirmar borrado criptográfico total.
- Incluso con PASS solo queda validado acceso READ ONLY estructural; NO es prueba de escritura ni autorización para provisionar clave P42.

**Limitación conocida:** las pruebas estáticas y sintéticas no verifican que la CLI instalada hoy siga devolviendo el formato exacto de `2.121.0`, que la red/CA autentique la sesión o que el pooler no conserve credenciales en caché. Supabase documenta fallos SASL/pooler incluso con `cli_login_postgres`. En caso de error o respuesta ambigua, el intento queda consumido, sin retries ni fallback a contraseña nueva/JIT/SQL Editor.

## 3. Preflight futuro del ejecutor local — solo TRAS NUEVO GO

1. Codex lee `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, este plan y el script exacto; asegura rama y commit aprobados, checkout sin sobrescritura, y que **ningún otro proceso** usa credenciales DB antiguas. No `git reset --hard`.
2. Verifica offline la instalación local de `node`, `supabase --version` (2.121.0), `psql --version` (17.11), git y el certificado CA oficial; si hay drift, detenerse **antes de emitir** credencial. Si actualización exige instalar o modificar configuración, nuevo análisis.
3. Verifica que `p43b-ephemeral-readonly-one-attempt-20261017-01.lock` NO exista; jamás lo borra. Verifica que el ejecutor tenga acceso privado a la sesión Supabase CLI previamente autorizada. No leer credenciales del gestor ni pedir contraseña PostgreSQL.
4. Asegura proceso local privado SIN `--debug`, transcripts, grabación de pantalla, session replay ni captura cruda de stdout/stderr; el wrapper solo emite marcadores sanitizados. Si no puede garantizarse privacidad, NO ejecutar.
5. Después del **GO nuevo separado e inequívoco del PO**, una sola vez:

```powershell
# SÓLO DESPUÉS DE UN NUEVO GO. Ruta CA privada la sustituye Codex localmente.
node .\scripts\f16-p43b-ephemeral-readonly-preflight.mjs --execute-approved-readonly --attempt-id P43B-EPHEMERAL-20261017-01 --ca "RUTA_PRIVADA_AL_CERTIFICADO_CA"
```

6. Codex retorna SOLO marcadores `P43B_EPHEMERAL_DB_READ_ONLY_PASS`, `P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY`, `P43B_NO_REAL_KEY_NO_CHECKOUT_NO_PAYMENT` o estado `BLOCKED` sanitizado. No repetir o mutar si falla. El anterior intento P43 y los de password permanente quedan consumidos.

## 4. Siguiente gate después de PASS (NO APROBADO)

Para P42 se necesitan **dos canales compatibles**, no solo autenticar: (a) gestor de secretos Edge privado y (b) cliente PostgreSQL con escritura administrativa **parametrizada**, TLS completo y controles de logging para secreto HMAC, sin introducir `key_bytes` en SQL Editor/CLI history. Acreditar que el CLI efímero permite realmente `SET ROLE postgres` con una operación de escritura controlada *solo después* de GO de prueba específico y revisión de SQL/backup/rollback. No utilizar el script P43B para insertar secretos: solo lee.

P42 sigue sin claves, writer P42 OFF, worker P21 OFF, P40 sin binding, ledger/pagos/beneficios NO-GO según último postflight. Revocación futura de secreto **manual**, ventanas de 24h ya elegidas por PO, custodia de duplicado/backup pendiente. Ningún PASS de esta preparación habilita suscripciones ni cobros.

## 5. Estado de esta entrega

- Diseño P43B: preparado; fuente de P43 histórico previamente PASS.
- Código P43B y test sintético: añadidos a rama, CI debe confirmarse antes de pedir GO.
- Autorización de **ejecución remota**: NO OTORGADA.
- Supabase: SIN nuevas conexiones, escrituras ni secretos por este trabajo.
- PR #44 permanece DRAFT; F16 financiero NO-GO.
