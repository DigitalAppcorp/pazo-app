# PAZO F16-P42 — Gate de operador y canal administrativo para revocación MANUAL (NO-GO)

**Fecha:** 2026-10-16. **Alcance autorizado por PO:** preparación y auditoría documental, sin aprovisionamiento, credenciales nuevas, SQL alojado ni cambios de infraestructura. **PR #44 DRAFT / F16 NO-GO.**
**Enlace vigente:** [Contrato de vigencia 24h y revocación manual](PAZO_F16_P42_24H_CUSTODY_EXPIRY_REVOCATION_GATE_20261016.md).

## 1. Identidades de destino fijas

- Supabase proyecto PAZO: `mrybvqdebbgcayuvgkkr`.
- Edge Secret único: `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX`. Edge Secrets son del **proyecto**, no de una sola función; ninguna clave se ha provisionado.
- PostgreSQL: `supporter_private.p42_activation_signing_keys` con `key_id='P42_V1'`, `key_bytes` de 32 bytes, `enabled=false`, `not_before=T0`, `not_after=T0+24h` UTC. `T0` no elegido y jamás debe fijarse como fecha actual durante esta preparación.
- Acceso de `public.f16_p42_register_authenticated_activation` a roles API = denegado, writer P42 OFF, worker P21 OFF; no checkout/pagos/beneficios/PayPal Live. El `service_role` no puede inspeccionar `key_bytes`.

## 2. Operador humano (decisión PENDIENTE)

**Candidato para custodio principal:** Product Owner, cuenta Owner del equipo Supabase y dos autenticadores registrados según capturas. Esto NO le designa unilateralmente ni demuestra acceso PostgreSQL con escritura.

**Suplente:** aún sin designar, permisos y disponibilidad **NO CONFIRMADOS**. Si no existe persona alternativa con acceso independiente ya verificado, el plan manual de 24h es operacionalmente frágil. No prometer disponibilidad de ChatGPT, Codex, un computador Windows apagado o un recordatorio como si fueran operadores de revocación.

**Antes de pedir un GO de provisión**, obtener decisión explícita sobre principal y suplente (preferiblemente cuenta distinta, mínimo privilegio, MFA), y confirmar su presencia para el futuro vencimiento `Texp=T0+24h` y acceso a ambos destinos. No invitar a un miembro nuevo ni cambiar roles/costos en este gate. Si no existe suplente, escalar al PO el riesgo y conservar **NO-GO** hasta resolver la continuidad.

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

**Estado backup:** `BLOCKED_BACKUP_EXPORT_COULD_COPY_P42_KEY`.

## 6. Hitos del turno manual (NO operativos todavía)

Antes de `T0`, con un GO distinto: reserva de dos operadores, inventario de accesos, preparación de rollback para ambas tiendas, política de backups segura, ventana UTC prospectiva y prueba de estado vacío.

En `Texp=T0+24h`, un humano con permisos ejecuta:
1. Comprobar writer P42 OFF, P21 OFF y todos los EXECUTE de API roles denegados. Si deriva: incidente `BLOCKED`, detener cualquier procesamiento.
2. Quitar secret Edge de nombre exacto, sin exponer valor; lectura separada confirma ausencia.
3. Quitar **únicamente** la fila DB `P42_V1` mediante operación administrativa parametrizada/auditada, validar número afectado y realizar SELECT metadata-only separado: cero filas P42; P40/ledger cero; grants y gates aún cerrados.
4. Comparar ambas evidencias y tiempo UTC con el laboratorio sintético `f16P42RevocationEvidenceLab`. Su resultado máximo es solo `P42_REVOCATION_METADATA_CANDIDATE_ONLY`: requiere juicio del operador sobre autenticidad de lecturas.
5. Registrar solo `T0`, `Texp`, instante real de eliminación UTC, rol del ejecutor, categoría de resultado, hash de **código** de auditoría si corresponde, y límites de backup. Nunca secretos ni hashes de la clave.

**Ausencia/incidente:** activar suplente sin esperar Texp en fuga; si no hay operador o un destino permanece accesible, `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED`; no reactivar ni reemitir clave y solicitar intervención. La expiración lógica no equivale a borrado.

## 7. Checklist de aprobación para siguiente gate

| Requisito | Resultado actual |
|---|---|
| Owner + dos TOTP de Supabase | PASS visual |
| Responsable principal PO | PROPUESTO, no designado |
| Suplente humano + permisos | PENDIENTE |
| Conexión PostgreSQL de escritura TLS/parametrizada | NO VERIFICADA |
| Edge `unset` verificable sin material | Procedimiento DOCUMENTADO; no ejecutado |
| Copia `pg_dump` no captura `key_bytes` | **BLOQUEO IDENTIFICADO** |
| Hora futura T0/Texp y agenda | NO FIJADAS |
| Revocación manual 24 horas | Política APROBADA |
| Prueba sintética de revisión de evidencias | PASS en CI anterior; no equivale a prueba real |
| GO separado para generar/guardar `P42_V1` | NO EXISTE |
| Cobros/beneficios y permisos P42 | NO-GO |

**Resultado:** `P42_MANUAL_OPERATOR_CHANNEL_AND_BACKUP_PREFLIGHT_NO_GO`. Ninguna escritura, provisión, tarea programada, plan pagado ni acceso PostgreSQL adicional está autorizada por este documento.
