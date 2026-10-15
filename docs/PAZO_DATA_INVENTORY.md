> **F16-P05 — DECISIONES DE RETENCIÓN PENDIENTES, SIN CAPTURA NUEVA (2026-10-15).** Fuente estructurada `docs/PAZO_F16_P05_RETENTION_DECISION_REGISTER_20261015.json`: P01/P02/P03/P04/P05/P06/P07/P09 con minima condicionales CA ARL/CCPA, hold, finalidad y `manual_class_review_only`. No se guardaron PII ni registros nuevos; todos los flags de captura, borrado y beneficios permanecen false, `paidThrough=null`. Auditor offline solo prepara paquete de revisión; no sirve como autorización jurídica ni mecanismo de limpieza. El core de rama ahora responde 503 sin persistir a un `outside_pazo` que no puede probarse; evita ACK de disputa ajena no atestada. Fuentes `docs/PAZO_F16_P05_RETENTION_DECISION_PACKET_20261015.md`.\n\n> **F16-P05 — CONSERVACIÓN DIFERENCIADA / DISPUTAS SIN NUEVA CAPTURA (2026-10-15).** Matriz interna `docs/PAZO_F16_P05_PRIVACY_RETENTION_OPERATIONAL_GATE_20261015.md`: P01 opt-in/versiones de renovación (CA BPC §17602(a)(6) mínimo 3 años desde aceptación o 1 año tras terminación, el mayor, si aplica); P02 ledger contable/plazos fiscales pendientes; P03 referencias mínimas de disputas PAZO, holds pendientes; P04 inbox de eventos/TTL independiente; P05 logs mínimos sin PII; P06 registro de solicitudes privacidad (CCPA 11 CCR §7101 ≥24 meses solo si CCPA aplica); P07 backups/bajas; P09 acuses/términos. No hay norma universal de 90 días, 3 años o 7 años para todas las categorías, ni purga automática aprobada. Receptor de rama ahora requiere `verifyDisputeRetentionRelease` server-only adicional, DESCONFIGURADO por defecto, aparte de firma y scope PAZO; en caso de fallo 503 sin almacenar. No se han capturado nuevas disputas ni se han instalado RPC/worker, F16 NO-GO.

> **F16-P05 — NUEVA CONSULTA PRIVADA PLANEADA, NO INSTALADA (2026-10-15):** la propuesta `f16_p05_dispute_private_ledger_read_DO_NOT_APPLY.sql` no crea nuevas tablas ni almacena datos. Dos RPC de solo lectura, restringidas a service_role, podrían procesar `seller_transaction_id` (proveniente de PayPal GET autenticado) y proyectar únicamente sale ID/sub ID, owner UUID interno, plan, USD 2.99, estado `uncredited|blocked_reversal`, luego una intención `bound` del **mismo** dueño. El adaptador server-only excluye emails, buyer, mensajes y tokens; jamás frontend, analytics o logs de contenido. No se hizo ninguna llamada PayPal real ni se leyó una venta existente (ledger hosted 0 filas). La retención, finalidad, acceso auditado y disposiciones de disputas ajenas P01–P04/P09 están pendientes. Referencia `docs/PAZO_F16_P05_PRIVATE_DISPUTE_LEDGER_READ_GATE_20261015.md`.

> **F16-P05 — ATRIBUCIÓN DE DISPUTAS MERCHANT, SOLO MÓDULOS INACTIVOS (2026-10-15):** lectura propuesta de PayPal Sandbox `webhooks-events/{eventId}` y `customer/disputes/{disputeId}`; la proyección permite solo `event_id`, `event_type`, `dispute_id`, `disputed_transactions[].seller_transaction_id` y monto/currency de transacción si existen. Se descartan por completo nombres, direcciones, correo, mensajes, documentos, extensiones, URL y token OAuth; ninguna de estas lecturas se ejecutó realmente, tests son mocks. Una referencia de venta se contrastaría solo con `supporter_private.paypal_payment_entries` y la intención privada BOUND para mismo plan/owner/sub, con resultado interno `confirmed_pazo` o `unknown`, nunca expose user ID. Actualmente no hay payment entries alojados; no nueva captura, almacenamiento, retención ni permiso de usuario. Retención/hold/propósito y tratamiento de disputas ajenas P01–P04/P09 pendientes revisión. Fuente `docs/PAZO_F16_P05_DISPUTE_SELLER_TRANSACTION_SCOPE_GATE_20261015.md`.

> **F16-P05 — DISPUTAS EN CÓDIGO INACTIVO, SIN NUEVA RECOLECCIÓN (2026-10-15):** preparar tres tipos `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED` en receptor de rama bajo `disputeCaptureApproved=false`; ninguna captura hasta que verificador de alcance interno confirme por GET PayPal + ledger PAZO sin datos cliente (callback acepta **sólo** eventId/tipo). SQL `supabase/drafts/f16_p05_dispute_event_rpc_DO_NOT_APPLY.sql` está bloqueado a base CI descartable. Sólo se prevé persistir id/tipo/timestamp firmado para disputas PAZO, con `retention_hold`; plazo, fundamento, borrado y controles de disputas ajenas del mismo comercio siguen pendiente revisión P01–P04/P09. No guardar motivo/mensajes/payer/correo ni raw webhook; no copiar cartera de disputas ajenas. El receptor desplegado F16 v13 y Supabase hosted no se cambiaron. Documento `docs/PAZO_F16_P05_DISPUTE_CAPTURE_PRIVACY_AND_ROLLOUT_DRAFT_20261015.md`.

