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
