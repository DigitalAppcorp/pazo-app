# F16-P38 — comprobación alojada del vínculo de activación (solo lectura)
Fecha: 2026-10-15. Decisión: NO-GO para nueva RPC P38 alojada.

## Hallazgos verificados en información de esquema, sin leer datos personales
- `supporter_private.paypal_verified_event_inbox` tiene `provider_event_id`, `event_type`, `verified_at`, `processing_state` y `p05_claim_token`, entre otros campos operativos, pero **no** `external_subscription_id`, identidad de propietario ni payload de activación.
- `supporter_private.paypal_subscription_intents` conserva `external_subscription_id` y `owner_id`, pero no `provider_event_id` del evento de activación.
- Una revisión de columnas con nombres de evento, suscripción, payload o resource en tablas privadas encontró únicamente referencia de suscripción en `paypal_payment_entries` y `paypal_subscription_intents`, referencia de evento en el inbox y huella seudónima en `p28_historical_read_audit`.
- La lectura P21 de evento reclamado devuelve `id`, `type`, `verifiedAt`, `processingState`, sin autenticación de la relación evento↔suscripción.

## Consecuencia
No existe, entre los campos encontrados, un vínculo SQL autoritativo del evento de activación a la suscripción. Es incorrecto diseñar una función que dé por válida la relación solo porque un caller privilegiado envíe `subscriptionId`.

## Paso seguro propuesto
1. Revisar posibilidad de obtener el evento de activación mediante Merchant GET bajo lease propio y validar que su `resource.id` coincide con la suscripción ya BOUND; demostrar simultáneamente validación de firma del webhook e identidad de comercio.
2. Evaluar un esquema privado mínimo que persista referencia de activación validada en el momento de ingestión, con restricciones únicas, RLS, privacidad y retención, sin registrar payloads o datos de pagador. Esto requiere diseño y GO explícito para DDL alojada.
3. Prueba adversarial PG17 de confusión entre dos suscripciones, dos leases, token caducado y evento no verificado. No autorizar ledger ni `paidThrough` en este gate.

Los eventos históricos P28 siguen diferidos; worker P21, cobros, checkout y beneficios continúan apagados. Ninguna mutación en Supabase fue realizada durante esta revisión.
