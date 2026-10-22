# PAZO F16 — Sandbox webhook redelivery and loss-recovery gate

## Estado actual prioritario F16 — Sandbox receptor v12 habilitado, PayPal sin redirección (2026-10-14)

- `f16-paypal-webhook` alojada v12 tiene latch `true`, 8 fuentes; código restringido a Sandbox, firma remota verificada antes de escribir referencia mínima al inbox. `paypal-webhook` legacy v35 no modificado.
- CI y lab PG SUCCESS del commit de liberación [#38532397473](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38532397473) / [#38532397403](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38532397403). Prueba HTTP real [#38532805881](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38532805881): GET 405, POST sin firma 400; test temporal retirado. Host no recibió PayPal real.
- Auditoría Supabase posterior: 0 inbox, 0 intenciones, 0 pagos, 0 reversos, 0 admisiones del presupuesto, 0 entitlements. Ningún cargo ni suscripción.
- El webhook PayPal Sandbox `6N7889790V1467139` aún apunta a dominio diferente; faltan tres eventos PAYMENT.SALE. **No editar hasta otro GO específico.** El paso anterior (solo receptor activo) quedó cerrado. Antes de considerar entrega auténtica PASS se requiere cambio de URL/eventos y prueba de envío auténtico autorizados por separado.
- Los párrafos históricos que hablan de v10/v11 inertes o receptor NO-GO fueron superados en cuanto a la activación técnica. Continúan NO-GO PayPal Live, checkout, pagos reales, entitlement, conciliación y beta pública.


**STATUS (2026-10-14): DESIGN/READ-ONLY AUDIT. NOT A LIVE PROVIDER TEST.**
Scope approved by PO: continue planning and verifying F16; this document does NOT authorize deploying Edge, changing PayPal, issuing requests to generate payments, or granting membership.

## Official provider contract

- PayPal considers HTTP **2xx** delivery successful. Other responses (including **503**) may trigger up to **25 redelivery attempts over 3 days**. Once exhausted, delivery is marked failed; an operator can review and resend notifications in the Sandbox Webhooks Events dashboard. Source: https://developer.paypal.com/api/rest/webhooks/rest/ and https://developer.paypal.com/api/rest/webhooks/events-dashboard/ .
- The PayPal Dashboard can list Sandbox events by app and date, show delivery status and resend a notification. Only events in the selected app are visible. The REST API also supports authenticated **GET** `/v1/notifications/webhooks-events` with `start_time` and `end_time`; neither listing events nor redelivery establishes a PAZO payment entitlement. Source: https://developer.paypal.com/api/webhooks/v1/webhooks-events-list .
- Supabase counts incoming Edge Function invocations even when the function responds 503. PAZO Free has 500,000 monthly invocation quota at the organization level, with service restriction risk, not a hard admission firewall. Source: https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations .

## Existing F16 code contracts verified by inspection (branch PR #44)

| Circumstance | F16 response | Provider/Supabase consequence |
| --- | --- | --- |
| Worker/global quota unavailable or exhausted | 503; Retry-After 5 on local/global gate | No PayPal OAuth/signature request and no event inbox ACK |
| PayPal signature endpoint unavailable | 503 | No inbox insert, delivery may be retried |
| Signature disproved | 401 | Never persist or treat payload as provider-verified |
| Authenticated signature, inbox RPC unavailable/ambiguous | 503 | Never acknowledge uncertain durability |
| Verified known event, DB confirms newly persisted unique reference | 202 | ACK only after service-role inbox write |
| Same verified event ID/type already persisted | 200 | Idempotent duplicate ACK; do not restart ledger or grant status |
| Same event ID used with conflicting type | 503 (RPC error) | Fail-closed, separate operator investigation |
| Event never delivered within provider retry horizon | No inbox record | **NO automatic recovery guarantee.** Operator must compare authoritative PayPal event inventory with private inbox before controlled resend |

These are source-level/offline contract observations, **not** evidence of a real PayPal Sandbox callback or real hosted receipt. The authoritative inbox RPC is `public.f16_paypal_record_verified_event(text,text)` with service-role-only EXECUTE and a private primary key. Events and payer payloads are not stored; only event reference/type. Reconciler and payment worker are separate non-deployed gates.

## Acceptance matrix required BEFORE claiming genuine provider E2E PASS

1. Independent GO from PO for an exact F16 Sandbox receiver bundle deploy and runtime/expense gate. Gate must confirm correct secret **names**, fixed project/plan/webhook IDs, globally installed budget RPC, `verify_jwt=false` only for PayPal callback, and code-level disabled latch change explicitly reviewed. Inert v10 remains unchanged until such GO.
2. Independent GO to update the **existing** PayPal webhook ID `6N7889790V1467139`: replace `different_host` destination with `https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/f16-paypal-webhook`; retain six original BILLING.SUBSCRIPTION events and add three PAYMENT.SALE.COMPLETED/REFUNDED/REVERSED types. No new webhook, no legacy `paypal-webhook` target, no Live changes.
3. Only then create a truly controlled **Sandbox-only** event with a separately approved buyer/test action. A synthetic fixture or PayPal webhook simulator is NOT cryptographic evidence for webhook-ID postback verification. Capture safe status-only evidence: PayPal delivery status, F16 response **202**, one private inbox event reference, no payer PII or keys in logs, 0 unauthorized entitlements.
4. Send a second **authentic** notification of that same event via a separately approved provider resend. Require HTTP **200** and no duplicate inbox row/ledger credit. Do not blindly replay old signatures (transmission headers may be regenerated by PayPal); validate each delivery with the real PayPal signature.
5. Controlled 503 scenario requires an expressly approved test and a recovery observation window; do not deliberately flood PAZO Free or repeatedly consume the global 30/min or 2,000/day budget. Confirm a subsequent **202** on eventual signed redelivery, and **200** on duplicates. A single local mocked 503/202 sequence does not certify PayPal's retry schedule or delivery.
6. After eventual provider retries fail, the operator selects the existing Sandbox app in the PayPal Webhooks Events dashboard, filters by a bounded recent date range (dashboard supports last 30 days), identifies unacknowledged notifications, compares to minimal private inbox references using read-only queries, and asks for separate approval before manually resending a specific event. List/read only is not permission to **POST** the resend endpoint.
7. If provider event cannot be found, the event references disagree, or no confirmed owner/payment evidence exists, mark the workflow **BLOCKED/manual investigation**. Never fabricate missing PayPal events, write inbox IDs directly without verified provenance, assume lost event means paid, issue entitlement, or expose buyer data. The F16 read-only reconciler must later cross-check PayPal event, subscription, transaction, intent ownership, reversals and idempotency before any ledger action.

## Redacted operator evidence and stop rules

Capture only app environment (`sandbox`), receiver code version, aggregate status/counts, event ID/type in **restricted operator-only evidence** if necessary, global quota denial totals, absence of PII in logs, and observed acknowledgement statuses. Do not post event payload, payer email, transaction details, tokens, or credentials into GitHub, chat or diagnostics.

**Stop immediately** for Live credentials, wrong webhook ID, foreign destination, 401/503 loops affecting genuine delivery, unknown ownership, mismatched signature, unexpected new rows, duplicate ledger changes, costs or quota spikes. Restore/retain the receiver's code latch OFF under a separately authorized rollback and investigate with the provider. Never redirect to the legacy `paypal-webhook`.

## Current proof versus pending work

- **Proven hosted:** F16 Edge v10 code latch false; global SQL version `20261014073658` installed with service-only RPC; four financial tables empty and no entitlements; hosted global counters not consumed (read-only postflight 2026-10-14).
- **Proven offline only:** signature adapter paths, request size checks, response statuses, service-only idempotent inbox RPC and concurrency tests in PR #44. Existing CI tests do not prove that a specific real notification can survive the 3-day delivery/retry horizon.
- **NOT proven:** PayPal webhook destination and event subscriptions correct (both known incorrect/incomplete), same remote merchant app as local credentials, actual signature verification, authentic resend after 503, event inventory reconciliation after retries, paid period/refund/cancellation, Live or public beta readiness.

**Next gate:** audit synthetic retry-chain coverage and the safe provider event-inventory reader, then request independently scoped PO approval for actual Sandbox-only receiver deploy. No automatic resend or payment release is implied by this document.