> **F16-P05 — COBERTURA DE DISPUTAS DETECTADA, SIN CAPTURA NUEVA (2026-10-15):** auditoría solo lectura del Edge F16 v13 y RPC de guardado confirma que actualmente **no se conservan los eventos** `CUSTOMER.DISPUTE.CREATED/UPDATED/RESOLVED`, aunque PayPal los documenta. No inferir que no haya disputas solo porque no hay filas. Los evaluadores/offline y preflight PayPal se reforzaron para bloquear conciliación financiera por falta de cobertura, pero NO se amplió el allowlist activo ni se ejecutó OAuth/SQL financiero. En el futuro, guardar únicamente IDs/tipo/verificación de disputas que se puedan atribuir al producto PAZO, con propósito, retención, acceso, hold y eliminación legal aprobados; no almacenar raw payload/PII, ni mezclar disputas ajenas de merchant. Ver `docs/PAZO_F16_P05_RUNTIME_WEBHOOK_DISPUTE_COVERAGE_AUDIT_20261015.md`.

> **F16-P05 — NUEVO LECTOR MERCHANT SCOPED INACTIVO (2026-10-15, sin recopilación real):** el laboratorio `p05SandboxClaimScopedMerchantReaders.mjs` usa callback privada claim/event para decidir si consultar PayPal Sandbox (`GET evento`, `GET suscripción`, OAuth token POST). Campos que *podría procesar* el backend autorizado: event ID/tipo/fecha, venta ID/estado/importe, subscription ID/plan/custom_id/status, intent ID/owner UUID en la RPC inversa. El código proyecta solo esos datos y descarta correo/contacto/subscriber/payee y secretos. **Esta implementación no hace llamadas reales, no añade tablas ni datos almacenados, no escribe logs de pago, no activa beneficios.** Protección real de firmas y retención por clase de evidencia siguen pendientes; no procesar los ocho eventos QA. Fuente `docs/PAZO_F16_P05_CLAIM_SCOPED_PAYPAL_MERCHANT_READER_GATE_20261015.md`.

> **F16-P05 — SQL DRAFT DE EVIDENCIA PRIVADA (2026-10-14, NO RECOLECTADO NI DESPLEGADO):** se creó solo en GitHub `supabase/drafts/f16_p05_private_prospective_evidence_v1_DO_NOT_APPLY.sql`, con guardia que impide aplicación fuera del PostgreSQL CI `f14_synthetic`. Tres categorías FUTURAS no capturadas: (1) opt-in explícito de renovación vinculado al intent con versión, SHA256, versión de avisos, idioma/canal, horas de presentación/aceptación; (2) foto mínima `subscriptionId`, evento activación y merchant next billing; (3) revisión primer período `subscriptionId`, `saleId`, evento de venta, límites candidatos y motivo. No almacena email del pagador, tarjeta, JWT, payload completo, IP ni datos de ubicación. Tablas del borrador son privadas con FORCE RLS, sin policies ni DML para `anon/authenticated/service_role`; nada de entitlement ni borrado. Se fortalecieron FKs compuestas entre venta y suscripción y entre eventos y su tipo, pero el origen merchant/ciclo no queda criptográficamente atestado por SQL. Retención de consentimiento California BPC §17602(a)(6) sujeta a aplicabilidad y conservación del texto exhibido; contabilidad/reversals/borrado de cuenta aún pendientes de dictamen/PO. `docs/PAZO_F16_P05_PRIVATE_SCHEMA_DRAFT_REVIEW_20261014.md` documenta el alcance. **No hay cambios nuevos en Supabase hosted**, ni analytics ni términos públicos.

> **F16-P05 — CORRECCIÓN Y CLASIFICACIÓN DE RETENCIÓN (14-oct-2026, SIN NUEVA CAPTURA):** revisada California BPC §17602(a)(6): para contratos sujetos a dicha norma se retiene verificación de consentimiento afirmativo **al menos 3 años o hasta 1 año posterior a finalización, el plazo MÁS LARGO**. El laboratorio `p05CaliforniaConsentRetentionLab.mjs` calcula un mínimo legal prospectivo (sin autorizar borrados, sin leer/escribir DB, sin PII). **No confundir** con todos los registros financieros: su justificación fiscal/contable, reversals, disputes y retención siguen pendientes de asesoría/PO. Si PAZO está sujeta a CCPA, registros de solicitudes/decisiones de privacidad requerirían al menos 24 meses bajo 11 CCR §7101; su aplicabilidad debe comprobarse. No usar tiempo de retención del inbox PayPal como regla universal del ledger. Detalle `docs/PAZO_F16_P05_RETENTION_AND_PROVIDER_PROVENANCE_GATE_20261014.md`. No se han almacenado nuevas aceptaciones ni datos PayPal en este gate; ninguna política de eliminación ha sido activada.

> **F16-P05 — ACKNOWLEDGEMENT Y CALENDARIO PRIVADO, SOLO PREFLIGHT OFFLINE (2026-10-14):** El nuevo módulo `p05OfflineCapturePreflight.mjs` inspecciona **datos sintéticos** sobre oferta/version SHA-256, divulgación de cancelación, versión de aviso de privacidad (no asumir que equivale a consentimiento legal), aceptación positiva de compra, vínculo Auth↔intent↔suscripción, tiempos de creación PayPal y próxima fecha de cobro observada en evento firmado. El código utiliza adapters simulados solo lectura; **NO almacena aceptación, calendario ni información nueva en Supabase**, no activa checkout ni entitlements. De aprobarse después de los gates legales/retención, estos serían metadatos privados sensibles mínimos vinculados a cuenta, jamás analítica/UI pública, con RLS y referencias opacas. No conservar nombre/email del pagador, tarjetas, cuerpo PayPal bruto, JWT ni secretos. Documento canónico `docs/PAZO_F16_P05_TERMS_ACCEPTANCE_CAPTURE_PREFLIGHT_20261014.md`; P01–P04/P09, condiciones de aceptación y borrado financiero pendientes de decisión/aprobación antes de cualquier escritura.

