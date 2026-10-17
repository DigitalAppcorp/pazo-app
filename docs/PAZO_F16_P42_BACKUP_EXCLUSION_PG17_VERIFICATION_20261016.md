# PAZO F16-P42 — Evidencia del ensayo PG17 de respaldo que excluye bytes de clave

**Fecha:** 2026-10-16. **Estatus:** LAB PG17 PASS / RESPALDO REAL SIN CAMBIOS / P42 PROVISIÓN NO-GO.
**Rama:** `f13/section-titles-20261012`; PR #44 DRAFT.
**Commit ejecutado por CI:** `2fa8d74d354bf993b57421502935954fea6fd99e`.

## Alcance preciso

- Nuevo script de ensayo: `scripts/f16-p42-backup-exclusion-pg17-lab.sh`.
- Job existente: `.github/workflows/f16-postgres-inbox-lab.yml`, paso `P42 backup data-exclusion and restore - disposable PG17 ONLY`.
- CI `F16 Disposable PostgreSQL Lab`: **SUCCESS**, run `38925576845`, paso 22 SUCCESS, URL: https://github.com/DigitalAppcorp/pazo-app/actions/runs/38925576845 .
- CI general: **SUCCESS**, run `38925576708`, URL: https://github.com/DigitalAppcorp/pazo-app/actions/runs/38925576708 .
- Se reutilizó el runner PG17 anterior; clientes `pg_dump`/`pg_restore` se ejecutan dentro de `postgres:17.11`, conectando exclusivamente al servicio de PostgreSQL descartable (`127.0.0.1:55441`, base `f14_synthetic`, usuario `f14_admin` y contraseña fija sintética de CI). Guardas rechazan credenciales/URLs de proyecto remoto; dos nuevas bases descartables se crean en el mismo servicio de CI, nunca Supabase alojado.
- Fila `P42_V1` de laboratorio contiene únicamente bytes deterministas de prueba, **no es clave de firma ni secreto real**; esquema `supporter_private.p42_activation_signing_keys` sintetizado de forma mínima más tabla benigna para regresión.

## Checks concretos

1. **Control negativo:** un `pg_dump --format=custom --create` sin exclusiones tiene la entrada `TABLE DATA supporter_private p42_activation_signing_keys` en el TOC. Esto reproduce el riesgo del script real, pero solamente con datos ficticios.
2. **Control de exclusión:** `pg_dump --format=custom --create --exclude-table-data=supporter_private.p42_activation_signing_keys` omite `TABLE DATA` para P42, conserva su `TABLE` de esquema y conserva `TABLE DATA` de `supporter_private.p42_backup_benign_control`.
3. **Restauración aislada:** `pg_restore --exit-on-error --no-owner --no-acl` a una segunda DB descartable, después de `CREATE DATABASE` en el mismo servicio. Comprobación SQL muestra **0 filas de claves, 1 fila benigna con valor exacto**, columna `key_bytes` y `RLS`+`FORCE RLS` intactos.
4. **Aislamiento:** sin lectura/conexión al proyecto Supabase `mrybvqdebbgcayuvgkkr`, sin Edge Secrets, sin creds PayPal, sin secretos creados, ni escritura financiera. Los archivos temporales se borran al salir del contenedor/laboratorio.
5. **CI:** el paso nuevo y las suites preexistentes declararon SUCCESS para el SHA ensayado.

**Marcador del ensayo:** `P42_BACKUP_EXCLUSION_PG17_LAB_PASS_ONLY`.

## Límites obligatorios

**No equivale a una restauración completa de PAZO**, ni demuestra por sí solo que el script Windows `scripts/backup-database.ps1` incorpore la exclusión. El ensayo usa un esquema mínimo compatible con el caso P42 y no ejecuta una copia de producción.

El script real sigue ejecutando `pg_dump` completo **sin** `--exclude-table-data`, lo que podría exportar `key_bytes` de cualquier futura fila provisionada. Mientras no se aplique una mitigación aprobada, el bloqueo `BLOCKED_BACKUP_EXPORT_COULD_COPY_P42_KEY` permanece abierto. El inventario de backups manuales, las copias off-site y backups físicos de terceros no están comprobados.

## Próximo gate sin provisionar

