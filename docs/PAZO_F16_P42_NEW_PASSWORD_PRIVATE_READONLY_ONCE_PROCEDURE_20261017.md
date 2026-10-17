# PAZO F16-P42 — procedimiento privado de una conexión con contraseña nueva

Fecha: 2026-10-17. PR #44 DRAFT. **PREPARADO, NO AUTORIZADO NI EJECUTADO.**

## Alcance del próximo GO

El Product Owner informó que ya cambió la contraseña PostgreSQL por Dashboard. Esta orden de integración no autoriza probarla todavía. Un GO posterior debe aprobar el commit revisado y un único intento **P42-NEW-PASSWORD-20261017-01**. No crear otro ID ni repetir un intento fallido por iniciativa propia.

La prueba futura solo podrá autenticar al usuario fijo del proyecto PAZO contra el Session Pooler confirmado, puerto 5432, base postgres. No probar contraseña antigua, variantes, otros hosts ni credenciales temporales. No usar P43, reset, SQL Editor, provisión P42, DDL/DML, permisos financieros, compras, workers, ledger, beneficios ni despliegues.

## Contrato TLS y SQL

El cliente psql/libpq exige PGSSLMODE=verify-full y CA oficial: no acepta plaintext ni certificado/hostname no válidos. PGGSSENCMODE=disable impide sustituir TLS por GSS; mínimo TLSv1.2, máximo TLSv1.3 y negociación PostgreSQL. No usar pg_stat_ssl del backend como prueba de computadora→pooler: Supavisor termina ese enlace y establece otro hacia PostgreSQL. Esta prueba no acredita el TLS interno del pooler ni permisos de escritura.

El único proceso psql usa -X -qAt -w -v ON_ERROR_STOP=1 -c con el bloque SQL fijo del script: BEGIN TRANSACTION READ ONLY, timeout local, SELECT de current_database/transaction_read_only y ROLLBACK. No consulta tablas PAZO ni material P42. Se preservan read-only por PGOPTIONS y transacción explícita, y límite total de 25 segundos. No se ejecuta ninguna migración.

