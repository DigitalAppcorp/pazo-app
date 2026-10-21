# PAZO F16-P27 — Hosted Sandbox merchant-read preflight (2026-10-15)

## Authorized scope
Product Owner authorized a scoped PayPal Sandbox **read-only** verification after P27 offline CI. No purchase, cancellation, refunds, ledger, entitlements, worker enablement, migrations, Live or deployment.

## Verified evidence
- Commit 96e4ad028ff14ff3fd0e6421cb809e09b226eb2f: CI SUCCESS #38842185357 and F16 Disposable PostgreSQL Lab SUCCESS #38842185169.
- Supabase project mrybvqdebbgcayuvgkkr is ACTIVE_HEALTHY (metadata inspected read-only).
- Deployed f16-paypal-webhook version 14 is an ingress POST receiver. It is **not** a merchant-read endpoint. A GET there cannot perform the authorized verification.
- Existing P05 Sandbox GET reader and P27 composer remain disconnected from the hosted Edge entrypoint.
- Current connected tools provide Supabase function metadata/source but do not expose PayPal OAuth secrets or a callable PayPal merchant-read connector. Reading Edge source does **not** reveal those secret values.
- **No authenticated PayPal merchant GET was executed.** Financial provenance, refund/dispute coverage and first regular cycle remain unproven.

## Gate
Status: P27 offline PASS, authenticated hosted Sandbox merchant read **BLOCKED ON EXECUTION CAPABILITY**. Preserve fail-closed behavior; do not proxy through webhook ingress, inspect secret values, create payments, or install new functions under this authorization.

Permitted next step is to use a secure server-side execution environment with pre-existing merchant OAuth credentials and a reviewed, read-only PayPal GET adapter; constrain it to approved event/subscription references, record redacted pass/fail results, and revalidate lease and P06 linkage. No ledger/benefit authorization follows from merchant GET alone.
