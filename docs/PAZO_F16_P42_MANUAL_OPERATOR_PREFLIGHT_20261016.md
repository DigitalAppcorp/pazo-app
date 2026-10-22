# PAZO F16-P42 — Gate de operador y canal administrativo para revocación MANUAL (NO-GO)

**Fecha:** 2026-10-16. **Alcance autorizado por PO:** preparación y auditoría documental, sin aprovisionamiento, credenciales nuevas, SQL alojado ni cambios de infraestructura. **PR #44 DRAFT / F16 NO-GO.**
**Enlace vigente:** [Contrato de vigencia 24h y revocación manual](PAZO_F16_P42_24H_CUSTODY_EXPIRY_REVOCATION_GATE_20261016.md).

## 1. Identidades de destino fijas

- Supabase proyecto PAZO: `mrybvqdebbgcayuvgkkr`.
- Edge Secret único: `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. Edge Secrets son del **proyecto**, no de una sola función; ninguna clave se ha provisionado.
- PostgreSQL: `supporter_private.p42_activation_signing_keys` con `key_id='P42_V1'`, `key_bytes` de 32 bytes, `enabled=false`, `not_before=T0`, `not_after=T0+24h` UTC. `T0` no elegido y jamás debe fijarse como fecha actual durante esta preparación.
- Acceso de `public.f16_p42_register_authenticated_activation` a roles API = denegado, writer P42 OFF, worker P21 OFF; no checkout/pagos/beneficios/PayPal Live. El `service_role` no puede inspeccionar `key_bytes`.

## 2. Operador humano (principal CONFIRMADO, suplente PENDIENTE)

**Custodio principal DESIGNADO por decisión expresa del Product Owner (2026-10-16):** el propio Product Owner asumirá la eliminación manual supervisada de `P42_V1` en Edge Secrets y PostgreSQL al futuro vencimiento `Texp=T0+24h`, o antes ante incidente. Su cuenta Supabase Owner y sus dos TOTP constan por evidencia visual previa; **esta designación NO verifica la capacidad de escritura PostgreSQL, el acceso de retirada Edge ni la disponibilidad real a una hora todavía sin fijar**. No publicar nombre, email ni credenciales.

**Decisión PO posterior — sin suplente administrativo:** el PO eligió preparar una alternativa en la que únicamente él conserva acceso a Edge/PostgreSQL. **No se incorporará otro administrador** bajo el alcance actual. Una cuenta/dispositivo de recuperación controlado por la misma persona puede reducir el riesgo de pérdida de credenciales, pero **no puede suplir su indisponibilidad física** y NO garantiza eliminación manual puntual. Diseño íntegro: `docs/PAZO_F16_P42_SINGLE_CUSTODIAN_SAFE_ALTERNATIVE_20261016.md`.

**Antes de pedir un GO de provisión**, con el diseño de custodio único, confirmar que el PO conserva la capacidad de recuperarse de una pérdida de sesión/dispositivo, y que estará personalmente disponible con ambos canales probados en `Texp=T0+24h`. El riesgo de indisponibilidad humana persiste sin suplente: mantener **NO-GO** hasta documentar y aceptar expresamente ese riesgo y cerrar los gates técnicos. No invitar un segundo administrador ni crear costos. La selección del diseño NO es autorización para generar ni guardar material.

## 3. Canal administrativo PostgreSQL: diseño de aceptación, NO acceso verificado

El cierre de P43 (`P43_EPHEMERAL_DB_READ_ONLY_PASS`) demostró un **único** acceso temporal de lectura; **no** concede escritura, no prueba permisos administrativos persistentes y **no debe repetirse** ni usarse para provisionar.

**Requisitos para validar un canal nuevo en un futuro gate autorizado:**

1. Estación privada confiable, sin grabaciones de terminal, `--debug`, transcript, agent stdout/stderr bruto, volcado de credenciales ni software de soporte capturando procesos.
2. Host/rol exacto procedente del panel **Connect** del proyecto; puerto/bd identificados; preferir conexión directa o session pooler adecuado para cliente Postgres, no inferir host de los resultados previos.
3. TLS con `PGSSLMODE=verify-full`, CA validada externamente y control de nombre de host. NO desactivar SSL ni cambiar SSL enforcement (cambiarlo reinicia la base).
4. No copiar password, URI completo con password, contraseña maestra o key material a chat, GitHub, SQL Editor, `.env`, shell history, argumentos de procesos, archivos de logs o CI. El operador administra la autenticación fuera de chat y declara únicamente estados sanitizados.
5. Preparar **comandos de DML fijos y paramétricos**, con `key_id='P42_V1'` literal y comprobación de fila afectada exactamente una al retirar; no concatenación dinámica ni `DELETE` sin criterio; no incluir `key_bytes` en `RETURNING`, SELECT, traces, ni logs.
6. Probar previamente la semántica de transacción de eliminación/rollback contra **PostgreSQL descartable, nunca hosted**, y probar separadamente el procedimiento de estado deshabilitado. No reutilizar credencial efímera P43. La verificación real de rol de escritura requiere autorización diferente y solo en canal privado.

**Resultado actual del canal DB WRITE:** `UNVERIFIED`; solo se verificó documentación y estructura histórica.

Referencias oficiales: https://supabase.com/docs/guides/database/psql y https://supabase.com/docs/guides/database/connecting-to-postgres .

## 4. Canal Edge de revocación manual

- UI Owner y MFA registrado = evidencia visual de administración; **no** prueba una operación `unset` efectiva.
- Supabase admite `supabase secrets unset [NAME]` y `supabase secrets list`, así como el dashboard. Ninguno ha sido ejecutado en PAZO por este gate.
- Durante un GO futuro, borrar **solo** `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` mediante el canal privado aprobado; leer luego **solo el inventario de nombres**, sin imprimir valores, digests, tokens ni el resto del inventario en chat.
- Confirmar que la clave está ausente tras el borrado, no basarse solamente en respuesta de éxito. Prohibido borrar secretos de otras Edge Functions.

Referencias: https://supabase.com/docs/reference/cli/supabase-secrets-unset y https://supabase.com/docs/reference/cli/supabase-secrets-list .

## 5. BLOQUEO DE BACKUP REAL (hallazgo del código)

Se auditó `scripts/backup-database.ps1` en esta rama. Ejecuta `pg_dump --format=custom --create` para toda la base y **NO tiene** exclusión de `supporter_private.p42_activation_signing_keys`. Por tanto, **una ejecución mientras P42_V1 contenga bytes reales podría copiar el secreto en `database.dump`**, además de ficheros cifrados o snapshots derivados. `docs/PAZO_BACKUP_RESTORE_RUNBOOK.md` mantiene backups periódicos y almacenamiento cifrado/off-site; no inferir que fueron purgados.

**No bloquear ciegamente los respaldos de PAZO para producir una clave efímera.** El próximo gate necesita diseñar y comprobar una política fiable que preserve backups de otros datos **sin incluir `key_bytes`**, o aislar y controlar la retención de cualquier copia. El método debe comprobarse con un PostgreSQL desechable y respaldos sintéticos antes de generar el primer secreto. Los backups previos a la primera clave P42 no contienen una clave que todavía no existía; la incertidumbre afecta copias posteriores. Queda pendiente cualquier decisión específica sobre scripts de backup. No tocar `backup-database.ps1` ahora sin auditoría y prueba de restauración correspondientes.

**Posible solución compatible con PostgreSQL 17, todavía NO implementada:** `pg_dump --exclude-table-data=supporter_private.p42_activation_signing_keys` mantiene el esquema de esa tabla y omite sus filas. La opción está documentada en https://www.postgresql.org/docs/17/app-pgdump.html . Si se selecciona, es obligatorio probar sobre PG17 descartable que el dump contenga el esquema pero nunca la fila sintética de secreto, comprobar `pg_restore --list`, verificar restauración, y que los backups no se hayan enviado ni copiado a otros destinos. **No agregar el flag al script alojado ni afirmar protección hasta aprobar y pasar ese gate de backup**.

**Designación del custodio no modifica los bloqueos del gate.** Antes de un futuro GO se debe confirmar suplente con permisos independientes, agenda exacta y canales de revocación probados. No se ha establecido `T0` ni `Texp`; no se programó tarea ni se provisionó ninguna clave.

**Estado backup:** `BLOCKED_BACKUP_EXPORT_COULD_COPY_P42_KEY`.

## 6. Hitos del turno manual (NO operativos todavía)

Antes de `T0`, con un GO distinto: reserva de dos operadores, inventario de accesos, preparación de rollback para ambas tiendas, política de backups segura, ventana UTC prospectiva y prueba de estado vacío.

En `Texp=T0+24h`, un humano con permisos ejecuta:
1. Comprobar writer P42 OFF, P21 OFF y todos los EXECUTE de API roles denegados. Si deriva: incidente `BLOCKED`, detener cualquier procesamiento.
2. Quitar secret Edge de nombre exacto, sin exponer valor; lectura separada confirma ausencia.
3. Quitar **únicamente** la fila DB `P42_V1` mediante operación administrativa parametrizada/auditada, validar número afectado y realizar SELECT metadata-only separado: cero filas P42; P40/ledger cero; grants y gates aún cerrados.
4. Comparar ambas evidencias y tiempo UTC con el laboratorio sintético `f16P42RevocationEvidenceLab`. Su resultado máximo es solo `P42_REVOCATION_METADATA_CANDIDATE_ONLY`: requiere juicio del operador sobre autenticidad de lecturas.
5. Registrar solo `T0`, `Texp`, instante real de eliminación UTC, rol del ejecutor, categoría de resultado, hash de **código** de auditoría si corresponde, y límites de backup. Nunca secretos ni hashes de la clave.

**Ausencia/incidente:** si el PO detecta incidente o pérdida futura de disponibilidad, revocar anticipadamente por sí mismo cuando aún tenga acceso; si no puede operar en el vencimiento, no hay custodio humano alternativo. Marcar `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED`, mantener todo procesamiento cerrado, no afirmar borrado, y retirar cuando el PO recupere acceso. La expiración lógica no equivale a destrucción física.

## 7. Checklist de aprobación para siguiente gate

| Requisito | Resultado actual |
|---|---|
| Owner + dos TOTP de Supabase | PASS visual |
| Responsable principal PO | **DESIGNADO** mediante confirmación PO 2026-10-16; capacidades operativas aún no verificadas |
| Alternativa sin suplente | **DISEÑO ELEGIDO**, sin garantía de eliminación si PO no está disponible; riesgo residual no aprobado para provisión |
| Conexión PostgreSQL de escritura TLS/parametrizada | NO VERIFICADA |
| Edge `unset` verificable sin material | Procedimiento DOCUMENTADO; no ejecutado |
| Copia `pg_dump` no captura `key_bytes` | **BLOQUEO IDENTIFICADO** |
| Hora futura T0/Texp y agenda | NO FIJADAS |
| Revocación manual 24 horas | Política APROBADA |
| Prueba sintética de revisión de evidencias | PASS en CI anterior; no equivale a prueba real |
| GO separado para generar/guardar `P42_V1` | NO EXISTE |
| Cobros/beneficios y permisos P42 | NO-GO |

**Resultado:** `P42_MANUAL_OPERATOR_CHANNEL_AND_BACKUP_PREFLIGHT_NO_GO`. Ninguna escritura, provisión, tarea programada, plan pagado ni acceso PostgreSQL adicional está autorizada por este documento.


## 8. Diseño de custodio único (decisión posterior PO, 2026-10-16)

El PO eligió la **alternativa segura sin otro administrador**. El responsable principal sigue siendo PO Owner con dos factores MFA ya registrados; no crear permisos para terceros. Se requiere recuperación del propio titular en dispositivos/medios independientes, disponibilidad personal para Texp, validación de ambos canales, backups aislados y un GO nuevo. **Ningún control exclusivamente manual puede garantizar limpieza a una hora fija si esa única persona está indisponible.** Ver `docs/PAZO_F16_P42_SINGLE_CUSTODIAN_SAFE_ALTERNATIVE_20261016.md`.

**Gate:** `P42_SINGLE_CUSTODIAN_DESIGN_ONLY_UNAVAILABLE_FALLBACK_NO_GO`; sin generar/provisionar P42, sin SQL ni Edge hosted y sin habilitar cobros.


## 9. Evidencia PG17: exclusión y restore sintético PASS (2026-10-16)

**Síntesis:** CI F16 Disposable PostgreSQL Lab run `38925576845` SUCCESS, CI general run `38925576708` SUCCESS para SHA `2fa8d74d`. Ensayo nuevo `scripts/f16-p42-backup-exclusion-pg17-lab.sh` y workflow PG17: control negativo del dump sin exclusión (fila P42 sintética incluida), control con `--exclude-table-data=supporter_private.p42_activation_signing_keys` (esquema retenido, datos P42 omitidos, benignos retenidos), y restauración a otra DB descartable (0 claves, 1 control, RLS + FORCE RLS + columna intactos). Se usaron solo bytes deterministas ficticios y credenciales de servicio CI, sin hosted.

**Documento de evidencia:** `docs/PAZO_F16_P42_BACKUP_EXCLUSION_PG17_VERIFICATION_20261016.md`. **Este PASS NO modifica el script real** `scripts/backup-database.ps1`; aún no hay protección efectiva contra respaldo accidental de futura `key_bytes`. El bloqueo `BLOCKED_BACKUP_EXPORT_COULD_COPY_P42_KEY` **PERMANECE**.

**Siguiente acción técnica:** preparar una propuesta de cambio acotado del comando `pg_dump` Windows y un ensayo más amplio de restore, **sin aplicarlo** antes del GO independiente. Custodio PO único confirmado; no existe un segundo administrador, T0/Texp siguen sin definir, acceso DB WRITE/Edge unset no validado y provisión NO-GO.


## 10. Exportador P42 corregido por GO PO, ensayo ampliado PASS (2026-10-16)

- `scripts/backup-database.ps1` fue modificado **solo en el comando `pg_dump`**, con `--exclude-table-data=supporter_private.p42_activation_signing_keys`; conserva todas las demás exportaciones y estructura de P42.
- El control negativo confirma que sin flag se copian datos P42; con flag se omiten filas de `key_bytes`, conservando esquema. Ampliación en PG17 desechable validó datos relacionados (FK), índices, vistas, función SQL, ACL, RLS/Force RLS y restauración a base nueva. CI validó el comando PowerShell real sin ejecutarlo.
- Evidencia [`PG17 #38926912820`](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38926912820) y [`CI #38926912803`](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38926912803), ambos SUCCESS para commit técnico `5474577b428c548b0759861735a6d91eef75a52d`. Informe `docs/PAZO_F16_P42_BACKUP_EXCLUSION_PG17_VERIFICATION_20261016.md`.
- **`BLOCKED_BACKUP_EXPORT_COULD_COPY_P42_KEY` resuelto exclusivamente para backups lógicos FUTUROS que invoquen ESTE script versionado.** Inventario de otros exportadores, backups anteriores, snapshots físicos/terceros y restore integral del PAZO alojado: pendientes. No afirmar eliminación universal de bytes.
- Canal PostgreSQL de escritura TLS+parámetros sigue UNVERIFIED, Edge unset no ejecutado, modelo PO único sin respaldo humano; no T0, no clave y no GO de provisión ni de pagos.
**Marcador:** `P42_BACKUP_SCRIPT_EXCLUSION_PATCHED_PG17_RESTORE_EXPANDED_PASS_HOSTED_UNTOUCHED`.


