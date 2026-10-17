# PAZO F16-P05 — Lector merchant Sandbox server-only (NO DESPLEGAR)

**Fecha:** 2026-10-15. **Fase:** F16-P05, PR #44 DRAFT. El PO dio «ok go» para avanzar el gate de lectura autenticada de evidencia, no para crear/cobrar suscripciones ni aplicar SQL/backend. Todos los efectos financieros continúan NO-GO. La app PAZO es gratuita; Amigo de PAZO es apoyo opcional.

## RPC de intención privada YA EXISTENTE, auditada en hosted de solo lectura

Se comprobó mediante consulta `SELECT pg_get_functiondef` que `public.f16_paypal_read_private_intent(p_intent_id text)` existe, es `SECURITY DEFINER`, `search_path=''`, requiere `intent-UUIDv4`, devuelve `jsonb` con `id`, `owner_id`, `plan_id`, `state`, `external_subscription_id`; `EXECUTE` para `service_role` solamente, denegado a `anon/authenticated`. Ninguna mutación fue ejecutada en esta auditoría.

Nuevo módulo `supabase/functions/f16-paypal-webhook/p05ServerOnlyBoundIntentReader.mjs`: lector inactivo que **reutiliza esta RPC existente**, con endpoint exacto `https://mrybvqdebbgcayuvgkkr.supabase.co/rest/v1/rpc/f16_paypal_read_private_intent`, clave `service_role` solo server y `fetchImpl` inyectable. Valida intent UUIDv4, respuesta exacta esperada, owner UUID, `plan_id` Sandbox fijo, `state:bound` y `external_subscription_id` válido. Proyecta snake_case a `{id,ownerId,provider:'paypal',state,planId,subscriptionId}`; descarta cualquier PII/extra. No habilita OAuth PayPal ni derechos.

`src/features/supporter/testing/f16P05ServerOnlyBoundIntentReader.test.mjs` prueba URL/rol/argumento, salida mínima, valores ajenos, falsos `owner_id`, intent pendiente, respuesta null y excepciones con secretos que se convierten a error fijo; **solo mocks**. Puede servir como callback `readTrustedBoundIntent` del lector merchant **dentro de futuro worker interno autenticado**, no desde navegador.

**Bloqueo decisivo:** no existe aún una interfaz `service_role` de **lectura privada del inbox firmemente acotada al evento, con claim/locking de estado**, como `readTrustedInboxRefs`. No conceder acceso SELECT amplio a `service_role` ni crear una función `SECURITY DEFINER` pública sin revisar autenticación, ownership e idempotencia; requiere propuesta SQL versionada y aprobación PO específica.

## Implementación añadida en GitHub, sin ejecución sobre PayPal real

