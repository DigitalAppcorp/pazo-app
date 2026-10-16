# PAZO F16–P42 — canal administrativo y revocación manual: verificación sin credenciales

**Fecha:** 2026-10-16. **Autorización PO:** «ok go» para continuar el gate de comprobación de canales P42, con revocación MANUAL supervisada y custodio único. **SOLO DISEÑO, INSPECCIÓN DE DOCUMENTACIÓN y LABORATORIO PG17**. No conexión PostgreSQL alojada, ni Edge `set/unset`, ni clave, ni checkout o pagos.

## 1. Estado de autoridad y destinos (NO-GO)

Proyecto Supabase PAZO `mrybvqdebbgcayuvgkkr`. Product Owner con rol Owner y dos TOTP visualmente registrados; decidió actuar **solo él** como custodio humano. No hay suplente y, por consiguiente, no se garantiza retirada física a las 24 horas si el PO pierde disponibilidad.

| Destino | Valor de identificación permitido | Estado comprobado |
| --- | --- | --- |
| Edge Functions Secrets **del proyecto** | `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` | Nombre reconciliado; permiso UI de Owner, **no `unset` ejecutado**; no se ha comprobado lectura del inventario vigente |
| PostgreSQL | `supporter_private.p42_activation_signing_keys`, `key_id='P42_V1'` | Esquema y vacío comprobados en P43 previo; **escritura administrativa REAL no verificada** |
| Control de pagos/beneficios | Writer P42 OFF, Worker P21 OFF, RPC sin EXECUTE app-roles | Inerte según evidencia previa; no se ha repetido auditoría alojada |
| Respaldo lógico mediante script PAZO | `scripts/backup-database.ps1` | `--exclude-table-data=...` incluido en rama, CI y PG17 sintético PASS; no ejecutar en hosted en este gate |

**NUNCA generar bytes, fijar T0/Texp, habilitar RPC/Writer/Worker, cambiar roles, alterar secretos Edge o ejecutar SQL hospedado en virtud de este documento.** PR #44 permanece Draft.

## 2. PostgreSQL — diseño de canal privado; NO EJECUTAR

Referencia oficial Supabase: https://supabase.com/docs/guides/database/psql y https://supabase.com/docs/guides/database/connecting-to-postgres .

1. El PO tendrá que obtener **directamente** del panel `Connect` el modo (Direct IPv6 o Session Pooler con host real y usuario `postgres.<project-ref>`), puerto y certificado CA del servidor. **No reutilizar el login efímero ni repetir P43**, ni resetear password; no inferir host del pooler.
2. El canal futuro tendrá que aplicar validación de nombre de host y CA `PGSSLMODE=verify-full`, `PGSSLROOTCERT` con el certificado confiable obtenido del panel; **no `require` ni `verify-ca` como sustitutos**. Nunca cambiar la configuración de SSL enforcement del servidor para facilitar una conexión: puede provocar reinicio.
3. Requerirá herramienta PostgreSQL 17 confiable y sesión privada, sin `-v password`, URL con password en argumentos, `.env` sincronizado, logs de consultas sensibles, trazas, CI/agent remotos o capturas de escritorio con datos. El titular autenticará fuera de chat; nunca pegar credenciales o bytes a GitHub/ChatGPT.
4. Antes de una futura operación real, verificar la **identidad del servidor**, que el usuario dispone de privilegio administrativo exacto para la tabla privada, que la conexión TLS está validada y que los comandos están revisados. La evidencia anterior de **P43 READ-ONLY PASS no prueba ninguno de esos permisos de escritura**. No probar `DELETE` ni `INSERT` contra hosted sin autorización específica futura.
5. La operación futura de eliminación **solo** puede dirigirse a `key_id='P42_V1'` con valor literal o bind paramétrico, transacción acotada, comprobación de una fila afectada y posterior consulta metadata-only de `count(*)=0` y gates/ACL OFF. No seleccionar `key_bytes`, `RETURNING key_bytes`, hashes, MACs o contraseñas. Si 0 filas se borran, NO declarar que `DELETE` acaba de retirar algo: comprobar ausencia por lectura posterior y registrar discrepancia si existió un evento anterior.
6. P42 se mantendrá `enabled=false` y sin `EXECUTE`, incluso después de provisión futura autorizada; no se podrá usar para registrar pagos ni beneficios.