## 11. Rehearsal de eliminación exacta y política de canales (2026-10-16)

**Orden PO «ok go» limitada a pruebas locales/PG17, NO credenciales ni accesos hosted.** En `supabase/tests/supporter/p42-manual-revocation-postgres-synthetic.sql` se verificaron en PostgreSQL 17 descartable: selección exacta `P42_V1`, cero eliminación al apuntar a versión inexistente, una fila eliminada y `P42_V2` preservada, segunda invocación = cero filas, chequeo de gates/ledger/ACL inertes y `ROLLBACK` completo. Inmediatamente después el preflight P42 READ ONLY existente volvió a confirmar cero claves y protección intacta.

**Evidencia:** commit `c70a0958fade1617a52c2e6db12ea2e4c55cba3c`; [CI 38927865532](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38927865532) SUCCESS; [F16 Disposable PG17 38927865578](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38927865578) SUCCESS. Resultado `P42_MANUAL_DB_REVOCATION_ROLLBACK_PG17_PASS_ONLY`. No se ha generado ni depositado una clave real, ni se ha ejecutado ninguna transacción en Supabase hosted.

**Runbook nuevo:** `docs/PAZO_F16_P42_OPERATOR_CHANNEL_DRY_RUN_NO_PROVISION_20261016.md`. Valida documentación oficial de Supabase para PSQL (`verify-full`, certificado CA y modo Direct o Session Pooler) y CLI de secretos (`secrets unset/list`), sin alegar acceso privilegiado real o acción Edge ejecutada.

