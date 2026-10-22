# PAZO F16-P10 — Recovered subscription identity binding (LAB only)

**Checkpoint:** 2026-10-15. PR #44 DRAFT, `f13/section-titles-20261012`. Core PAZO free. Amigo de PAZO optional USD 2.99/month remains OFF. No live payments.

## Problem and design

P09 may find exactly one PayPal Sandbox subscription with `custom_id` equal to a previously claimed PAZO checkout intent. P09 public output intentionally strips subscription IDs. Such a find alone is not enough to bind or credit a paid month; merchant listing can be incomplete/delayed, and a subscription's status can change.

P10 adds an **unreleased, explicit-review-only** identity binding path, guarded by three separate controls:

1. Auth server getUser() confirms owner. Private P08 reading confirms exact owner + idempotency key + intent + `providerCreateClaimedAt`, status `pending`, no stored PayPal sub ID, and 48-hour recovery window. Rate admission is mandatory.
2. Backend-only P09 `examinePrivate()` scans bounded PayPal merchant subscriptions (plan+time, first page only), all matches, no PII propagation. It returns candidate ID *internally* only if exactly one match and PayPal status `APPROVAL_PENDING`. Caller performs a fresh independent PayPal GET immediately afterwards, requiring identical subscription ID, `plan_id`, `custom_id` and pending approval. Other states require separate manual finance/status review. PayPal official API documentation: https://developer.paypal.com/api/subscriptions/v1/subscriptions-list and https://developer.paypal.com/api/subscriptions/v1/subscriptions-get.
3. `verifyIndependentRelease` is a required server-only callback that must verify an authentic approved operator release **from a trusted backend source**, scoped to the same environment/owner/key/intent/subscription. **No real implementation or approval exists** in repo. Missing callback prevents construction; returning anything other than `true` blocks. Tests inject mocks and are NOT proof of operator, legal or financial approval.

Only after all three gates does an injected store call `public.f16_p10_bind_recovered_checkout`. This privileged PostgreSQL DRAFT is tested exclusively in disposable `f14_synthetic` session and DOES NOT run on hosted Supabase. It locks the owner and intent, checks the durable claimed-at timestamp and exact P06 record, state pending/plan, and relies on UNIQUE PayPal subscription ID to reject another owner/intent claim. Repeating the same confirmed sub ID reports `already_bound` without another write. Calls using another request key, owner, different PayPal sub, unclaimed attempt or already bound conflicting intent fail closed. Existing generic binding RPC still exists; any future production rollout must restrict its use to audited callers rather than assuming P10 alone enforces all service-role paths.

**Important limitations:** PostgreSQL cannot authenticate the external PayPal GET or verify a human approval from the arguments alone; the production server must enforce these preconditions and security reviews. Candidate scan is deliberately non-exhaustive. Do not confuse 'exactly one found' with 'globally unique PayPal subscription' or complete payment/dispute evidence. No P10 action asserts `paidThrough`, entitlements, service periods, founder flags, successful payments, or checkout readiness.

## Files

- `supabase/functions/f16-paypal-webhook/p09SandboxOrphanMerchantProbe.mjs`: added private candidate projection, public projection unchanged.
- `supabase/functions/f16-paypal-webhook/p10RecoveredCheckoutBindingReview.mjs`: server-only, no Edge route, Auth+GET+release-gated request composition.
- `supabase/functions/f16-paypal-webhook/p06CheckoutConsentStore.mjs`: private service-role RPC adapter, no client exposure.
- `supabase/drafts/f16_p10_recovered_checkout_binding_DO_NOT_APPLY.sql`: guarded PostgreSQL-only DRAFT, server RPC with explicit revokes and idempotency.
- `supabase/tests/supporter/p10-recovered-checkout-binding-synthetic.sql`: cross-owner, forged keys, missing claim, duplicate subscription, replay and 0 ledger.
- `src/features/supporter/testing/f16P10RecoveredCheckoutBindingReview.test.mjs`: gate fail-closed and mock provider adversarial tests. CI PostgreSQL job updated.

## Verification

**Technical commit:** [e469bf3](https://github.com/DigitalAppcorp/pazo-app/commit/e469bf3223c4fdc131348eddbbd89f2c81cd14e4). GitHub Actions **CI SUCCESS and F16 Disposable PostgreSQL Lab SUCCESS**. This is a synthetic/lab test only. No PayPal calls or Supabase hosted writes were performed.

## Next operational decisions / gate

Legal/accounting/privacy retention P01-P09 approval; exact ES/EN terms and cancellation proof; trusted and revocable operator approval system; merchant coverage limits plus duplicate anomaly handling; staged Sandbox SQL GO (never deploy `DO_NOT_APPLY` directly), Edge OFF GO, authenticated live merchant GET permission, isolated buyer and full financial reconciliation; subsequent separate Live GO. No public charges, resubscription (P06 unique checkout per owner still enforced), ledger credit, entitlement or deleting historic claims without these decisions.