> **F16-P05 — CONTRATO PROSPECTIVO OFFLINE, NO RECOPILACIÓN NUEVA (14-oct-2026):** archivo `p05ProspectiveEvidenceContractLab.mjs` + pruebas definen exclusivamente una **propuesta**, no desplegada, de metadatos privados sensibles de facturación: referencias opacas `subscriptionId`, `intentId`, `planId`, `saleId` y `webhookEventId`; fechas de lectura y facturación merchant, revisión de versión de contrato, moneda/importes en centavos, intervalos candidatos, origen de ciclo y estado de reversals/disputas. Nada se persiste en Supabase, navegador o analytics con este trabajo; pruebas usan datos sintéticos. No incluye nombre/email del pagador, tarjetas, JWT, datos brutos ni credenciales. Requiere autorización PO para cualquier futura migración/almacenamiento, pruebas de source attestation, RLS/ownership, idempotencia, política de borrado y retención financiera P01–P04/P09 **todavía sin aprobar**. Código protegido sin `paidThrough`, ledger ni beneficios. Diseño canónico: `docs/PAZO_F16_P05_PROSPECTIVE_EVIDENCE_CONTRACT_20261014.md`. Este estado supersede descripciones históricas del F16 donde corresponda, sin cambiar el inventario real ya instalado.

> **F16 BUYER QA SANDBOX BOUND — DISEÑADO NO EJECUTADO (14-oct-2026):** después de `bound_verified` verificado en hosted (1 BOUND), el script local `scripts/f16-sandbox-existing-buyer-e2e.mjs` puede verificar la misma intención privada (service-only RPC) y GET de la misma suscripción y plan Paypal Sandbox. Con nuevo GO PO independiente, el operador podría mostrar **solo dentro de la terminal local** la URL privada `approve` del Sandbox buyer y permitir aprobación virtual una vez; guarda únicamente `buyer-claimed` como texto fijo y fases de estado no secretas en archivo del operador. Nunca envía buyer URL/token, email, payer ID, Auth UUID o PayPal I-ID a logs GitHub/analytics/chat; ni se capturan datos reales de pago. Cancelación de **misma** sub ACTIVE si corresponde mediante Merchant API Sandbox; sin ledger/entitlement ni proveedor Live. No borrar referencias QA/webhooks ni reclamar meses por estado ACTIVE; conciliación y retención se deciden aparte.

> **F16 — QA AUTH RECOVERY PREPARADA SIN EJECUTAR (14-oct-2026):** script local Windows `scripts/f16-paypal-recover-existing-bound.mjs` puede recuperar únicamente la cuenta Auth QA `pazo-f16-UUIDv4@example.com` y la intención privada `pending` existentes, después de GO PO específico. `--preflight` solo lee ID/Auth, intención service_role y sub/plan PayPal Sandbox del experimento, no emite IDs/email/tokens/links en stdout. `--bind-existing` requeriría **un cambio de contraseña de la cuenta QA** (password aleatorio en memoria sin guardar, no se envía email) y una RPC privada `bind`; sin PII en logs, sin pasarela LIVE ni contadores de pagos. Referencias originales quedan en estado local del operador; claim atómico `*.recover-claimed` solo contiene texto fijo para impedir repetición tras timeout, no IDs/secretos. Retención de Auth QA, intents y webhooks sigue sujeta al SOP, no limpiar sin aprobación. No usar estas señales en analítica/monitorización cliente.

> **F16 FORENSE PREAPPROVAL SOLO LECTURA (14-oct-2026):** nuevo operador privado `--diagnose-readonly` reutiliza los identificadores ya generados de la primera prueba de PAZO Auth+PayPal Sandbox; consulta solo `f16_paypal_read_private_intent`, `auth.admin.getUserById` del owner reservado y GET merchant PayPal del plan/suscripción existente, sin crear más datos ni escribir. El clasificador `f16PendingSandboxReadOnlyAssessment.mjs` no emite ID de usuario/intent/suscripción, email, URL de aprobación, token ni payload; salida solo de estados booleanos/enum. No se transfiere información financiera a analytics ni se almacenan secretos en repo. Preservar el archivo local de recuperación; los plazos de retención/limpieza de Auth descartable, intent y webhook siguen sin aprobación, no borrar por SQL. **Read-only hosted:** Auth 8, intents 1 pending/0 bound, payment ledger 0, inbox 5 pending, consents 0. Esta actualización documental no activa worker ni hace llamadas merchant desde GitHub.

> **F16 Auth BOUND — CÓDIGO PREPARADO, NO ACTIVADO (2026-10-14):** nuevo coordinador server-only `supabase/functions/f16-paypal-webhook/f16BoundSandboxIntentCoordinator.mjs`, sin endpoint/deploy, define únicamente tratamiento futuro de **UUID Auth verificado con `getUser`** (privado de cuenta) y **`intent-UUIDv4` / `subscription_id` / `plan_id` / `custom_id`** (privado sensible de pago). La llamada futura de server `service_role` podrá escribir `pending` y `bound` en `supporter_private.paypal_subscription_intents` **solo tras GO específico**; deberá corroborar PayPal merchant `APPROVAL_PENDING` antes de aprobación Personal Sandbox. No transportar a analytics, UI pública, logs, Git ni ChatGPT IDs de cuenta/usuario, JWT, secretos o PII del pagador. **No recolecta datos nuevos actualmente**: 7 Auth existentes, 0 intents/ledger/reversals, 4 inbox firmados pendientes de experimento anterior (solo lectura Supabase). Retención de nuevas intenciones/compras permanece P01–P04/P09 pendiente; no inventar TTL ni borrado automático. Documento operativo `docs/PAZO_F16_AUTH_BOUND_SANDBOX_E2E_PREAPPROVAL_GATE_20261014.md`. No tratar código mock/CI como prueba de pago real ni como alta Auth completada.

