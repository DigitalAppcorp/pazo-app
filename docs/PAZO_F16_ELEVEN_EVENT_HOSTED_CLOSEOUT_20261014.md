# PAZO F16 — Hosted 11-event backend closeout (2026-10-14 UTC)

**GATE A: PASS — SQL installed**. **GATE B: PASS — Edge deployed.**

## Scope and authorization
Codex conveyed the Product Owner's literal response «si» after asking for exactly two changes in order: apply `20261014085430_f16_preserve_two_subscription_lifecycle_events.sql`, verify SQL, then deploy and verify the F16 Sandbox 11-event receiver. No authority was given to edit PayPal, initiate purchases, change Live, turn on checkout, grant premium entitlements, or merge. GitHub source SHA audited before operations: `277d52e611e2d248ae7265ee222dc00416fcc913`, PR #44 Draft.

## Gate A — authenticated Supabase DDL
- Project `mrybvqdebbgcayuvgkkr`. Migration `f16_preserve_two_subscription_lifecycle_events` executed via supported `apply_migration`, returned `success:true`.
- Supabase created migration history version **`20261014094349`**. GitHub migration path aligned to `supabase/migrations/20261014094349_f16_preserve_two_subscription_lifecycle_events.sql` (SQL blob unchanged; original filename removed; never apply a second time).
- Postflight read-only `pg_get_constraintdef` and `pg_get_functiondef`: both contain **exact 11 allowlisted F16 types**, including `BILLING.SUBSCRIPTION.CREATED` and `BILLING.SUBSCRIPTION.RE-ACTIVATED`.
- Table `supporter_private.paypal_verified_event_inbox` has RLS enabled AND forced, zero policies and no direct DML for anon/auth/service_role. `public.f16_paypal_record_verified_event(text,text)` remains SECURITY DEFINER, postgres owner, restricted search_path, service_role EXECUTE true / anon false / authenticated false.
- Inbox 0; intents 0; payment entries 0; reversals 0; global admissions 0; `wall_has_verified_entitlement(NULL::uuid)=false`. No artificial events inserted in hosted DB. This is structural/security proof, not actual PayPal signature-delivery proof.
- Disposable PostgreSQL migration and integration tests passed before live action: General CI + PostgreSQL runs at prior head. Subsequent workflows check the aligned filename.

## Gate B — Supabase Edge v13
- Deployed `f16-paypal-webhook` from the EXACT 8 repository files on reviewed SHA above, `entrypoint_path=index.ts`, `verify_jwt=false` ONLY because this is an external webhook whose request is authenticated by PayPal signature verification in code. Latch `F16_SANDBOX_RECEIVER_RELEASE_APPROVED=true`, environment fixed to Sandbox.
- Hosted service status ACTIVE, version **13**. Postflight `get_edge_function` matched all **8/8** files byte-for-byte with GitHub. Compared with v12, only `core.mjs` and `paypalInboxAdapter.mjs` changed to accept two retained lifecycle types (including RE-ACTIVATED hyphen). Existing `paypal-webhook` legacy remains **v35**, unchanged.
- Real negative-only public HTTP smoke [GitHub Actions #38544817793](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38544817793) SUCCESS: GET=405 `method_not_allowed`, unsigned POST JSON `{}`=400 `missing_or_invalid_headers`. One-time workflow removed from repository.
- DB second read-only postflight: events/intents/payments/reversals/global admissions all remain 0, entitlement false. No authentic PayPal delivery, no payload, no financial processing, no new memberships.

## Next gate — PayPal destination ownership and integration dependency
- PayPal Sandbox plan `P-14V25407JP6850922NLHMDKI` $2.99/month ACTIVE; registered webhook `6N7889790V1467139` has **different_host** callback from F16 and 8 configured events: six original + CREATED/RE-ACTIVATED; missing SALE COMPLETED/REFUNDED/REVERSED. These were verified by PO through local read-only GET and public PayPal event catalogue.
- Redirecting this webhook changes delivery of ALL ELEVEN events; the foreign destination may be owned by a separate consumer. A new callback should not be set before verifying ownership/dependencies. The prior GO only covers modifying the existing Sandbox webhook after suitable safety checks; no other webhook, no Live.
- **Local tool still fail-closed:** `$F16ElevenEventBackendReady = $false` in `scripts/f16-paypal-sandbox-plan.ps1` prevents `-Check ApplyWebhook`. Keep so until safe-to-redirect gate, then revise code/CI via Project Brain, not by Codex silently.
- Safe local step Codex (if available): after syncing clean checkout, use Chrome for a **read-only** investigation of the existing callback host ownership/function and report only the category and whether another service consumes it, **without showing endpoint URL, bearer tokens, secrets or payloads**. Do not edit PayPal/dashboard.
- Separate GO still required for any **authentic** Sandbox buyer event / resend trial, then ledger/entitlement gates. No user payment/Live approval has been given.

Historical banners in existing docs referring to v12 or SQL not applied describe earlier checkpoints and must not override this verified closeout. PR #44 remains Draft; phase not merged or released.