**Bloqueos restantes estrictos:** sin prueba de sesión PostgreSQL WRITE `verify-full` alojada, sin `unset` real Edge, sin inventario total de backups/snapshots, sin aceptación expresa del riesgo de custodio único y sin GO de provisión. No repetir P43 ni probar SQL con contraseña real sin una autorización separada.


## 12. Auditoría alojada actualizada tras instalación P42 — solo lectura

**Alcance autorizado en el turno:** comprobaciones de metadatos y código para custodia de 24 h y retirada supervisada, SIN secreto real, T0/Texp, provisión, Edge `unset`, DDL/DML, importación de CA, reinicio ni cambios en permisos. El parche absoluto P42 ya fue instalado manualmente por el Product Owner y confirmado por SELECT independiente. NO ejecutarlo otra vez.

### Evidencia recién comprobada
- **Hosted PostgreSQL:** `p42_guard_absolute=true`, `p42_guard_null=true`; P42 keys=0, writer P42 OFF, worker P21 OFF, P40 bindings=0, ledger=0, reversals=0; `anon/authenticated/service_role/PUBLIC EXECUTE=false` para RPC P42; tabla de claves mantiene `RLS+FORCE RLS=true`. La sesión del conector informa `pg_stat_ssl.ssl=true`, pero **esto NO certifica el `verify-full` de la computadora del custodio ni derecho de escritura por ese canal**.
- **Configuración de logging observada por solo SELECT:** `log_statement=ddl`, `log_parameter_max_length=-1`, `log_parameter_max_length_on_error=0`, `log_min_error_statement=error`, `log_min_duration_statement=-1`, `ssl=on`. Son ajustes de la sesión consultada; **no equivalen a garantía de que no existan registros en todos los servicios de plataforma o clientes**. No enviar `key_bytes` como SQL literal, en SQL Editor, argv, logs o chat; el canal futuro deberá verificar que el transporte de parámetros es privado, que hay límites de logging/errores y que el operador controla los archivos locales.
- **Edge Functions alojadas**: inventario de **8 funciones activas** (`paypal-webhook`, `f14-moderation-purge`, `f14-moderation-reconcile`, `f16-paypal-webhook`, `f16-paypal-supporter-account`, `f16-paypal-operator-read`, `f16-paypal-supporter`, `f16-paypal-sandbox-sale-review`). Se leyó el código desplegado de cada una y **no se encontró la cadena exacta `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` ni referencias directas a P42**. Esto es únicamente un escaneo de referencias estáticas: **NO demuestra que secretos de proyecto estén aislados por función**, ni impide acceso dinámico, futuras versiones o usuarios/operadores administrativos. Supabase documenta que las Edge Functions tienen acceso a variables de entorno del proyecto; auditoría actual `P42_EDGE_STATIC_CONSUMERS_NO_DIRECT_REFERENCE`, aislamiento `UNVERIFIED`.
- **Inventario de valores de Secrets y prueba real de borrado:** integración conectada no tiene acciones `list/set/unset` de Edge Secrets. El PO debe verificar por su interfaz privada **solo si el nombre** `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` está ausente/presente. **No compartir otros nombres, valores ni screenshots con credenciales**. Nunca crear una clave ficticia en Secrets para probar `unset` con la aprobación presente.
- **Backups:** el script lógico de respaldo ya tiene el flag de exclusión para futuras ejecuciones y PG17 restore sintético PASS en evidencia anterior. Persisten **backups históricos/físicos de proveedor, destinos offsite y otros consumidores no verificados**. No proclamar destrucción universal.
- **Canal privado del PO:** el ensayo previo de Session Pooler con contraseña EXISTENTE terminó en `P42_TLS_ONE_SHOT_EXISTING_PASSWORD_UNAVAILABLE_BLOCKED_NO_HOSTED_CHANGE`. Su GO de una sola ejecución quedó consumido; **no repetir** sin autorización separada. P43 ephemeral READ ONLY previo PASS **no concede** permiso administrativo de escritura segura. No restaurar password ni habilitar Temporary Access/JIT como efecto de este informe.
- **Custodio único:** dos factores TOTP del PO constan como validados visualmente en la documentación histórica, pero la recuperación desde medios independientes y su disponibilidad exactamente en `T0+24h` no se han demostrado. El borrado manual supervisado **no puede garantizar retirada física puntual** si el PO está ausente; requiere aceptación futura explícita del riesgo residual y GO separado de generación/provisión. La expiración lógica instalada evita usar un HMAC vencido aunque la retirada material sea tardía.

### Gate presente y decisión práctica
**`P42_CUSTODY_READONLY_AUDIT_PASS_BUT_PROVISIONING_NO_GO`**. Ya cerrados: parche SQL, exclusión del script lógico de backup, ensayos de revocación sintética y auditoría de referencias explícitas de Edge. **Aún bloqueantes:** (1) confirmar inventario de nombre Edge sin mostrar valores, (2) canal `verify-full` administrativo privado apto para provisión *y* retirada sin credenciales expuestas — el password previamente no estaba disponible, (3) comprobar procedimiento de retirada Edge sin destruir recursos reales o crear secretos, (4) alcance total de accesos y backups, (5) aceptación explícita del riesgo de custodio único y horario `T0/Texp`, (6) GO nuevo y concreto.

**No generar, guardar, firmar con, activar o revocar bytes reales P42** con el permiso actual; worker y finanzas siguen NO-GO. La próxima intervención humana mínima es inspeccionar la presencia/ausencia del **nombre** del secreto P42 en Dashboard Edge Functions → Secrets. Si el inventario es distinto de lo esperado, detenerse y auditar antes de operar. No pedir credenciales ni ejecutar el script one-shot previamente consumido.