> **F16 MULTIREFUND — ARQUITECTURA APROBADA POR PO SOLO EN LAB (14-oct-2026):** prototipos PostgreSQL descartables `f16_refund_multievent_ledger_lab_DRAFT_DO_NOT_APPLY.sql` y `f16_refund_multievent_readers_lab_DRAFT_DO_NOT_APPLY.sql` preparan dos nuevas tablas privadas NO INSTALADAS HOSTED: `f16_lab_refund_events` (ID refund opaco único, evento webhook, venta original, suscripción, centavos USD, status y fecha PayPal, sin payload, email ni titular visible) y `f16_lab_refund_sale_holds` (ID venta original, refund acumulado, contador, estado partial/full). RLS forzada, sin SELECT directo de `service_role`, usuario o frontend; RPC privada con lease + commit/ACK atómico. El lector F14 de baja financiera incluye refunds antes de venta y NUNCA permite borrar Auth por sí solo. En Supabase alojado permanecen las tablas previas; los cuatro webhooks PayPal firmados están pending y no vinculados a Auth, con 0 pagos/reversos; no se desplegaron estas tablas, no se procesó un refund real y no hay entitlement. Autorización del PO **no** decide retención de nuevas filas ni efecto de parcial en beneficios. Informe `docs/PAZO_F16_MULTIEVENT_REFUND_LEDGER_LAB_APPROVED_GATE_20261014.md`.

> **INVENTARIO F16 VIGENTE 2026-10-14 — reemplaza las afirmaciones históricas inferiores «NO INSTALADA»:** las tablas privadas de PayPal `paypal_verified_event_inbox`, `paypal_subscription_intents`, `paypal_payment_entries` y `paypal_payment_reversals` **SÍ están instaladas en Supabase alojado**, con acceso directo restringido y RLS forzada. El webhook `f16-paypal-webhook` v13 ya ingirió **4 eventos firmados de Sandbox**, todos `pending`; intenciones, pagos, reversos y consentimientos **0**. La compra pasada no está vinculada a cuenta Auth. No hay nuevas RPC `f16_lab_*` instaladas ni trabajador privado, beneficiarios, cobertura, checkout nuevo o PayPal Live activado. Los textos anteriores bajo F16 describen etapas pasadas, no el estado operativo vigente. El plazo **90 días solo para inbox reconciliado** se mantiene; la retención de intents/ledger/tombstones, eliminación de cuenta, refund y cobertura están **pendientes de aprobación** según `docs/PAZO_F16_POLICY_RETENTION_COVERAGE_DECISION_MATRIX_20261014.md`. Nuevo DRAFT lab `f16_financial_deletion_exposure_lab_DRAFT_DO_NOT_APPLY.sql` consulta únicamente conteos, **no instalado hosted**. No publicar UUIDs/IDs de pago o datos personales en reportes.

> **RESPALDO PRIVADO REAL — 2026-10-11 (vigente):** exportados DB/roles completos (incluye datos/credenciales gestionadas de Auth) y 2 binarios Storage, solo para recuperación autorizada. Originales, copias claras del restore y manifests privados se conservan localmente fuera de repo/sync con ACL operador/SYSTEM; paquete age cifrado y clave privada separados, sin secretos ni huellas individuales en Git/chat/telemetría. Restore real offline y hashes PASS LOCAL. Cero subida a terceros: el PO difiere la reconexión/subida a Drive personal para después; no usar cuenta de soporte, enlaces públicos ni enviar ZIP claro. Custodia independiente de clave, copia externa y retención/limpieza manual del material privado aún pendientes; no borrar originales automáticamente. La retención local es para este gate de recuperación, no analytics ni nueva recolección del producto. [Evidencia agregada](PAZO_REAL_BACKUP_LOCAL_RECOVERY_20261011.md). Este estado sustituye la afirmación histórica de cero exportación.

**ACTUALIZACIÓN VERIFIED HOSTED (2026-10-14 UTC):** el Product Owner autorizó y se aplicaron únicamente las dos migraciones F16 en Supabase `mrybvqdebbgcayuvgkkr`; tablas privadas de eventos, intenciones, pagos y reversos están instaladas, vacías (0 filas), con RLS forzada y RPC de servidor restringidas. Versiones alojadas: `20261014042616_f16_private_verified_event_inbox.sql` y `20261014042646_f16_private_intents_financial_ledger.sql`. NO se desplegaron Edge Functions, NO se modificó PayPal/webhook ni se activaron cobros, períodos pagados o membresías. Las afirmaciones históricas inferiores «NO APLICADAS» se refieren al momento anterior a este gate; NO se deben tratar como estado actual. Retención de ledger e intenciones pendiente.


> **T11 / INVENTARIO VIGENTE — 2026-10-11:** READ ONLY: 7 Auth, 2 profiles, 2 mascotas y 2 objetos Storage; preservar todos. Respaldo autorizado contiene datos privados Auth/DB y binarios Storage en carpeta local no sincronizada con ACL de operador, manifest privado de identidad/rutas/hashes y posterior paquete cifrado age para Drive personal privado del PO. Clave privada fuera de Git/Drive/chat. Únicamente ciphertext y evidencia agregada se transfieren; no analytics, enlaces públicos ni logs de contenido. Cero datos alojados exportados/subidos en esta ejecución por falta de accesos. El correo personal de destino no se publica; reconexión OAuth e integridad/descarga/restore reales pendientes. La cuota llena del soporte requiere intervención humana separada.

> **INVENTARIO ACTUAL READ ONLY — 2026-10-10:** 6 cuentas Auth preservadas, 1 profile, 1 mascota, 1 objeto pet-avatars y 1 grant moderador; cero posts/comunidades/community posts/claims held. Una solicitud de baja completed, ninguna abierta. No hubo copia de identidades ni modificación de datos. Para reconciliar fotos de comunidad se usan únicamente los metadatos operativos existentes de Storage y referencia privada exacta; no nueva telemetría/localStorage. Procedimiento: [operaciones de cierre](PAZO_MVP_CLOSURE_OPERATIONS_20261010.md). Supersede conteos históricos posteriores al reset.

