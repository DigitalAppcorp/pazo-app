# PAZO F16 — E2E real PayPal Sandbox: RECEPCIÓN FIRMADA PASS (2026-10-14 UTC)

## Gate ejecutado y evidencia directa

**PO informó:** completó la aprobación y la cancelación de una única suscripción desde una cuenta **Personal Sandbox** en el flujo local de prueba. No proporcionó credenciales, aprobación privada ni identificadores de transacción. Estas dos acciones humanas son **evidencia reportada por PO**; ChatGPT no operó PayPal ni verificó directamente vía REST GET el estado actual de la suscripción.

**Supabase hosted, verificación independiente de solo lectura por ChatGPT después de la prueba:**

- Proyecto: `mrybvqdebbgcayuvgkkr`.
- Receptor: `f16-paypal-webhook` **v13 ACTIVE**, firma PayPal autenticada por código vía endpoint de postback y persistencia de referencia mínima después de validación positiva.
- `supporter_private.paypal_verified_event_inbox`: **4 filas**, todas distintas y en `processing_state='pending'`. Los eventos se agrupan por tipo y tiempo, **sin publicar provider_event_id, comprador ni cuerpo del mensaje**:

| Tipo registrado | Filas | verified_at (UTC) |
| --- | ---: | --- |
| `BILLING.SUBSCRIPTION.CREATED` | 1 | 2026-10-14 11:15:28 |
| `BILLING.SUBSCRIPTION.ACTIVATED` | 1 | 2026-10-14 11:15:51 |
| `PAYMENT.SALE.COMPLETED` | 1 | 2026-10-14 11:15:59 |
| `BILLING.SUBSCRIPTION.CANCELLED` | 1 | 2026-10-14 11:16:16 |

- **Logs reales de Edge** para ruta exacta `/functions/v1/f16-paypal-webhook`: **4 POST de v13 respondidos HTTP 202**, con marcas 2026-10-14 11:15:28, 11:15:51, 11:15:59 y 11:16:16 UTC respectivamente. Se excluyen los anteriores smoke tests HTTP 400/405 y despliegues anteriores v7-v12.
- **Justificación de PASS criptográfico:** `core.mjs` de F16 solo devuelve `202 verified_event_queued` cuando (a) PayPal postback verifica firma, y (b) `paypal_verified_event_inbox` confirma inserción durable de referencia/event_type. Los 4 registros agrupados por tipo, sus timestamps coincidentes y las 4 respuestas v13/202 constituyen evidencia conjunta de procesamiento de webhook autenticado en Sandbox.
- `supporter_private.f16_webhook_request_budget`: admisiones agregadas **5** al inspeccionar (frente a 0 antes de la prueba); no confundir ese contador de admisión con mensajes válidos o aceptados. El estado exacto de la quinta admisión **no está atribuido**; no inferirla como pago/evento.
- `paypal_subscription_intents=0`, `paypal_payment_entries=0`, `paypal_payment_reversals=0`, `wall_consents=0`, `non_pending_inbox_events=0`; todos los registros inbox están bajo `retention_hold=true`. Esto confirma que la ruta F16 no activó conciliación/ledger ni opt-in para el muro en este gate.
- **PayPal Live no fue usado ni tocado por la integración de prueba según flujo ejecutado por PO; no se desplegó checkout de PAZO, no hubo inserciones de pago en el libro financiero y no se activó ningún entitlement.** La venta `PAYMENT.SALE.COMPLETED` es un evento **Sandbox de prueba**, no un cargo con dinero real.

## Evaluación de gates

| Gate | Estado |
| --- | --- |
| Aplicación de SQL 11 eventos `20261014094349` y Edge v13 | PASS PREVIO, NO REPETIR |
| Mismo webhook PayPal existente dirigido a F16 con 11 tipos | PASS PREVIO, NO REPETIR |
| Webhook real firmado de creación/activación/venta/cancelación y persistencia mínima | **PASS HOSTED** |
| PO aprobó y canceló Sandbox en navegador | **CONFIRMADO POR PO** |
| Estado final de suscripción consultado directamente en PayPal REST por ChatGPT | **NO VERIFICADO** (no conector PayPal) |
| Reenvío firmado real/duplicado 200, error/retry 503 | **NO PROBADO** — no realizar sin GO |
| Vinculación a usuario/mascota, reconciliación/cobro y reversos | **NO-GO, no implementado end-to-end** |
| Checkout público, PayPal Live, membresía real, badges y opt-in persistente | **NO-GO** |
| PR #44 merge a main, release Vercel | **NO-GO** |

## Próximo gate técnico recomendado (NO ejecutado ni autorizado por este PASS)

Continuar diseño de procesamiento **privado e idempotente**, validación contra fuente de verdad PayPal, atribución segura al propietario Auth/mascota, reconciliación y reversos, con pruebas aisladas y gates nuevos. El inbox real permanece en `pending` y sus registros no deben borrarse ni procesarse manualmente sin protocolo aprobado.

No recrear transacción, no ejecutar `ApplyWebhook`, no reenviar evento ni simular uno con el mismo id. Por ahora no debe otorgarse una sola insignia o membresía basándose en la existencia de un `PAYMENT.SALE.COMPLETED` aislado.

## Referencias internas

- `docs/PAZO_F16_AUTHENTIC_SANDBOX_EVENT_TEST_GATE_20261014.md` — autorización y protocolo originalmente pendientes, ahora superados **solo en recepción real** por este cierre.
- `docs/PAZO_F16_PAYPAL_WEBHOOK_PATCH_CLOSEOUT_20261014.md` — gate previo de configuración PayPal.
- `docs/PAZO_F16_PAYPAL_RECONCILIATION_MODEL_20261013.md` — diseño aún no activado.
- `docs/PAZO_ACTIVE_HANDOFF.md` — snapshot operativo canónico.
