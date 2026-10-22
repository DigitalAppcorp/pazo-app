# PAZO F16–P42 — ensayo sintético de retirada dual y aceptación operativa (NO PROVISIONAR)

> **ACTUALIZACIÓN PO — 2026-10-16:** Se aprobó preparar **revocación manual supervisada** después de 24 horas, no limpieza automática. Este documento es el ensayo offline; ejecutar `unset` Edge y retirar fila DB exigirá un GO independiente, operador y suplente confirmados, y lectura posterior de ambos destinos. La condición sigue siendo `F16 NO-GO`; claves reales 0. Contrato principal: [P42 custodia y revocación 24h](PAZO_F16_P42_24H_CUSTODY_EXPIRY_REVOCATION_GATE_20261016.md).

> **PRECEDENCIA PO (2026-10-16):** se eligió un **único custodio administrativo**. El requisito histórico de un suplente humano ya no aplica al diseño, pero la falta de continuidad si el PO está indisponible sigue siendo un riesgo sin aceptar para provisión. Ver [alternativa de custodio único](PAZO_F16_P42_SINGLE_CUSTODIAN_SAFE_ALTERNATIVE_20261016.md).\n\n**Fecha:** 2026-10-16. **Proyecto:** `mrybvqdebbgcayuvgkkr`.
**Rama:** `f13/section-titles-20261012`; PR #44 DRAFT; F16 NO-GO.
**Permiso PO «ok go»**: preparar/verificar custodia, revocación y ensayo OFFLINE; no generar/provisionar clave P42 real ni utilizar PostgreSQL/Edge con operaciones de escritura.

## Hechos y límites comprobados

- El PO aportó capturas de Owner de organización y dos factores TOTP: Google Authenticator + Microsoft Authenticator. No inferir que son dos dispositivos físicos distintos ni que se ha realizado recuperación.
- Destino Edge: `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` en **Supabase Edge Secrets de proyecto**. Destino DB: fila `P42_V1` de `supporter_private.p42_activation_signing_keys`, `key_bytes`.
- La guía actual de Supabase incluye `supabase secrets unset [NAME]` y `supabase secrets list`; no se han invocado y la integración conectada en ChatGPT no permite administrar secretos. Referencias: https://supabase.com/docs/reference/cli/supabase-secrets-unset ; https://supabase.com/docs/reference/cli/supabase-secrets-list ; https://supabase.com/docs/guides/functions/secrets .
- Plan Supabase **Free**: según la documentación oficial, las copias diarias gestionadas son para Pro/Team/Enterprise; para Free se recomiendan exportaciones manuales. Esto **NO prueba ausencia de dumps locales, snapshots internos ni copias de terceros**. Referencia: https://supabase.com/docs/guides/platform/backups .
- **No existe transacción atómica entre Edge y PostgreSQL.** Retirada de uno sin el otro produce un estado parcial que debe seguir bloqueado.

## Ensayo implementado, estrictamente en memoria

- `src/features/supporter/testing/f16P42RevocationEvidenceLab.mjs` evalúa **metadatos ya obtenidos y entregados** al evaluador; sin reloj activo, red, secretos, stdout del proveedor, CLI, SQL, PayPal ni permisos financieros.
- `src/features/supporter/testing/f16P42RevocationEvidenceLab.test.mjs` contiene fixtures totalmente inventadas y pruebas adversariales de: alcance Sandbox, proyecto/versión exactos, `not_after=not_before+24h`, trigger expiración/incidente, acuse de retirada de Edge y DB, ausencia de ambos en lecturas independientes, antigüedad de evidencias <=5 min, writer P42/P21 apagados, P40/ledger 0, grants deshabilitados, ausencia de datos sensibles.
- Resultado más alto: `P42_REVOCATION_METADATA_CANDIDATE_ONLY`, `actualProviderAccess=false`, `edgeSecretDeletedByThisCode=false`, `dbKeyDeletedByThisCode=false`. Un test sintético exitoso **NO demuestra** eliminación real, custodia ni cumplimiento de plazo.
- Integración a CI a través de `npm run test:f16:synthetic` (glob existente). No agregar tarea que pueda tocar hosted.

## Procedimiento de dos destinos para un futuro GO distinto (NO EJECUTAR AHORA)