# PAZO — Data & Third-Party Inventory

> **Estado de referencia pre-beta (verificado el 2026-10-10, sujeto a cambios de QA):** la descripción antigua de cero datos correspondía al reset anterior, no al estado actual. Había **7 cuentas Auth** (6 originales que deben preservarse y 1 QA descartable ya confirmada), **1 mascota y 1 archivo Storage anteriores**, **1 moderador** y **0 solicitudes de eliminación**. Esta cuenta QA no tenía mascotas ni archivos; su ensayo está reservado a Codex en `docs/PAZO_CODEX_PENDING_QA_20261010.md`. El inventario registra categorías y no sustituye una consulta actual de la base de datos.

**Estado:** ACTIVO / baseline pre-Beta  
**Regla:** este documento describe categorías y destinos conocidos. No sustituye una auditoría de schema ni una Privacy Policy pública.

## 1. Cuenta / autenticación

**Datos**
- email;
- identificadores internos de usuario/sesión;
- credenciales gestionadas por Supabase Auth.

**Clasificación**
Privado de cuenta.

**Proveedor**
Supabase.

**Reglas**
- contraseña nunca se registra en analytics;
- no exponer email a perfiles sociales;
- no enviar email a PostHog;
- mínimo de contraseña reforzado en UX/local baseline;
- 18+ requiere declaración activa del usuario.

## 2. Perfil social de mascota

**Datos**
- nombre;
- especie/raza/edad descriptiva;
- foto;
- bio;
- zona/intereses según feature;
- estado social/público cuando aplique.

**Clasificación**
Mixto: campos públicos por intención + datos internos.

**Proveedor**
Supabase Database/Storage.

**Regla**
La identidad social es la mascota, no el humano.

## 2A. Amigo de PAZO — consentimiento para muro (solo esquema, inactivo)

**Estado verificado 2026-10-13:** esquema `supporter_private` instalado por autorización PO con migración Supabase `20261013215221`. Tabla `wall_consents` **sin filas**, al carecer aún de membresías verificables y de interfaz de consentimiento real. **No se publica ningún participante.** `RLS` habilitada y forzada, sin acceso directo `anon`/`authenticated`.

**Datos que podría almacenar tras habilitación futura autorizada:** `pet_id`, `owner_id_at_grant` (UUID de cuenta interno), `notice_version`, `granted_at`, `revoked_at`, `updated_at`. Categoría **privada de cuenta y consentimiento**; proveedor Supabase Database. Se asocian a datos públicos de mascota solo cuando un contrato futuro valide membresía, titularidad y autorización sin revelar identidad humana.

**Protecciones activas:** RPC de revocación y lectura privada solo para autenticados y propiedad comprobada; RPC de nueva autorización bloqueada por `wall_has_verified_entitlement() = false`; ninguna lista pública ni identificación de suscriptores; no PayPal ni historial de pagos. Eliminación de mascotas/usuarios debe auditarse conforme SOP F14 y FK; la política de conservación/retención requiere revisión antes de habilitar opt-in real. No usar analytics para consentimiento ni pago.

## 3. Feed / UGC social

**Datos**
- posts;
- fotos;
- comentarios;
- likes/follows/saves o equivalentes cuando estén implementados.

**Clasificación**
Público/social por intención del usuario.

**Riesgos**
- moderación;
- copyright/IP;
- abuso;
- contenido personal publicado voluntariamente.

**Beta requirement**
Reporting/blocking/removal policy en F14.

## 4. Comunidades

**Datos**
- comunidad;
- descripción/reglas;
- membresía;
- posts/comentarios;
- imágenes.

**Clasificación**
Social/público o membership-scoped según el contrato del módulo.

**Proveedor**
Supabase Database/Storage.

**Notificaciones por membresía (F13, nueva función pendiente de activación):**
- Destinatario: UUID del dueño de comunidad en `notifications.user_id`; `source_id` UUID de comunidad, tipo `community_join`, título y cuerpo limitados que identifican la comunidad, creación/lectura.
- Señal: inserción confirmada de `community_memberships`, no contenido de conversación; no se persiste identidad de la mascota/unidor en el aviso.
- Clasificación: social/contextual; acceso solo destinatario por RLS ya existente, sin INSERT del frontend.
- Proveedor: Supabase Database actual. Sin GPS, email, analítica, proveedor nuevo o push externo. Migración instalada por autorización del PO en Supabase como versión 20261013025451. No se establecen reglas de retención nuevas al margen del ciclo de vida vigente de notifications.

## 5. Lugares / mapa

**Datos**
- catálogo de lugares;
- búsquedas/filtros;
- check-ins;
- sugerencias;
- ubicación del dispositivo durante uso del mapa.

**Clasificación**
- catálogo: público;
- presencia/check-in: sensible/contextual;
- GPS exacto del dispositivo: sensible y efímero.

**Regla**
- no persistir GPS exacto por defecto;
- no enviar coordenadas exactas a analytics;
- visibilidad de presencia debe ser explícita.

**Proveedor adicional**
Mapbox recibe solicitudes necesarias para renderizar/usar el mapa según su integración. El cliente obtiene GPS solo tras pulsar el botón de ubicación y lo usa en estado de sesión para centrar el mapa y calcular distancias; los check-ins persistentes sí registran la identidad de mascota/lugar, fecha y visibilidad, sin el GPS exacto del dispositivo. El proveedor del mapa puede recibir metadatos técnicos de las zonas visualizadas.

## 6. Rescue / QR / mascota perdida

**Datos**
- token público;
- perfil público limitado;
- estado de mascota perdida;
- última ubicación textual;
- reportes de avistamiento;
- nombre/teléfono/mensaje del reportante cuando lo proporciona.