- `supabase/functions/f16-paypal-webhook/p05SandboxMerchantEvidenceReader.mjs`: fábrica `createP05SandboxMerchantEvidenceReader` de servidor **no conectada** a la Edge Function, UI, worker ni cron. Usa endpoint fijo **`https://api-m.sandbox.paypal.com`**. Proporciona función `inspect({intentId,saleEventId})`; nunca acepta `subscriptionId` del navegador como fuente del merchant.
- **Scope real futuro obligatorio:** resolver `intentId` desde la tarea interna autorizada, `readTrustedBoundIntent({intentId})` por RPC privada service-only; comprobar `id/state bound/provider/owner UUID/subscriptionId/planId`. Luego `readTrustedInboxRefs({intentId,subscriptionId,saleEventId})` por canal de servicio que acceda al inbox previamente **firmado en ingreso**. Solo procesar refs verificados y en estado `processing/processed`. Ambas funciones son **interfaces inyectables**, todavía simuladas; que un mock diga `processing` no es firma criptográfica.
- **GET PayPal previstos:** POST a `/v1/oauth2/token` exclusivamente para obtener token (no cargo), seguido de GET subscription, GET transactions con ventana máxima de 31 días y GET event por cada ID del inbox hasta un máximo de 20. Ningún endpoint de `capture`, `create subscription`, `refund`, `cancel` ni otros cambios. La documentación oficial lista endpoints de Subscriptions v1: https://developer.paypal.com/api/subscriptions/v1 y webhooks https://developer.paypal.com/subscriptions/webhooks .
- **Correlaciones internas:** suscripción `id/plan_id/custom_id/status` con intención; `PAYMENT.SALE.COMPLETED.resource.id` contra `transaction.id`; `billing_agreement_id` contra subscripción; `state/amount` USD 2.99 en ambas fuentes. Valida timestamp con milisegundos y los IDs/tipos del evento GET contra inbox firmado. Cualquier discrepancia lanza **error de código fijo** sin imprimir secretos ni cuerpo merchant.
- **Minimización:** respuesta guarda solo `id/plan_id/custom_id/status` de suscripción, venta/evento mínimo, transacción mínima y tipos de eventos observados. Excluye nombre, correo, datos del pagador, URL aprobaciones, tokens, raw body, tarjeta. Las refs permanecen en el resultado **server-only**; no retornarlas a UI ni loggear el objeto completo.
- **Cobertura de datos:** `merchantWindowMetadataComplete` es como máximo coherencia de los metadatos de **la ventana solicitada** (cuando PayPal proporciona `total_pages=1`, `total_items`, `links`, sin next); `webhookJournalComplete:false`, `financialHistoryComplete:false`, `refundsDisputesCoverageComplete:false` SIEMPRE, ya que un subconjunto de refs firmadas y GETs no demuestra ausencia de otros eventos o futuros reversos.
- **Bloqueo absoluto:** `cycleVerified:false`, `paidThrough:null`, `mayRecordPayment:false`, `mayGrantBenefits:false`, `dbWrites:0`, `networkPaymentWrites:0` en la respuesta. La obtención de OAuth mediante POST **no** es cobro, pero sí requiere configuración/permiso de acceso antes de instalar en servicio.

## Pruebas sintéticas e independencia de backend

`src/features/supporter/testing/f16P05SandboxMerchantEvidenceReader.test.mjs` simula `fetchImpl` con respuestas PayPal v1, no llama PayPal real, incluye PII falsa que no debe salir. Verifica host fijo/solo OAuth POST + GET, scope desde private intent, omisión total de subscriptionId del cliente, token no filtrado, cambios de sub/plan, ID de webhook/refund, pago incompleto, duplicate/monto, timestamps de PayPal con milisegundos, paginación ausente y fallos al recibir eventos extranjeros.

**No se ha hecho** integración de `readTrustedBoundIntent` ni `readTrustedInboxRefs` con un RPC real, captura de historial completo, ampliación legal de retención, ni escritura de bases. El código sigue INACTIVO; CI verde verifica únicamente ejecución offline con mocks y PostgreSQL desechable.

## Próximo gate concreto

1. Auditoría del actual RPC de lectura de intención y permiso de inbox; definir un orquestador interno autenticado y *scope* seguro para procesar refs del inbox. Evitar que una llamada HTTP del usuario pueda elegir `intentId` ajena o ID de venta.
2. Establecer captura verificable de eventos desde el comienzo de futuras suscripciones, out-of-order, reintentos, deuda y cobertura mínima para disputar/refund, respetando categorías de retención P01–P04/P09 y requisitos de California.
3. Integrar el lector con `p05SourceSaleCorrelationLab` / `p05FirstRegularObligationLab` mediante proyecciones **source-attested** server-only; incluso entonces no generar `paidThrough` sin GO operativo para ledger/beneficios.
4. Revisión legal, términos, cancelación en línea, confirmación conservable; después gates específicos de migración y deploy. Sin repetir la compra Sandbox previa.

**Invariantes:** Sandbox histórico cancelado, sin período acreditado, `paidThrough:null`, ledger 0 (última lectura); no SQL hosted, nuevos buyers, PayPal Live ni beneficios.