### Laboratorio PG17 terminado

`supabase/tests/supporter/p42-manual-revocation-postgres-synthetic.sql` prepara dos versiones **de bytes sintéticos fijos** en transacción, niega supresión por versión inexistente, comprueba que eliminar `P42_V1` conserva `P42_V2`, exige `ROW_COUNT=1`, comprueba que un reintento afecta 0 filas y efectúa `ROLLBACK`. Inmediatamente después, el CI ejecuta el **preflight estructural de cero claves**. No usa credenciales ni conexiones a Supabase alojado.

**Evidencia:** commit `c70a0958fade1617a52c2e6db12ea2e4c55cba3c` — [CI #38927865532](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38927865532) SUCCESS y [PG17 #38927865578](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38927865578) SUCCESS. `P42_MANUAL_DB_REVOCATION_ROLLBACK_PG17_PASS_ONLY`. **No certifica el canal real de escritura**.

## 3. Edge Secrets — capacidad documentada, operación no verificada

Referencias oficiales: https://supabase.com/docs/reference/cli/supabase-secrets-unset y https://supabase.com/docs/reference/cli/supabase-secrets-list y https://supabase.com/docs/guides/functions/secrets .

- El Dashboard permite administrar secretos y Supabase documenta `secrets unset [NAME]`; `secrets list` lista el inventario de un proyecto vinculado. **Es documentación de capacidad, NO una comprobación de que el usuario pueda eliminar el secreto en este proyecto**, ni de su presencia/ausencia actual.
- El día que exista una clave real con GO posterior, el PO será quien retire exactamente el nombre Edge `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`, sin tocar los secretos PayPal u otros de la organización. Nunca ejecutar una eliminación de prueba de otro nombre para comprobar permisos.
- El resultado de la operación se verificará **por ausencia del nombre** mediante inventario actualizado del proyecto correcto, sin volcar valores, hashes, digests ni la lista completa de secretos en chat/logs.
- Edge Secrets son compartidos por proyecto; no se puede presumir aislamiento exclusivo de una función usando el prefijo del nombre. Auditar consumo y proyectos antes de cualquier futuro GO. El conector Supabase conectado no expone acciones de gestión de Secrets; no inventar evidencias de `set/unset`.

## 4. Secuencia futura de revocación supervisada: no ejecutar hoy

**Precondiciones independientes:** PO acepta expresamente riesgo sin suplente y acredita disponibilidad Texp, se valida canal PostgreSQL WRITE con TLS `verify-full` en estación privada mediante un GO posterior, se valida acceso Edge para retiro, se examinan copias manuales/externas y se autoriza generación/provisión con T0 UTC futuro. Sin cualquiera de estos hechos, **ABORTAR ANTES DE GENERAR**.

**A Texp=T0+24h o incidente anticipado:**
1. Revalidar proyecto, `P42_V1`, hora UTC, no beneficios/pagos, writer P42 y worker P21 OFF y ausencia de EXECUTE para roles API.
2. Retirar **solo el secret Edge P42** en el Dashboard o canal de gestión verificado; lectura de inventario por nombre confirma ausencia.
3. Retirar **solo la fila `P42_V1`** con sesión DB administrativa autorizada y validada; efectuar consulta separada metadata-only de ausencia de claves y verificar gate/ACL/ledger OFF. Un acuse de operación sin lectura independiente NO es PASS.
4. Reconciliar ambas lecturas recientes con el evaluador offline `f16P42RevocationEvidenceLab`. Su salida es solo candidato para revisión, no garantía de eliminación universal.
5. Registrar tiempo UTC del operador y estados sin datos secretos. Si falla cualquier destino, declarar `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED`; seguir sin EXECUTE, worker, checkout, pago o beneficio, y remover cuando el PO recupere acceso. Sin suplente, la limpieza física puntual **no puede garantizarse**.
6. Ninguna validación de borrado de un secreto activo implica destrucción de copias previas fuera del proyecto. Mantener inventario de backups/snapshots de terceros.

## 5. Dictamen del gate vigente

| Control | Resultado |
|---|---|
| Revocación exacta DB en PG17 descartable + ROLLBACK | **PASS laboratorio** |
| Preflight posterior de 0 claves, gates OFF y ACL sin EXECUTE | **PASS laboratorio** |
| Escritura PostgreSQL hospedada con TLS `verify-full` y CA del panel | **UNVERIFIED** |
| Edge Owner + MFA en Dashboard | **PASS visual previo** |
| `secrets unset` en PAZO y verificación independiente real | **UNVERIFIED** |
| Script de `pg_dump` con exclusión P42 | **PASS rama CI/PG17** |
| Copias de terceros y restauración integral de PAZO | **PENDIENTE** |
| PO custodio único disponible y riesgo aceptado para Texp | **PENDIENTE de gate futuro** |
| Clave P42 real / T0 / pagos / grants | **NO-GO** |

**Resultado global:** `P42_OPERATOR_CHANNEL_DESIGN_AND_PG17_REVOKE_PASS_HOSTED_CHANNEL_UNVERIFIED_NO_PROVISIONING`.

**Próxima intervención mínima del PO (sin claves):** cuando se decida verificar el canal real en otro gate, entrar solo en `Connect` de Supabase y confirmar si muestra modo Direct IPv6 o Session Pooler con certificado CA descargable. **No enviar host completo, contraseña, token ni enlace que contenga credenciales en chat.** No ejecutaremos P43 otra vez.


## 6. Certificado CA descargado — verificación local OFFLINE (2026-10-16)

- PO confirmó explícitamente **«certificado descargado»** después de navegar a Supabase `Database → Settings → SSL Configuration → Download certificate`. `PASS` como **afirmación del titular de descarga local**, no inspección criptográfica ni comprobación de archivo por parte del agente. Ningún certificado, ruta local, contraseña, token o URI se compartió con ChatGPT/GitHub.
- Se preparó `scripts/f16-p42-verify-local-ca-offline.ps1`: valida **solo propiedades estructurales locales** de un X.509 descargado, entre ellas CA (`BasicConstraints`), período de validez, ausencia de clave privada, tamaño y formato razonable. **No abre red**, no invoca `psql`, no accede al proveedor, no modifica almacén de certificados del SO, no registra rutas/subject/serial, no compara con la CA Supabase oficial y no demuestra `verify-full` ni privilegios de escritura DB.
- El script debe ejecutarse **únicamente** en la estación privada del PO que posee el archivo, después de sincronizar el repo, usando PowerShell 7 y ruta local completa al archivo, sin aportar el certificado al chat:
  ```powershell
  pwsh -NoProfile -File .\scripts\f16-p42-verify-local-ca-offline.ps1 -CaCertificatePath 'C:\RUTA_PRIVADA\certificado-ca.crt'
  ```
  La ruta es ilustrativa, no una ruta inventada a un archivo existente. El PO informará **solo** la categoría `P42_LOCAL_CA_FILE_STRUCTURAL_PASS_OFFLINE` o `P42_LOCAL_CA_FILE_CHECK_BLOCKED`. No pegar texto de certificados.
- Tras `PASS` local habrá que corroborar el **origen del CA** y comprobar `Session pooler` en Connect, hostname/usuario exactos **solo localmente**. La conexión real TLS con `sslmode=verify-full` y permisos DBA exige otra autorización expresa; **NO reutilizar ni repetir P43**.
- El `SSL enforcement` del servidor aparecía desactivado en captura previa; **no modificar ese switch**. El cliente podrá exigir TLS validado independientemente de ese estado.
- **Resultado de este checkpoint:** `P42_CA_DOWNLOADED_PO_ATTESTED_LOCAL_CA_FILE_TEST_PENDING_HOSTED_WRITE_UNVERIFIED`. F16 NO-GO, PR #44 Draft; no provisión P42, T0, Edge, grants, worker, checkout, cobros ni PayPal.