**Clasificación**
Mixto:
- perfil público limitado;
- reportes/contacto: sensible.

**Regla**
- acceso público solo mediante el contrato de Rescue;
- no enviar contenido/contacto a analytics;
- mantener rate limits;
- ownership de acciones del dueño.

**Aviso legal en preparación:** los avistamientos pueden incluir nombre y teléfono del reportante, mensaje y ubicación escrita; el enlace público de rescate solo debe divulgar los campos limitados acordados, no esos datos privados. La política ES/EN deberá comunicarlo antes del lanzamiento.

## 7. Cuidados / Agenda

**Datos**
- tareas/recordatorios;
- estado/fechas;
- mascota relacionada.

**Clasificación**
Privado de cuenta/mascota salvo futura decisión contraria.

**Proveedor**
Supabase.

## 8. Documentos privados

**Datos**
- archivo;
- nombre original;
- MIME/tamaño;
- categoría/título;
- metadata de Storage.

**Clasificación**
Privado sensible.

**Proveedor**
Supabase private Storage + Database.

**Reglas**
- owner-only;
- URLs firmadas temporales;
- no contenido/filename en analytics;
- no session replay;
- lifecycle recuperable.

## 9. Search telemetry

**Datos**
- session id;
- tipo de evento;
- tipo de resultado/filtro;
- had_results;
- timestamps.

**No almacenar**
- query cruda;
- entity id;
- GPS;
- PII.

**Proveedor**
Supabase.

## 10. Product validation / Places telemetry

**Datos**
- module key/event type;
- session;
- contexto cerrado mínimo;
- timestamps.

**Reglas**
- deduplicación;
- sin contenido del usuario;
- sin PII innecesaria.

**Proveedor**
Supabase.

## 11. Error monitoring / product observability

**Estado**
Proyecto PostHog conectado y privacy settings aplicados; live ingestion pendiente (0 eventos ingeridos al checkpoint).

**Proveedor previsto**
PostHog.

**Datos permitidos**
- UUID interno;
- session id aleatorio;
- release/environment;
- eventos allowlisted;
- códigos de error;
- excepciones sanitizadas.

**Bloqueado por defecto**
- session replay;
- autocapture;
- PostHog GeoIP enrichment (`$geoip_disable=true` on PAZO events);
- email;
- teléfono;
- mensajes/posts/documentos;
- texto de búsqueda;
- GPS;
- tokens;
- datos de pago.

## 12. Pagos / Supporter

**Estado (revisado 2026-10-13)**
Checkout frontend desactivado. **Webhook heredado activo en Supabase, auditado como NO APTO para activar membresías F16**: actualiza `profiles.is_founder` al comprobar estado ACTIVE sin pago conciliado, sin inbox idempotente y selecciona Live por defecto si falta `PAYPAL_ENV`. Webhook Sandbox existente apunta a **otro host**, no al endpoint Supabase esperado. No se ha vinculado ni reconfigurado el webhook, no hay cobros ni membresías F16 reales. Plan Sandbox USD 2.99 mensual validado con API por el PO.

**Proveedor**
PayPal.

**PAZO puede almacenar**
- entitlement;
- subscription id/provider reference necesaria;
- estado derivado.

**PAZO no almacena**
- PAN/número de tarjeta;
- CVV;
- credenciales de PayPal.

**Pendiente**
- configurar secretos exclusivamente del lado servidor con entorno Sandbox/Live separado (sin registrar credenciales);
- confirmar titularidad del host de callback de webhook Sandbox, diseñar receptor seguro y entrega efectiva;
- inbox privada transaccional con datos operativos mínimos: IDs de evento y tipo PayPal, referencia de transacción por verificar, sin payload completo/PII/credenciales; retención por aprobar;
- plan de autorización, migración y reconciliación de pagos, reversos y meses pagados; no usar insignia fundador;
- cancelación/UX y Privacy Policy/Terms definitivos. Precio/plan F16 USD 2.99/mes **ya aprobado y validado**.

### F16 — Inbox privada de eventos PayPal (solo propuesta, NO instalada)

Borrador SQL de laboratorio: `supabase/tests/supporter/f16-payment-inbox-lab-draft.sql`. **No existe como tabla de pagos alojada**, no se ha activado webhook ni comenzado a almacenar eventos reales. Solo prevé ID de evento opaco, tipo autorizado, marcas temporales, estado, contador de reintentos y código de error enumerado; sin payload completo, nombres, correos, números de tarjeta, credenciales, ubicación ni identificación de mascota. Función RPC prevista **exclusivamente server-to-server** y sin visibilidad directa en Data API. Ninguna cobertura o estado de fundador resulta de registrar el evento.

**Pendiente antes de implementación:** definir finalidad/retención limitada y derechos de eliminación frente a transacciones/refunds, confirmar utilidad contable, implementar conciliación verdadera y probar permisos/privacidad en PostgreSQL desechable. El SQL no es migración, no está autorizado para aplicar a Supabase y las pruebas SQL de roles/concurrencia siguen pendientes. Plan y gate técnico: `docs/PAZO_F16_PRIVATE_PAYMENT_SCHEMA_PREFLIGHT_20261013.md`.

## 13. Hosting / deployment

**Proveedor previsto/actual a verificar**
Vercel.

**Pendiente**
- proyecto exacto;
- env;
- logs;
- usage/spend controls;
- retención.

No afirmar prácticas públicas hasta verificar.

## 14. Client/local storage

Usos conocidos:
- sesión manejada por Supabase;
- session ids técnicos/telemetría;
- estado local no sensible cuando corresponda.

Antes de Beta:
- auditar localStorage/sessionStorage/cookies;
- documentar claves;
- eliminar datos legacy;
- decidir qué debe sobrevivir logout.

## 15. Retention matrix — pendiente F14

No fijar períodos inventados.

