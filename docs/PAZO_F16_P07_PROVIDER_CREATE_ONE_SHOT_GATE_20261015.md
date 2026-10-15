# PAZO F16-P07 — One-shot provider create claim (Sandbox ONLY, not deployed)

**Fecha:** 2026-10-15. Branch `f13/section-titles-20261012`, PR #44 DRAFT. PO dijo «ok sigue», autorizado código y laboratorio, NO SQL alojado, PayPal POST real, migración, Edge, Live, beneficios, ni nuevas compras QA.

## Motivo y cambio implementado

P06 conservaba consentimiento idempotente por `(ownerId,requestKey)`, pero en estado `pending` su orquestador podía emitir OTRO `POST /v1/billing/subscriptions` cuando se perdía una respuesta PayPal. Un mismo `PayPal-Request-Id` ayuda, pero no constituye garantía durable global de que no haya suscripciones duplicadas.

**Fail closed P07:** En el SQL desechable P06, `paypal_p06_checkout_attempts.provider_create_claimed_at` empieza en NULL. Una RPC privilegiada `f16_p07_claim_provider_create(owner,key,intent)` realiza bloqueo por owner, verifica el vínculo original y el estado `pending` y registra en transacción **exactamente una** autorización de creación. Solo el primer caller con `true` pasa a PayPal. Al fallar red/GET/bind o reiniciarse el proceso, siguientes intentos devuelven `false` y el checkout responde `checkout_requires_manual_recovery` sin nuevo POST. Una reserva consumida no se borra automáticamente. El módulo `p06CheckoutConsentStore` llama a la RPC con clave de servicio **solo servidor**; `p06SandboxVerifiedCheckout` exige el claim antes de `subscriptionCreator.create`. Los cambios están SOLO en el borrador PostgreSQL `DO_NOT_APPLY` y código inactivo.

## Alcance y límites

- Asegura **a lo sumo un intento iniciado por este checkout** para owner/key/intent, siempre que el servidor use esta RPC y la instalación real preserve sus garantías transaccionales. No puede certificar resultados de PayPal, ausencia de suscripciones ajenas, retries de infraestructura diferentes ni cobertura histórica.
- La recuperación manual deberá usar merchant GET/lecturas privadas autenticadas y correlación con `custom_id`/intent; si no hay prueba suficiente, mantener bloqueado, no liberar la reserva ni reintentar a ciegas.
- El índice `p06_one_checkout_per_owner` sigue bloqueando resuscripciones incluso después de cancelar. Para habilitarlas hace falta **otro gate** que diseñe ciclo/consentimiento nuevo, cierre financiero anterior y prevención de paralelismo entre versiones. No levantar el índice sin contrato.
- No publicar oferta legal sintética ni autorizar checkout por bandera de entorno. Nada concede `paidThrough`, `mayRecordPayment` ni `mayGrantBenefits`. La aprobación de PayPal no es pago verificado.
- El draft incluye `REVOKE ALL FROM PUBLIC,anon,authenticated` y `GRANT EXECUTE service_role`; hosted default grants requieren auditoría tras instalación **solo con GO PO explícito**.

## Pruebas

`f16P06Checkout.test.mjs`: claim primero; pérdida de respuesta, repetición, carreras en orquestador y rechazo sin claim.
`p06-durable-checkout-consent-synthetic.sql`: permisos RPC y claim atómico one-shot con claves/propietarios distintos, persistencia, rechazo tras bind.

**Gate siguiente:** confirmar CI general y PostgreSQL Lab de este HEAD; revisión de términos ES/EN, cancelación/retención, origen merchant, nueva migración Sandbox autorizada por PO y prueba real controlada, sin reusar los 8 eventos QA históricos.