1. Aprobar **una modificación separada y limitada** del script Windows `scripts/backup-database.ps1` para añadir `--exclude-table-data=supporter_private.p42_activation_signing_keys` únicamente al comando `pg_dump`, garantizando que la tabla y su esquema sigan presentes. Esta aprobación aún NO existe y es independiente de provisión P42 y de cambios SQL.
2. Probar PowerShell sin credenciales y restauración **completa de catálogo** en un entorno descartable; comprobar todas las demás tablas/ACL/owners/restauración, no solo el fixture P42. No tocar datos hospedados para esta prueba.
3. Reconciliar runbooks y residuos de backups (incluida exposición por `pg_dumpall` roles y ficheros auxiliares); documentar protección real de exports futuros antes de crear secretos.
4. Mantener modelo de **custodio único PO** y revocación manual supervisada 24 horas con riesgo de indisponibilidad explícitamente pendiente de aceptar; DB WRITE/Edge unset no demostrados, sin T0 ni Texp.
5. Solicitar GO nuevo y separado para una futura provisión P42 solo después de cerrar todos los gates técnicos; writer P42, worker P21, checkout, ledger, pagos, beneficios, LIVE y grants permanecen fuera de alcance.

**Estado final:** `P42_PG17_BACKUP_EXCLUSION_LAB_PASS_HOSTED_BACKUP_UNCHANGED_NO_PROVISIONING`.


## 2026-10-16 — actualización aprobada del exportador Windows y prueba ampliada

**Autorización PO:** «ok go» frente a la petición específica de incorporar la exclusión `P42` a `scripts/backup-database.ps1` y realizar una restauración más amplia en PostgreSQL desechable. Sin autorización para volver a ejecutar backups de Supabase alojado, usar CLI administrativo P43, generar/provisionar secretos, modificar SQL/Edge ni activar pagos.

- El comando de exportación del **script operativo versionado** `scripts/backup-database.ps1` incluye ahora `--exclude-table-data=supporter_private.p42_activation_signing_keys`. No se alteraron los demás parámetros de `pg_dump`, el manejo de credenciales, el comando `pg_dumpall --roles-only --no-role-passwords`, exportación de inventario Storage, manifest, política local de cifrado/off-site ni los archivos de backup preexistentes.
- El workflow CI general añadió una verificación **PowerShell estática sin ejecutar respaldos** que encuentra exactamente la llamada `pg_dump` y exige la exclusión de datos P42; prohíbe los flags `--exclude-table` completo y `--schema-only`/`--data-only`, preservando esquema y restantes datos. Sintaxis PowerShell PASS en CI.
- El script `scripts/f16-p42-backup-exclusion-pg17-lab.sh` mantiene un control negativo de backup completo y un control positivo de tabla P42 excluida; la restauración se amplió para probar **filas relacionadas, foreign key, índice secundario, vista, función SQL, ACL PUBLIC, RLS y FORCE RLS, columna key_bytes, y cero filas de claves**. Todo usa bytes de prueba deterministas en dos bases PG17 descartables. No tiene conexión ni datos reales de PAZO.
- **Primer intento de ampliación:** fallo de una función SQL sintética mal delimitada; causa localizada en el script de test, corregida antes de la ejecución final. No se tocó el exportador Windows durante esa corrección.
- **Commit de aprobación de pruebas:** `5474577b428c548b0759861735a6d91eef75a52d`.
- [F16 Disposable PostgreSQL Lab #38926912820](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38926912820): **SUCCESS**, prueba P42 backup `success`.
- [CI general #38926912803](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38926912803): prueba PowerShell para exclusión `success` y parser PowerShell `success` (revisar conclusión del workflow general en la reconciliación final si queda otro paso ejecutándose).

**Límites persistentes:** no equivale a restauración completa del catálogo alojado de PAZO ni a prueba de cada ruta de exportación o backup físico. El script versionado protege sus **futuros dumps lógicos**; otros scripts/herramientas podrían omitir la exclusión, y archivos de backup **anteriores no son modificados o borrados**. El bloqueo sobre el *argumento omitido en backup-database.ps1* se considera corregido en código y probado en lab/CI; la verificación de inventario de backups/consumidores y una restauración completa real siguen fuera del alcance. P42 no tiene clave generada ni T0; ausencia de key en hosted no se re-verificó en este turno.

**Marcador:** `P42_BACKUP_SCRIPT_EXCLUSION_PATCHED_PG17_RESTORE_EXPANDED_PASS_HOSTED_UNTOUCHED`. F16 NO-GO, PR #44 DRAFT.