Debe cerrarse para:
- auth/account;
- UGC;
- deleted UGC;
- documents;
- rescue sightings/contact;
- care;
- telemetry;
- logs;
- backups;
- payment references.

## 16. Provider register

| Proveedor | Uso | Estado | Datos | Acción pre-Beta |
|---|---|---|---|---|
| Supabase | Auth/DB/Storage/Edge | Activo | múltiples categorías | retención/backups/Auth audit |
| Mapbox | mapas | Activo | requests/location-context según uso | usage/privacy/spend review |
| PayPal | Supporter | Parcial/desactivado en UX | subscription/payment metadata | secrets + real webhook + terms |
| PostHog | observabilidad | Conectado + privacy-hardened; 0 eventos live | eventos allowlisted/exceptions | env token + first event/error + destination/alert |
| Vercel | hosting/deploy | conector visible pero 0 teams/proyectos | deployment/log metadata | conectar cuenta/proyecto correcto antes de auditar env/spend |

Cualquier proveedor nuevo debe añadirse aquí antes de recibir datos de producción.

## 23. F14 D3-A — Limpieza de medios moderados, código preparado/no desplegado

El futuro servicio Edge `f14-moderation-purge` usará JWT de moderador validado por Auth, service_role solo en el servidor, kind/UUID del contenido retirado y ruta exacta de objeto recuperada desde DB interna; no se envían URLs, paths o datos personales a analytics ni logs de consola. Se verificará eliminación del origen con API Storage y dos probes HTTP, pero la invalidación global de CDN debe validarse y explicarse por separado. La interfaz permanece desactivada por defecto, SQL aún no aplicado y no se borraron objetos durante este lote. Sólo publicaciones Feed/Comunidad con propietario y referencia únicos; `pet_profile` y datos legacy requieren revisión manual. No añade proveedor.

## 24. Solicitud de eliminación de cuenta (código preparado, no aplicado)

Se planificó tabla privada con `subject_user_id` y estado/tiempos operativos, sin email ni descripción libre; RLS enabled y 3 RPC propias sin argumentos de user ID. Proveedor Supabase ya existente. No se ha activado ni recogido ninguna solicitud a través de esta interfaz. Conservación y procedimiento definitivo requieren acuerdo de política antes de Beta.

### 24.1 Estado real de solicitudes (2026-10-10 UTC)

Supabase tiene instalada la tabla privada `account_requests_private.deletion_requests` con `subject_user_id` y marcas temporales/estado. Tres RPCs de consulta/solicitud/cancelación validan `auth.uid()`; no exponen la tabla a clientes. Tras instalación y pruebas con `ROLLBACK` hay **0 solicitudes persistentes**. Todavía no se habilitó UI en la Beta ni existe worker autorizado para ejecutar eliminación. Retención, auditoría y borrado real permanecen decisiones pendientes.

### 24.2 Preflight de eliminación sin mutación

La consulta admin `supabase/queries/f14_account_deletion_preflight_READ_ONLY.sql` cuenta dependencias por UUID interno solo para solicitudes propias registradas como `requested`. No registra emails, nombres de personas, documentos ni URLs en analytics, logs o salida pública. Cuenta relaciones externas de comunidades/Feed, documentos, moderación y objetos de Storage. No se publicó RPC de consulta a usuarios; el reporte es interno y no ejecuta eliminación. El frontend de solicitud/cancelación se habilita solo en entorno local `DEV`; producción sigue apagada. Los datos de prueba se mantienen.

### 24.3 Continuidad de comunidad en eliminación de cuenta

La migración propuesta NO APLICADA añade una tabla privada con IDs internos del grupo/propietario/admin candidato y plazos de transferencia (7 días), sin contenido ni email. Solo admin destinatario y owner pueden consultar una oferta; aceptación requiere JWT propio; nadie fuera del servidor puede archivar. Las comunidades archivadas conservan contenido de terceros en la base, pero no son públicas bajo la RLS vigente. No se habilita recolección nueva ni migración en este lote.

### 24.4 Transferencia consentida y archivo (propuesta aún inactiva)

La migración de continuidad añade a `community_private` únicamente metadatos de oferta (IDs internos del grupo/propietario/admin destinatario y fecha de vencimiento) y propuesta de relación de propietario nullable solo para archivo. El administrador designado no recibe poderes amplios de moderación ni acceso a archivos: solo puede aceptar/rechazar una transferencia destinada a su UUID bajo sesión autenticada. Comunidad archivada permanece en DB, con el contenido ajeno intacto, pero oculta bajo las RLS de lectura actuales. El ciclo de vida definitivo y la migración no han sido activados. Sin retención nueva de email, documentos ni analytics.

### 24.5 Estado real de continuidad — 2026-10-10

Instalada migración `20261010053708_f14_community_ownership_continuity` y tabla privada `community_private.ownership_transfer_offers`; 0 ofertas persistentes tras QA reversible. La tabla contiene IDs de comunidad, antiguo propietario y admin candidato, marcas de tiempo y estado; sin emails ni contenido. La interfaz de candidatura/aceptación solo se expone en QA local DEV y la aplicación productiva permanece con gate desactivado. Sin cambios ni borrado de contenido social o Storage en la instalación.

### 24.6 Integridad del borrado de cuenta — 2026-10-10

El preflight analiza interacciones Feed originadas por terceros (explícitas e impresiones), likes de comunidad, inconsistencias de autor de mascotas, media claims y URLs de medios sin equivalencia exacta en Storage. No se instrumentan nuevos eventos ni se exportan URLs/cuerpos/identidades. Los reportes agregados se reservan al operador. La revisión de seis cuentas detecta 8 referencias no verificadas y exige conciliación antes de cualquier borrado. No hay cambios permanentes al backend en este lote.

### 24.8 Hilos con autor eliminado: política aprobada, draft NO aplicado

