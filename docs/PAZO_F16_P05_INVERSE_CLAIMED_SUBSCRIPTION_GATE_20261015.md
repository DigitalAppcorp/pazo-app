# PAZO F16-P05 — Consulta inversa merchant → intención privada BOUND (DRAFT)

**Fecha:** 2026-10-15. **Autorización PO «ok dale»:** preparar y verificar la consulta inversa y su puente offline; **NO** aplicar cambios a Supabase alojado, operar PayPal, habilitar worker, registrar dinero o conceder beneficios. Rama `f13/section-titles-20261012`, PR #44 DRAFT.

## Hechos reales confirmados por auditoría READ-ONLY

La tabla alojada `supporter_private.paypal_subscription_intents` ya tiene `intent_id` PRIMARY KEY, `external_subscription_id` **UNIQUE**, `owner_id`, `provider='paypal'`, `state`, `plan_id` y `bound_at`; una restricción obliga a que las intenciones BOUND tengan `external_subscription_id` y `bound_at`, y las pending no. El inbox firmado `supporter_private.paypal_verified_event_inbox` contiene ID/tipo/verified_at, pero **no** el ID de suscripción ni el usuario. La función existente `f16_paypal_read_private_intent` consulta por intent ID, no al revés. Las RPC reales de F16 otorgan EXECUTE a service_role únicamente.

Esta es una **auditoría de catálogo**; no se leyó información personal ni se alteró una fila de producción.

## Implementación en rama, no instalada

`supabase/drafts/f16_p05_claimed_subscription_inverse_lookup_DO_NOT_APPLY.sql` vive fuera de migrations y aborta salvo en la DB desechable `f14_synthetic` con sesión `f14_admin` y rol `postgres`.

Define `public.f16_p05_draft_resolve_claimed_subscription(event_id,claim_token,merchant_subscription_id,merchant_custom_intent_id)`:

1. Requiere que **ese evento exacto** esté registrado, sea `PAYMENT.SALE.COMPLETED`, permanezca `processing`, tenga el token de lease correcto y no vencido, y que `p05_inbox_worker_gate` esté habilitado con cutoff prospectivo.
2. La suscripción proporcionada por el servicio debe coincidir con `external_subscription_id` de una intención `BOUND` de PayPal. También debe coincidir el `custom_id` proporcionado por PayPal con el `intent_id`; verifica owner, plan y `bound_at`.
3. Devuelve únicamente `intentId`, `ownerId`, `planId`, `subscriptionId`, `state` si todo coincide; en caso contrario, SQL devuelve NULL. **No modifica** inbox, ledger, reversals, aceptación ni entitlements.
4. `SECURITY DEFINER`, `search_path=''`, `VOLATILE` (lease con tiempo real); revoca EXECUTE de PUBLIC/anon/authenticated en la misma transacción y concede sólo a service_role. No añade SELECT general sobre tablas privadas.

El diseño **no certifica criptográficamente** que los dos argumentos merchant pertenecen al contenido del evento: una llamada de servicio a PayPal `GET /v1/notifications/webhooks-events/{eventId}` debe proporcionar `resource.billing_agreement_id`, y `GET /v1/billing/subscriptions/{id}` debe devolver `id/plan_id/custom_id` concordantes; debe existir recepción firmada verificada previamente. Una clave de servicio comprometida puede abusar de la RPC; requiere ejecución exclusivamente en un worker interno con trazas de procedencia minimizadas y sin argumentos desde frontend. No confundir `resource.billing_agreement_id` con comprobante de primer período.

`supabase/functions/f16-paypal-webhook/p05OfflineMerchantClaimBridge.mjs` implementa únicamente la *composición lógica inyectable* de esas dos lecturas merchant y la búsqueda inversa. `p05OfflineInboxOrchestrator.mjs` pasa el `claimToken` del evento al bridge; por defecto el puente no devuelve datos privados, sino `{kind:'sale_correlated_candidate'}` o rechazo/reintento de código fijo. Incluso en el caso correcto, el orquestador concluye `review/cycle_unproven`. **Sin pagos ni beneficios.**

## Pruebas

- `supabase/tests/supporter/p05-claimed-subscription-inverse-security.sql`: ejecutabilidad service-only, ausencia de SELECT directo y función sin overloads.
- `supabase/tests/supporter/p05-claimed-subscription-inverse-synthetic.sql`: BOUND correcto; deshabilitado; lease inexistente, vencido, sustituido, evento histórico, IDs cruzados, pending, `bound_at` ausente; ninguna escritura financiera.
- `src/features/supporter/testing/f16P05OfflineMerchantClaimBridge.test.mjs` y ajuste de `f16P05OfflineInboxOrchestrator.test.mjs`: validación del event GET, subscription GET custom_id/plan y match de RPC, extranjeros, datos personales sintéticos y orquestación de un candidato sin crédito.
- `.github/workflows/ci.yml` ejecuta el SQL en PostgreSQL desechable. **No existen** OAuth reales, llamadas a servicio alojado ni trabajadores instalados en estos tests.

## Limitaciones antes de GO hosted

Persisten: fuente de procedencia **real**, firma original de webhooks, tiempo/orden/cobertura completa de eventos, ausencia de deudas o reintentos, refunds/disputas, atribución primer ciclo regular a obligación PAZO, retención contable/legal/privacidad P01–P04/P09, términos/acuse/cancelación en línea y aprobación PO separada para migración formal y deploy. Ninguna coincidencia de IDs concede `paidThrough`.

**Estado:** F16 NO-GO, PR #44 DRAFT, PAZO núcleo gratis, Amigo de PAZO opcional; el buyer Sandbox cancelado y los ocho eventos QA históricos permanecen fuera de alcance.
