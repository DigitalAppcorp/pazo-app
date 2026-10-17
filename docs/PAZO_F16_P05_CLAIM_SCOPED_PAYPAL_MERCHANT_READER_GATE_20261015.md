# PAZO F16-P05 — Lector merchant PayPal Sandbox limitado a un claim (DRAFT)

**Fecha:** 2026-10-15. **Estado:** CI técnica verificada, laboratorio offline, NO desplegado. PO autorizó continuar la preparación de procedencia y pruebas con «Ok dale», no ejecutar cambios en Supabase alojado ni cobrar, crear suscripciones, activar membresías o procesar el buyer Sandbox histórico. Rama `f13/section-titles-20261012`; PR #44 DRAFT. PAZO central continúa gratuito, Amigo de PAZO es opcional.

## Integración entregada

Nuevo `supabase/functions/f16-paypal-webhook/p05SandboxClaimScopedMerchantReaders.mjs` y `src/features/supporter/testing/f16P05SandboxClaimScopedMerchantReaders.test.mjs`.

La fábrica `createP05SandboxClaimScopedMerchantReaders({clientId,clientSecret,readClaimedEvent,fetchImpl})` usa **exclusivamente** `https://api-m.sandbox.paypal.com`, con:

- `getMerchantEvent({eventId,claimToken})`: comprueba que la RPC privada `readClaimedEvent` devuelva **ese ID exacto**, tipo `PAYMENT.SALE.COMPLETED`, `processing`, `verifiedAt` UTC; obtiene OAuth de Sandbox (POST de token, no compra); ejecuta `GET /v1/notifications/webhooks-events/{eventId}`. Valida que la respuesta Merchant tenga el ID original, tipo, referencia venta y `billing_agreement_id`, estado completado y USD 2.99.
- `getMerchantSubscription({subscriptionId,eventId,claimToken})`: vuelve a validar la reserva y GET del mismo evento; **solo acepta consultar la suscripción nombrada en `resource.billing_agreement_id`**, nunca una ID elegida libremente. Ejecuta `GET /v1/billing/subscriptions/{id}` con OAuth Sandbox; comprueba sub ID, plan, `custom_id` y estado.
- Ambas lecturas producen **proyecciones mínimas** sin email, datos de pagador, contacto, token, raw payload ni URLs externas; los fallos HTTP, JSON y adaptadores se traducen a errores fijos sin detalles privados. Nunca se siguen URLs de `links` recibidos de PayPal. Sólo token OAuth es POST; no hay POST de subscription, capture, cancel, refund, reenvío ni mutación.
- Se actualizó `p05OfflineMerchantClaimBridge.mjs` para pasar `eventId + claimToken` en **ambos** lectores (el puente antes omitía el token) y el test correspondiente. Integración de laboratorio `p05OfflineInboxOrchestrator → claim/read → merchant GET mock → inverse private intent mock → finish(review)`. Un caso positivo termina en `review/cycle_unproven`, **jamás** `processed`, `payment entries`, `paidThrough` o `mayGrantBenefits`.

Documentación actual de PayPal: `GET /v1/billing/subscriptions/{id}` entrega `id,plan_id,custom_id`; el GET de webhook por ID recupera el evento del proveedor; **ninguno de estos GET equivale a revalidar la firma criptográfica original**. La verificación de firma debe haber ocurrido al recibir el webhook y la RPC del inbox sólo debe permitir eventos de ingreso firmados y reclamados mediante token vigente. Referencias: https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/ ; https://developer.paypal.com/api/rest/webhooks/rest/ .

## Qué demuestra este gate y qué no

**Demuestra en laboratorio:** el acceso al merchant está acotado a un claim privado y al `billing_agreement_id` del evento; se rechazan IDs extraños, eventos de otro tipo, plan/custom_id incorrectos, errores de conexión, montos incompatibles y fugas de PII en los resultados. GitHub CI y F16 Disposable PostgreSQL Lab **SUCCESS** en commit técnico `3b615c54eb5389146d4cb7ed47bd2b1c525887b0` (verificado).

**No demuestra en runtime:** las funciones de claim/inverse lookup todavía son SQL `DO_NOT_APPLY`; `readClaimedEvent` sigue siendo una dependencia inyectada que en pruebas es mock; PayPal OAuth/GET son simulados, no solicitudes reales. Este adaptador no comprueba pagos históricos exhaustivos, ausencia de fallos/deuda, reversals, disputes ni un merchant `saleId→obligación REGULAR`; tampoco firma ni audita un ledger. Una coincidencia es exclusivamente correlación de fuente, no atribución financiera.

## Gate siguiente y disciplina de alcance

Para obtener **nueva información probatoria** (en vez de más laboratorios aislados), hará falta una autorización PO específica para instalar las RPC mínimas en un ambiente Sandbox controlado, configurar el proceso privado y hacer **solo lecturas** de eventos futuros con el permiso adecuado, sin reabrir la compra cancelada ni habilitar pagos. En paralelo, revisar retención legal/contable, emisión de acuses y cancelación en línea antes de cualquier cobro real. La instalación hosted, el deploy, la ejecución PayPal auténtica y eventual ledger/beneficios siguen siendo decisiones y gates independientes. No presentar CI PASS como permiso de despliegue.
