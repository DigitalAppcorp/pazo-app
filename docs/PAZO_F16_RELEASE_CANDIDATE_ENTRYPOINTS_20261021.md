# PAZO F16 P4 — Financial release candidate code, no release

**Release decision: NO-GO; candidate CODE-ONLY.** This increment prepares the two explicitly selectable Edge entrypoints without changing the default entrypoints or any financial switches.

## Current deployed files remain dormant

`pazo-paypal-live-checkout/index.ts` continues to compile `LIVE_CHECKOUT_RELEASED=false` and `pazo-paypal-live-webhook/index.ts` continues to compile `LIVE_WEBHOOK_RELEASED=false`. All existing static finance guards stay active. No implementation of this increment is automatically deployed: `supabase/config.toml` does not select the alternative files, and Vercel remains `git.deploymentEnabled=false`.

## Staged alternatives (not selected by ordinary deployment)

- `supabase/functions/pazo-paypal-live-webhook/index.release-candidate.ts` enables the **signed, original-generation pinned** intake composition, but does not grant a paid period. A signed event can be queued only after the PayPal verifier, original owner/scope matching and private durable SQL checks.
- `supabase/functions/pazo-paypal-live-checkout/index.release-candidate.ts` enables the hosted checkout code but **still requires** the private SQL active route with a matching merchant generation, explicit buyer consent, GoTrue/onboarding and a recent healthy worker before permitting any provider CREATE.
- Both candidate files derive only normal Supabase server environment; neither contains credentials, copies from the browser nor override the original provider's generation or origin.
- CI contract tests verify the current deployed-entrypoint constants remain false and demonstrate fail-closed behavior with missing live route/secrets.

## Required release sequence (PO financial GO mandatory)

1. Merge reviewed beta changes into **the approved nonproduction release revision**, pass CI and check the exact build SHA and deployed Edge **source bundles**. Review Terms, provider merchant/plan/webhook and data/RLS authorization against the installed schema.
2. Obtain PO permission specifically for a protected preview/HTTPS smoke; ensure PayPal return/cancel endpoints, manifest, SW and SPA actually return HTTP200. Use `node scripts/f16-public-pwa-http-gate.mjs`, then browser/PWA real validation. Do not infer from mock tests.
3. Prepare reversible database P4 controls with independent hard-to-bypass explicit admin MFA/GO, allowlist/signed webhook, generation + revision binding, worker liveness, and rollback. The hosted selector currently **cannot activate** because CHECK constraints enforce sandbox/live=false/kill=true/active_generation=null. No unchecked removal is allowed.
4. Only after trusted backend controls, PO approval and actual original merchant validation may operator explicitly deploy the signed webhook candidate. Verify independent genuine signature/readback, not just the presence of code or HTTP200.
5. Then deploy the reviewed checkout candidate while the DB kill-switch is still ON; require direct readback of deployed file digest and tests that prove no charge can begin. Validate worker healthy. PO must expressly authorize the supervised US$2.99 canary before DB controlled activation.
6. Confirm completed signed sale and period, badge entitlement, cancellation/refund policy, monitoring, privacy and rollback. Leave public checkout OFF until all evidence passes.

**This increment does not implement steps 3–6** and cannot be represented as READY_FOR_PO_CREDENTIALS or LIVE_PAYMENT_PASS. Earlier Sandbox plan and webhook checks should not be repeated. NO secrets in Git or chat.

## Evidence
PR branch based on Codex `f16/beta-completion-20261021`. Node tests `adminPaypalLiveReleaseCandidates.test.mjs` included in test:closure; CI pending. No Supabase DDL or Edge deployed; no Vercel mutation, no PR/main deployment, no real PayPal calls.
