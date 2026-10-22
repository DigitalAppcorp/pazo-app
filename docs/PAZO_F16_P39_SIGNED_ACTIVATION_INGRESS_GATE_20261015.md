# F16-P39 — verified activation ingress + review-only provenance (lab / NO-GO hosted)

**Status:** LAB-ONLY, disabled by default; PR #44 stays DRAFT. P28 historical deferred.

## End-to-end staged path

1. `core.mjs` receives the PayPal Sandbox webhook and verifies its signature using PayPal's verification API; a failed signature is rejected before inbox writes.
2. Only if the **separately gated** `activationBindingEnabled===true` and the event is `BILLING.SUBSCRIPTION.ACTIVATED`, read the exact signed `event.resource.id` as the subscription ID.
3. Persist signed event identity using existing inbox adapter first. Then ask a private adapter to store the binding. A false/failed write returns **503** even for duplicate inbox events, allowing webhook retry of the missing binding.
4. `p39ActivationInboxAdapter.mjs` is disabled by default and permits only one configured Supabase host / RPC with a server-side service-role credential. It is not imported into the deployed `receiver.mjs`.
5. PG17 `f16_p39_lab_register_signed_activation` maps the subscription to exactly one `BOUND` PAZO intent and owner, inserts a private immutable event→subscription→owner binding, and permits idempotent replay only for the same identity. Cannot update another subscription/owner or grant credit.
6. P38 read requires a separate live, cutoff-scoped P21 lease to inspect a binding and still cannot mark the first period paid.

## Trust boundary and open security gaps

**Critical:** PostgreSQL cannot independently verify the PayPal webhook signature or the origin of a `subscription_id` passed by an arbitrary `service_role` caller. The SQL's provenance constant is NOT cryptographic attestation. The intended trust is the specific Edge webhook composition, which takes the ID from the **signed payload** after PayPal verification; protecting that privileged service and its credentials is essential. No `service_role` endpoint should expose free-form arbitrary registration.

The P39 RPC is not deployed and its name is lab-scoped; the offline adapter's future hosted RPC name is deliberately not yet installed. A production version needs an approved versioned migration, contract alignment, and regression tests for retries and same-event identity conflicts. Browser users must never invoke it.

Activation may arrive before `Auth/intent BOUND`; this design intentionally returns 503 on missing binding, which needs an operational retry/quarantine strategy for legitimate out-of-order and unrelated merchant events. No automatic `200` on unlinked events has been approved.

No provider history coverage, cycle-verified payment, reembolso/disputa settlement, approved terms or idempotent financial write is established by this work. Never use the proposed binding to create `paidThrough`.

## Required PO approvals / operational gates

- Legal/privacy review for pre-checkout ES/EN terms, cancellation and renewal notifications; consent retention and proposed event→owner binding storage.
- Separate GO for a **specific hosted migration** (review-only table and restricted RPC), including exact schemas and privileges, and only after reviewing a hosted-compatible candidate.
- Separate GO for rewiring/deploying the signed receiver with activationBindingEnabled, changing any PayPal webhook configuration or enabling P21 worker.
- Separate GO for a prospective new Sandbox buyer/payment experiment, and still another GO for any financial ledger / entitlement write or Live.

No hosted DDL, Edge deploy, new payments, benefits, accounts, or changes to real stored records in this phase.
