> **CORRECCIÓN JURÍDICA PRIORITARIA — 2026-10-14:** California BPC §17602(a)(6) **sí exige** conservar prueba de consentimiento expreso para renovaciones automáticas aplicables por **al menos 3 años O 1 año después de terminar el contrato, el plazo más largo**. No deriva de la regla FTC anulada. Cualquier afirmación histórica de «plazo de consentimiento no definido» en este documento queda SUPERADA; **solo las demás clases** de datos financieros/reversos/retención P01–P04/P09 siguen sin plazo aprobado. La recolección sigue deshabilitada. Fuente https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/ y diseño corregido `docs/PAZO_F16_P05_RETENTION_AND_PROVIDER_PROVENANCE_GATE_20261014.md`. No autorización de borrado automático ni migración hosted.

# PAZO F16-P05 — Contrato de aceptación y captura merchant (solo laboratorio)

**Estado:** diseño/implementación de preflight OFFLINE, no persistencia, no PayPal POST, no Supabase hosted writes. Fecha: 2026-10-14. PO aprobó anteriormente el modelo PAZO períodos de servicio mensuales coordinados con PayPal; todavía NO aprobó el ancla mensual concreta, zona contractual, retención, cambios de plan, ni efectos contables. PR #44 DRAFT, F16 NO-GO.

## Qué problema resuelve este subgate

El ensayo real Sandbox aprobó una única suscripción y su venta USD 2.99, pero `start_time` no se especificó en `POST /v1/billing/subscriptions`, la próxima facturación en el evento histórico no es prueba de fecha final de beneficios y `setup_fee` se omitió del GET. Para suscripciones futuras debemos **capturar evidencia mientras ocurre el flujo** sin añadir un segundo calendario desacoplado del proveedor.

## Secuencia propuesta sin habilitar pagos ni modificar Supabase

1. **Oferta publicada y versionada por PAZO:** servicio opcional, USD 2.99 / mes, frecuencia `MONTH_1`, versión y SHA-256 de términos exactos, versión de divulgación de cancelación y versión de aviso de privacidad. No presentar el producto gratuito como sujeto a pago. Publicación del documento original precede aceptación.
2. **Antes de crear la suscripción PayPal:** usuario autenticado expresa aceptación positiva de las condiciones concretas desde UI sin casilla premarcada. Un futuro servidor utiliza un `getUser` verificado, jamás `ownerId` enviado por navegador, y guarda prueba mínima de la aceptación vinculada al `intentId`/oferta en almacén privado **solo si se aprueba su diseño/migración**. La mera versión de Privacy Notice indica *aviso mostrado*, no consentimiento legal universal.
3. **Crear y BOUND:** utilizar solo las APIs server-authenticated y el `custom_id` vinculado; anotar `create_time` del proveedor y demostrar `offer.publishedAt <= acceptance.acceptedAt <= paypal.createdAt`. Si PayPal no retorna `create_time`, mantener revisión y no fabricar uno desde `subscription.start_time`. Pago del buyer requiere por separado su propia autorización PayPal.
4. **Activación:** webhook firmado comprobado por el boundary ya existente; buscar identidad de evento verificado en inbox y correlacionar mismo `subscriptionId`, `planId`, `custom_id`, `event_time`. `GET /subscriptions/{id}` y `GET /plans/{id}` auténticos deben conservar precio y mensualidad observados. `next_billing_time` se registra como **programación de siguiente cargo**, nunca `paidThrough`.
5. **Snapshot de evidencia privado futuro (NO instalado):** conservar mínimo del contrato/versionado, aceptación y referencia Auth, intención vinculada, plan y calendario devuelto por merchant, provenance del webhook firmado. Cambios se registrarían como nuevas versiones append-only y requerirían idempotencia. No retener tarjetas, email de pagador, payload bruto, OAuth token ni URL de aprobación.
6. **Venta y ciclo: gate independiente:** `PAYMENT.SALE.COMPLETED` se correlaciona con GET merchant y webhook; esa coincidencia sola no determina a qué período de servicio se imputa. Hasta resolver un `cycleKey`, cobertura de refunds/disputas e historia, el servidor NO debe activar beneficios. Cancelar no revoca un período que haya sido demostrado; recuperación de deuda no regala otro mes.

## Contrato técnico preparado

`supabase/functions/f16-paypal-webhook/p05OfflineCapturePreflight.mjs`

`createF16P05OfflineCaptureInspector` es un **preflight de simulación**, con seis adapters solo lectura inyectables:

- `resolveOwnerFromVerifiedSession(requestContext)`
- `readBoundIntent({ownerId,intentId})`
- `readPublishedOffer({planId})`
- `readPrivatePurchaseAcknowledgement({ownerId,intentId})`
- `readMerchantSubscriptionAndPlan({subscriptionId})`
- `readVerifiedActivationFromPrivateInbox({subscriptionId})`

Estos adapters aún NO están conectados al backend real. Los valores `source:VERIFIED_SIGNED_INBOX`, la casilla `explicitlyAcknowledged:true` y el digest de términos no constituyen, por sí mismos, atestaciones: un backend futuro debe verificarlos independientemente y no aceptar material arbitrario desde el cliente.

Rechaza contradicciones de owner, intent, plan, `custom_id`, versiones/huellas de términos, cuota y divisa, snapshots de activación, fechas imposibles, aceptación después de crear el contrato, ausencia de `create_time`, `setup_fee:null`, calendario ausente o contradictorio, respuestas con campos privados inesperados y fallos de cualquier adapter. Los errores no devuelven identificadores ni credenciales.

**Salida máxima:** `OFFLINE_CAPTURE_CANDIDATE`. Siempre `privateSnapshotStored:false`, `termsAcceptanceStored:false`, `providerSignatureVerifiedByThisCode:false`, `ownerVerifiedByThisCode:false`, `cycleVerified:false`, `saleCycleAllocationVerified:false`, `mayRecordPayment:false`, `mayCreatePaidPeriod:false`, `mayGrantBenefits:false`, `paidThrough:null`, `dbWrites:0`, `networkPaymentWrites:0`.

Tests: `src/features/supporter/testing/f16P05OfflineCapturePreflight.test.mjs`, ejecutables con `node --test` en CI. Prueban llamadas a solo las seis interfaces, identidad Auth no confiada al cliente, cronología, versiones, PayPal plan/fees, firma declarada no suficiente, PII, errores en red simulada y matriz adversarial.

## Protección de datos y aprobación aún faltante

La información futura sería **privada sensible de cuenta y pago**. El contrato propone minimización, fuente documentada y registro versionado; **no existe aprobación para recolectarla todavía**. Falta que PO apruebe propósito, plazos P01–P04/P09, borrado legal/reconciliación financiera, DDL versionado, RLS y verificación de seguridad. Ninguna lectura genérica de merchant garantiza ausencia de disputas fuera de ventana de transacciones.

## Próximo gate operativo

Conservar el modelo aprobado y cerrar decisiones de ancla contractual, zona horaria/28–31/DST, modificaciones de términos y soporte de deuda/reintentos. Preparar **migración propuesta pero sin aplicar** solo después de esa decisión y retención. Deberá tener aprobación PO separada antes de persistir consentimientos, ofrecer checkout, lanzar Edge/webhook worker, reconciliar ledger o activar beneficios. La prueba PayPal buyer inicial no se repite.
