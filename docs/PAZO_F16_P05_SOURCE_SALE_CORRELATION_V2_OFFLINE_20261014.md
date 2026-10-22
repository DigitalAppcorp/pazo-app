# PAZO F16-P05 — Source correlation v2 / evidencias externas (laboratorio)

**Fecha:** 2026-10-14. **Estado:** código+tests sintéticos nuevos; todavía NO hay source attestation de pago regular inicial en runtime, ni permiso para aplicar SQL, escribir ledger, reabrir checkout, crear suscripción o dar beneficios. [PR #44](https://github.com/DigitalAppcorp/pazo-app/pull/44) DRAFT, rama `f13/section-titles-20261012`. PO «ok go» autoriza avanzar en la verificación y preparación de próximo gate offline.

## Fuente exacta de los campos, sin inferir evidencia inexistente

Documentación PayPal Subscriptions v1 (consulta oficial en 2026):
- Subscription merchant GET: `GET /v1/billing/subscriptions/{id}` muestra `id`, `plan_id`, `custom_id` y status. https://developer.paypal.com/api/subscriptions/v1/subscriptions-get/
- Transactions merchant GET: `GET /v1/billing/subscriptions/{id}/transactions` devuelve `transactions[].id`, status, timestamp `time`, `amount_with_breakdown.gross_amount`. https://developer.paypal.com/api/subscriptions/v1/definitions/transaction/
- Refetch de evento: `GET /v1/notifications/webhooks-events/{id}` + estado de recepción firmado. El `PAYMENT.SALE.COMPLETED` legado incluye `resource.id`, `resource.billing_agreement_id`, `resource.state` y `resource.amount.total/currency`; esto ya estaba implementado en `f16SandboxSaleWebhookComparator.mjs`. Referencia PayPal https://developer.paypal.com/api/rest/webhooks/rest/ .
- El inbox existente `supporter_private.paypal_verified_event_inbox` almacena `provider_event_id`, `event_type` y `verified_at`, no el cuerpo. Eso es suficiente para buscar el mismo evento por ID vía OAuth merchant; **refetch no verifica criptográficamente la firma del mensaje recibido inicialmente**. Se confía en el boundary de ingress que ya validó la firma y guardó el ID/tipo.

## Código del gate nuevo

`supabase/functions/f16-paypal-webhook/p05SourceSaleCorrelationLab.mjs` exporta `createF16P05SourceCorrelationInspector`. Es solo laboratorio con 6 adapters async **inyectables**:

1. `resolveOwnerFromVerifiedSession(requestContext)` — identifica owner; no confía en ownerId enviado por cliente.
2. `readBoundIntent({ownerId,intentId})` — asegura Auth owner, plan y subscription privada BOUND.
3. `readSignedInboxEvent({eventId,eventType:'PAYMENT.SALE.COMPLETED'})` — evento de tipo venta registrado y no en cuarentena.
4. `getMerchantWebhookEvent({eventId})` — refetch OAuth del **mismo** PayPal event ID, resource sale y agreement.
5. `getMerchantSubscription({subscriptionId})` — `id/plan_id/custom_id` concordantes con intención.
6. `listMerchantTransactions({subscriptionId})` — transaction ID coincidente con `resource.id` exactamente una vez, `COMPLETED`, monto exacto USD2.99.

Errores, estado incompleto, venta extranjera, evento equivocado, valor/USD distinto, transacción pendiente/refunded, owner diferente, ID duplicado o respuesta inválida: `REVIEW_REQUIRED`. Respuestas nunca exponen UUID/IDs del merchant, PayPal payer/contactos, tokens ni tiempos privados. Se usan datos sintéticos, **NO** OAuth ni SQL alojados.

**Salida más favorable: `SALE_CORRELATION_CANDIDATE_ONLY`, siempre `sourceAttributionVerifiedByThisCode:false`, `providerSignatureVerifiedByThisCode:false`, `originalRegularCycleProven:false`, `cycleVerified:false`, `paidThrough:null`, `mayRecordPayment:false`, `mayCreatePaidPeriod:false`, `mayGrantBenefits:false`.** Una consulta de transacciones dentro de una ventana no demuestra historial completo ni ausencia de reversals.

Test `src/features/supporter/testing/f16P05SourceSaleCorrelationLab.test.mjs`: cadenas concordantes y muchos contraejemplos, incluida inyección de PII/credenciales en respuestas; el suite `npm run test:f16:synthetic` la ejecuta automáticamente por glob. No importarlo desde Edge, UI, scripts financieros, triggers o entitlements.

## Qué queda bloqueado para probar el primer ciclo regular

- La igualdad `event.resource.id = transaction.id` + `resource.billing_agreement_id = subscription.id` permite correlacionar **el cobro** con la suscripción, pero **NO** prueba qué `cycle_key`/obligación liquidó, especialmente con reintentos/deuda, fecha futura de cobro, distintos precios, cambios de plan y `setup_fee` omitido.
- `subscription.billing_info.cycle_executions[REGULAR].cycles_completed=1` y última venta tampoco constituyen por sí solos una atestación venta→primer ciclo. Hay que identificar fuente merchant específica auditable o definir mecanismo contractual/server-only de atribución compatible con el plan aceptado y verificar ausencia de deuda/retry/reversals con cobertura completa.
- La actualización SQL draft ya bloquea FKs venta+suscripción y evento+tipo; sin el contenido del evento no impone `event.resource.id = ledger.saleId`. Si se crea un boundary confiable en futuro, persistir **prueba mínima de comparación atestada**, sin raw event/PII, o diseñar una relación compuesta adicional, sujeto a retención/seguridad.
- P05-L ya aprobada: cobro atrasado pertenece a obligación original verificada; nunca suma un mes o 30 días automáticamente. El primer período futuro aprobado usa PayPal activation + next billing **como regla contractual PAZO**, no como período comprobado por PayPal; la cuenta Sandbox histórica no puede convertirse retrospectivamente en período.
- Faltan reglas finales de conservación de comprobantes fiscales y disputes, cierre/anonimización de cuenta, términos/acuse/cancelación online en CA, source attestation runtime, revisión SQL locks e idempotencia.
- Un PR/CI PASS solo prueba código sintético; cualquier GO para instalación hosted, PayPal Sandbox buyer, LIVE o beneficios requiere aprobación explícita independiente del PO.

**Siguiente gate más eficiente:** inspeccionar la fuente PayPal real que permita distinguir pago REGULAR inicial de reintento/deuda en venta original, con lectura merchant autenticada solo de evidencias no sensible y sin repetir compra, y producir condiciones de decisión del producto si PayPal no da cycle ID fiable. Reconciliar política de retención fiscal y cambios de estado. No automatizar ledger/cobertura mientras falte esa prueba.