Referencias: [libpq TLS](https://www.postgresql.org/docs/17/libpq-ssl.html), [GSS y sslmode](https://www.postgresql.org/docs/17/libpq-connect.html#LIBPQ-CONNECT-GSSENCMODE), [dos enlaces en Supavisor](https://supabase.github.io/supavisor/configuration/tenants/).

## Preflight que Codex completará solo después del GO nuevo

1. Leer AGENTS.md y el handoff vigente. Verificar commit aprobado, rama y ausencia de cambios ajenos; preservar cualquier trabajo local. Confirmar que el GO permite UNA conexión con contraseña nueva, no interpretar esta preparación como aprobación.
2. Verificar PowerShell 7 y el cliente oficial psql 17.11 ya instalados. Fijar sus rutas y hashes cotejados; no instalar servidor ni cambiar PATH global. No leer credenciales guardadas ni variables con contraseñas.
3. Resolver localmente la CA oficial descargada y contrastarla con el origen HTTPS público; verificar estructura/vigencia offline. Las dos copias actuales son idénticas, hash 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7. No subir CA ni imprimir contenido o ruta completa.
4. Recuperar únicamente el hostname Session Pooler ya confirmado por el PO, sin Connection URI. Si ese dato cambió, detenerse antes del prompt. No hacer ping/TCP/TLS de prueba ni conexión previa: el intento autorizado es el del script.
5. Comprobar por existencia que no estén los archivos p42-tls-P42-NEW-PASSWORD-20261017-01.lock ni .result.txt en %LOCALAPPDATA%/PAZO/CodexOps/. No crearlos ahora ni borrar los locks históricos P42/P43. El script reclamará exclusivamente ese intento antes del prompt; cancelar o fallar consume el intento cuando ya se creó el lock.
6. Confirmar consola privada sin grabación/transcripción. Ejecutar solo las pruebas offline si el código cambió; no repetir la suite completa. Revisar el bloque de conexión y garantizar que stdout/stderr privados nunca saldrán del proceso controlador a logs del agente.
7. Registrar lanzamiento en curso antes de abrir la ventana. Si la respuesta al lanzamiento fuese ambigua, comprobar solo el marcador conocido y metadatos de lanzamiento; no relanzar.

## Invocación exacta futura, en ventana privada

Codex preparará estas variables **no secretas** desde el equipo y las instrucciones aprobadas: $pazoPwsh (PowerShell 7 verificado), $pazoProbe (ruta absoluta al script del commit aprobado), $pazoCa (CA validada), $pazoSessionHost (hostname confirmado) y $pazoPsqlBin (directorio del cliente verificado). El PO no tendrá que introducir comandos ni rutas.

El lanzamiento será una sola vez, exclusivamente después del GO:

```powershell
$pazoPreviousPath = $env:PATH
try {
  $env:PATH = $pazoPsqlBin + ';' + $env:PATH
  Start-Process -FilePath $pazoPwsh -WindowStyle Normal -ArgumentList @(
    '-NoLogo', '-NoProfile', '-File', ('"' + $pazoProbe + '"'),
    '-DbHost', $pazoSessionHost,
    '-CaCertificatePath', ('"' + $pazoCa + '"'),
    '-ExecuteApprovedReadOnly',
    '-AttemptId', 'P42-NEW-PASSWORD-20261017-01'
  )
} finally {
  $env:PATH = $pazoPreviousPath
}
```

El script requiere el switch y un ID válido, además de una estación privada fuera de CI. Sin ellos se detiene antes del prompt. El switch no sustituye la autorización humana: Codex debe verificar el GO explícito previamente.

Antes de que el PO escriba, Codex dejará de capturar o controlar la ventana. El PO introducirá personalmente la contraseña NUEVA de PostgreSQL en Read-Host -AsSecureString. Si no está disponible o decide cancelar, dejará la entrada vacía y pulsará Enter. No pedir que la pegue en chat ni leer teclas, pantalla, memoria, entorno o archivos con esa contraseña.

El script local confiable la maneja temporalmente en memoria y en el entorno del hijo psql; nunca argv, SQL, archivos o logs. No afirmar borrado criptográfico de toda la RAM. No usar transcript, debug, tee ni redirección de errores privados. Codex no inspeccionará ese estado interno.

## Único resultado permitido

Codex leerá **solo** %LOCALAPPDATA%/PAZO/CodexOps/p42-tls-P42-NEW-PASSWORD-20261017-01.result.txt, producido por el script con CreateNew y un marcador estático. Nunca stdout/stderr privados, capturas ni procesos internos. Se admiten:

- P42_SESSION_POOLER_TLS_VERIFY_FULL_READ_ONLY_PASS.
- P42_TLS_READ_ONLY_ONCE_BLOCKED_PRECHECK_<etapa>.
- P42_TLS_READ_ONLY_ONCE_BLOCKED_AFTER_CONNECTION_ATTEMPT_<etapa>.

Las etapas distinguen timeout, salida psql no cero, contrato read-only o salida inesperada; no imprimen el texto del error. PSQL_EXIT_NONZERO no permite atribuir por sí solo el fallo a una contraseña incorrecta. Si falta el resultado, hay un formato inesperado o falla su grabación, clasificar BLOCKED/resultado incierto y detenerse, sin repetir ni sobrescribir un resultado anterior.

Un PASS solo demuestra autenticación de esa sesión, TLS cliente→pooler verify-full y el contrato READ ONLY en la base esperada. No valida write permission, una sesión futura permanente, custodias ni provisión P42. No reactiva ninguna autorización histórica de P43/P44.

## Validación de preparación

Pruebas offline: src/features/supporter/testing/f16P42SessionPoolerTlsReadOnly.offline.ps1, 27 comprobaciones aisladas sobre guardas, configuración TLS adversa, clasificación de salidas, locks y persistencia. No se ejecuta el conector completo ni psql, ni se usa una contraseña real. CI ejecuta estas pruebas y verifica el nuevo contrato de transporte; no autoriza una prueba alojada.

## Texto de autorización futura para el PO

> Autorizo UNA conexión privada PostgreSQL READ ONLY del commit que acabo de revisar, usando el intento P42-NEW-PASSWORD-20261017-01 y la contraseña nueva que introduciré personalmente. Sigue este procedimiento, sin capturar la ventana ni registrar credenciales. No repitas si falla y no ejecutes P43, escrituras, cambios Supabase, provisión P42, pagos ni despliegues.

**Todavía no se ha otorgado ese GO.** La integración y sus tests offline no permiten lanzar la conexión.