La estructura propuesta `author_deleted_at` conserva únicamente el identificador de hilo, estado de anonimización, fecha y referencias a comentarios ajenos; reemplaza texto, imágenes, nombres, ubicación, etiquetas y metadatos de autor por valores neutrales. La baja de Auth/mascota no debe destruir esas respuestas por cascada. Los nuevos triggers impiden interacciones posteriores, incluyendo escrituras directas sin interfaz. La redacción sólo podrá usarse como parte de una solicitud de eliminación `processing` con Storage y archivos externos verificados fuera de SQL. No se ha instalado la migración ni borrado usuarios, comentarios ni medios. Seguridad de datos de terceras personas y procedimiento final de solicitudes siguen pendientes antes de beta pública.

## Contacto de privacidad y soporte (2026-10-10)

El PO aprobó publicar **appdigital.corp@gmail.com** como correo receptor de consultas de privacidad y soporte en PAZO. El valor del buzón es público por decisión explícita; **el UUID de la cuenta Auth que lo administra, las contraseñas, los correos entrantes y los metadatos de solicitudes siguen siendo privados**. Los correos enviados por usuarios pueden contener nombre, email, relato y documentación privada: recepción y lectura humana bajo acceso mínimo al proveedor de correo, sin telemetría ni almacenamiento adicional creado por el código de PAZO. Solo se incluye un enlace `mailto:`, **no hay envío automático ni integración de Gmail**. Retención y posible eliminación de conversaciones de soporte siguen pendientes para la política pública. El correo no acredita que el procedimiento de eliminación de cuentas esté terminado.

## Reconciliación adicional de terceros (2026-10-10)

Auditoría de código independiente de la prueba de Codex: `src/components/views/OnboardingView.tsx` carga una imagen externa desde `images.unsplash.com` en la bienvenida A01. Añadir Unsplash/CDN de imagen como **recurso de terceros identificado en código**, con posibles metadatos técnicos de solicitud del navegador; no se verificaron políticas/retención de ese host ni se modificó el diseño. `src/services/observability.ts` transmite eventos a PostHog solo si existe token VITE, pero `captureException` incluye mensajes/stack/componentStack con redacción basada en patrones limitados; **no declarar anonimización completa**. Ambos requieren cierre de privacidad previo a beta; detalles en `docs/PAZO_MVP_PRIVACY_OPERATIONS_RECONCILIATION_20261010.md`.


### F16 — Retención 90 días (aprobada, aún sin datos alojados)

El PO aprobó 90 días para identificadores de webhooks **tras conciliación definitiva**, sin borrado automático de pendientes/disputados. La migración F16 todavía no aplicada incluye `retention_hold=true` por defecto y `retention_released_at` para impedir eliminación antes de la conciliación validada. Solo existe vista previa de conteos, sin DELETE ni tareas programadas. Pagos, devoluciones, disputas, reversos y demás metadatos financieros mantienen plazo de conservación pendiente. Fuente `docs/PAZO_F16_RETENTION_APPROVED_GATE_20261013.md`.


### F16 — Ledger PayPal únicamente en pruebas aisladas

Se preparó **solo SQL de laboratorio**, no instalado en Supabase alojado: `paypal_payment_entries` (ID opaco de pago, ID opaco de suscripción, owner UUID de fixture, plan, USD, monto en centavos, fecha y estado bloqueado/no acreditado) y `paypal_payment_reversals` (ID opaco de pago, tipo y fecha de reversión). Ningún nombre, correo de PayPal, tarjeta, payload completo ni secreto. En caso de reversión previa, el registro del pago queda bloqueado. **No se están recolectando datos reales mediante este prototipo.** Retención financiera, vínculo real de identidad, baja de cuenta y obligación contable siguen pendientes; la retención aprobada de 90 días aplica solo a webhooks conciliados. Evidencia: `docs/PAZO_F16_FINANCIAL_LEDGER_LAB_GATE_20261013.md`.


### F16 — Intenciones de suscripción (solo prototipo sintético)

Prototipo de PostgreSQL descartable `paypal_subscription_intents`: identificador de correlación, UUID Auth del propietario, proveedor `paypal`, plan Sandbox, estado y referencia opaca de suscripción tras vinculación. Se utilizan **únicamente IDs y dueños sintéticos** de pruebas; ninguna colección ni almacenamiento nuevo en Supabase alojado. Deben crearse desde una sesión Auth verificada en backend y contrastarse con la API PayPal antes de guardar; no confiar en metadatos editables ni en valores del navegador. Sin nombres reales, correos, documentos, datos de tarjeta, importes por usuario, beneficios ni cobertura. **Retención/expiración de intenciones todavía no decidida**, distinta de los 90 días aprobados para webhooks conciliados. Fuente: `docs/PAZO_F16_OWNER_BINDING_LAB_GATE_20261013.md`.


### F16 — Migración financiera preparada, NO desplegada (2026-10-14)

Se crearon en GitHub, exclusivamente como **migraciones NO aplicadas**, la inbox de eventos y las tablas privadas `paypal_subscription_intents`, `paypal_payment_entries` y `paypal_payment_reversals`, con IDs opacos de PayPal, UUID propietario, estado, plan USD 2.99, monto/currency, sellos temporales, y relación privada de evento-pago. Un SQL RPC server-only cierra evento+pago o evento+reverso en una transacción, sin cobertura, sin email PayPal, tarjetas, nombres, ubicación, IP, cuerpo de webhook ni credenciales. Los ensayos usan IDs sintéticos. Alojado: **no se están recolectando estos datos** porque no están instaladas las nuevas tablas. No se hizo ninguna petición real de creación de suscripción. La política de 90 días solo afecta IDs de webhook conciliados con hold levantado; **los plazos de intentos y registros financieros siguen sin aprobar**. Antes de lanzar, integrar F14 account deletion y justificar retención contable. Ver `docs/PAZO_F16_SANDBOX_RELEASE_GATE_20261014.md`.