**Preparación previa obligatoria**:
1. Custodio principal: PO confirmado. El PO optó por continuar el diseño **sin otro administrador ni revocador humano alterno**. Comprobar dos vías de recuperación bajo control del mismo PO (no garantiza disponibilidad), acceso Edge `unset` y sesión DB administrativa TLS `verify-full` con parámetros. P43 read-only no autoriza escritura. Ver el gate de custodio único vigente.
2. Acordar política real de backups y eliminación de material, y comprobar que los seis runtimes Edge pueden auditarse respecto al secreto de proyecto. Cualquier exportación/dump durante la ventana podría capturar `key_bytes`: bloquear exportaciones voluntarias no cifradas y documentar todos los destinos de backup; no prometer borrado de copias históricas.
3. **Decisión PO: revocación manual supervisada por custodio único.** Reservar disponibilidad comprobada del propio PO en `Texp=T0+24h` UTC; no designar segundo administrador. Una alarma opcional puede recordar pero **no ejecuta `unset` ni elimina DB**. Sin garantía física si el PO no está disponible. **NO provisionar** hasta cierre técnico de backups/canales y consentimiento PO nuevo y específico que acepte ese riesgo. No crear cron ni infraestructura nueva.
4. Preflight vacío de P42 fresco y `T0` UTC prospectivo solo después de un nuevo GO. No repetir el login temporal P43 ni el chequeo ya cerrado por curiosidad.

**Revocación operativa MANUAL supervisada prevista** (en `Texp=T0+24h`, o anticipada por incidente; sin eliminación automática):
1. Mantener P42 writer false, P21 false y sin `EXECUTE` de RPC (fail-closed); ante drift, bloquear y escalar.
2. El operador con permisos retira el secreto Edge **de nombre exacto** por el canal verificado (`secrets unset` u opción equivalente del Dashboard). No copiar valor a consola/log, no tocar otros secretos.
3. El operador DB autorizado, con TLS validado y sentencia fija parametrizada, deshabilita si hiciera falta y retira **solo** la fila `P42_V1`; nunca utilizar SQL Editor con `key_bytes` ni insertar material en scripts de PowerShell/logs.
4. Obtener **dos verificaciones frescas e independientes** de metadatos: Edge ausencia por nombre (sin mostrar valores), DB cero filas P42, writer/worker OFF, no EXECUTE, P40/ledger en cero. Usar el preflight de estado vacío P42 auditado cuando sea aplicable. No confundir acuse `unset`/DELETE con prueba de ausencia.
5. Reconciliar evidencias con el evaluador sintético y revisión manual. Ante fallo/timeout/indeterminación: marcar `BLOCKED`, no reclamar éxito, no generar reemplazo ni habilitar RPC, repetir solo consulta de estado no sensible y ejecutar remediación con un GO claro.
6. Registrar hora UTC, versión `P42_V1`, custodio, hash del código auditado y categorías de éxito/fallo **sin bytes, hashes de clave ni tokens**. La limpieza de snapshots/backups ajenos se gestiona por su política real, no por la ejecución del script.

**Ventana y cutoff de ejecución**:
- `not_before=T0`, `not_after=T0+24h` UTC y `enabled=false` siempre en este ensayo de custodia.
- El TTL HMAC de 120 segundos no es duración de la clave.
- La RPC P42 tal como está verificada tolera un HMAC emitido antes de `not_after` aun si se invoca hasta 120 s después del vencimiento; antes de un gate posterior de habilitación, **fijar y probar** condición absoluta de `clock_timestamp()<not_after`.
- El diseño de 24h **no garantiza eliminación física automática ni continuidad humana sin suplente**. El único custodio PO deberá realizar/validar el retiro manual, con constancia de hora. Si el PO no puede hacerlo, marcar `P42_MANUAL_REVOCATION_OVERDUE_BLOCKED`, mantener procesamiento bloqueado y retirar cuando se recupere el acceso, sin ampliar validez lógica ni declarar limpieza completa.
- Si se llega a `T0` sin haber terminado ambos almacenes y preparación de cleanup, abortar y compensar. No desplazar ventana sin nuevo GO.

## Criterios de gate

| Control | Estado |
| --- | --- |
| Destinos exactos | RECONCILIADOS |
| Owner + dos TOTP registrados | PASS visual |
| Caducidad futura 24 horas UTC | PO APROBÓ vigencia; `T0` NO fijado |
| Procedimiento de limpieza reversible de dos almacenes | DOCUMENTADO; no probado hosted |
| Validación adversarial de metadatos | CÓDIGO DE LABORATORIO; no equivale a prueba hosted |
| Acceso privado DB de escritura TLS y sin logs | PENDIENTE |
| Revocación manual supervisada por PO único | DISEÑO ELEGIDO; riesgo sin sustituto, disponibilidad/operación real PENDIENTES |
| Inventario backups/exposición de secrets de proyecto | PENDIENTE |
| Clave P42 real | **0 — NO GENERAR** |
| Writer P42 / Worker P21 / Checkout / Pago / Beneficios | **OFF / NO-GO** |

**Decisión:** `P42_DUAL_STORE_REVOCATION_OFFLINE_REHEARSAL_ONLY`. Se requiere un GO futuro independiente para provisionar y revocar la clave. Otro GO posterior e igualmente independiente para cualquier grant/runtime/operación financiera.
