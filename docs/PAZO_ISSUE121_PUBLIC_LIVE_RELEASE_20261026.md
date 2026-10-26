# Issue 121 — PayPal Live public release gate

## Authority and scope

The Product Owner directly authorized the full implementation, integration and hosted release for issue #121 on 26 October 2026. This supersedes older source-only/no-hosted/no-main instructions for this release only. New checkouts may open only through the existing fresh GoTrue/admin/TOTP flow and current CAS revision, with `public_supporter_open_blocker() IS NULL` and health true. Invitations stay OFF. No provider CREATE/CANCEL, test charge, invented settlement or entitlement, evidence deletion, direct checkout flag UPDATE or migration repair/db push is authorized.

Project Brain OS 1.4.1 and Design Intelligence OS v0.4.0 at project-brain-os PR7/5f1cf4bf were read, including CHANGE_INTEGRITY and DESIGN_MEMORY. Backend/operational changes preserve the existing public UI, price, free product, consent and navigation. The separate design-pilots checkout is excluded.

## Observed preflight

- Supabase `mrybvqdebbgcayuvgkkr`, 2026-10-26 06:53–06:55 UTC: checkout OFF, invitations OFF, health false, blocker health_requires_review, archive absent. One signed CREATED held, one financial_review, zero verified paid periods.
- Main `95527e2fbbadd0ae2447878a26e087fdbe7aa7a6` (#119); production Vercel `dpl_CKJWGFFHAg1osy5mjUq4HDQxnmhJ` READY with official alias pazo-app.vercel.app, correct project prj_nk61nr5ZVpxlp8qbIvRCsua36iXI.
- Supabase ACTIVE: checkout7 JWT=true, webhook2 JWT=false/signature gate, worker12 JWT=false/private admission, account8 JWT=true, original-audit2 JWT=true.
- Security advisors: private RLS-without-client-policy informational findings; public SECURITY DEFINER RPC warnings require their existing explicit ownership/service guards; leaked-password protection disabled warning. No new grant or Auth configuration change is part of this release.
- PR120/a8afe481 CI40277112108 and F1840277112118 SUCCESS reused. PR115/6918ad33 CI40263423421 and F1840263423312 SUCCESS reused for initial review. These do not establish deployment or real payment success.

## Audit findings and corrections

1. **Preserve the original owner's management route.** PR120 originally set closed_at despite unresolved provider status. `liveAccountRead.mjs` excludes closed entries and rejects their status/cancel management. The revised archive leaves the original intent, consent and provider binding entirely unchanged and open. Both the existing owner slot and private eligibility quarantine prevent a second CREATE. A 404 is never relabeled cancellation.
2. **Retain prior diagnostics.** The private archive records original processing state, diagnostic, attempt count and incident opening time, plus issue121 decision provenance. The original signed receipt stays unchanged; CREATED is archived as financially unverified, never processed as payment.
3. **Safe repetition.** Reapplying the same archive cannot duplicate it or resolve financial_review reopened by a later event. The initial archive requires exactly one original contract, one receipt and one event; controls paused; no paid periods, holds, cancellation claims or unrelated incident. It uses bounded transaction locks/timeouts.
4. **Late financial events.** Intake and financial writers are unchanged. Any new event for the quarantined binding reopens review before new public admissions can proceed. Sale/refund/lifecycle and duplicate handling are tested against the archived original.
5. **PR115 retry correction integrated.** Only a confirmed lease release to pending yields retryable=true. Signature/binding mismatches stay held; uncertain lease completion is not labeled retryable. This does not retrospectively diagnose the historical HELD event.
6. **Reliable offline harness.** A second named disposable Docker container prevents testing a stale checkout mounted by the old lab. A readonly source-mount check rejects wrong checkout reuse. The synthetic timestamp fixture now sets created_at before provider claim explicitly.

## Verification and limits

New targeted Node regressions: 21 PASS; final F18 Node suite: 33 PASS. Final targeted PostgreSQL17 archive/reclassification run completed successfully and dropped its synthetic database. It checks schema rollback, preserved receipt/diagnostic, owner quarantine, official public-open action for eligible others, rejection of the historical owner's second CREATE, late-event global pause and repeat preserving that pause. Extended SQL tests: verified late sale + replay + wrong lease, actual paid projection after the existing synthetic dispute read, signed cancellation preserving paid coverage, signed refund removing benefits while retaining ledger and evidence. No provider calls occur in this lab.

Initial fixture failures (claim timestamp order, canonical ISO milliseconds and refund enum) were corrected; they are test-data defects, not observed hosted financial failures. Final CI and hosted operations must be recorded separately. No live payment or full real payer journey has been asserted. Existing approved Sandbox/UI/PWA suites are reused unless affected by changes; shared worker changes require relevant CI regression gates.

## Hosted sequence and rollback

1. Review final diff and CI for the exact release candidate. Compare hosted function definitions/ACLs with reviewed sources; preserve the prior eligibility definition and private metadata. Keep checkout/invitations OFF.
2. Apply only the exact reviewed archive transaction through the permitted Supabase migration channel, record its generated migration version/source digest and reconcile it to source. Never replay historical migrations or repair tracking.
3. Read back archive quarantine/provenance, unchanged intent/receipt/consent, no invented paid period, no unrelated incident, original owner still manageable, ACLs and late-event trigger. Recheck heartbeat, certificate, merchant and health. On uncertain result, read before any retry.
4. Integrate reviewed code and deploy the complete worker source closure as needed. Verify every hosted file, JWT/private admission and manifest; stage/publish the exact Vercel commit and verify alias/build.
5. Open through the official admin action with fresh human MFA/current revision only after blocker NULL. Read back public Live mode, checkout ON, invitations OFF, eligible admission and QA/quarantine exclusion. Do not create a payment for validation.
6. Rollback: use the same official admin flow `pause_checkouts` with current revision; retain webhook/worker and legitimate cancellation/refund processing. Preserve archive, quarantine, signed receipts and all paid records. Do not undo reconciliation by deleting evidence or changing PayPal subscriptions. If a late event or any gate is unsafe, remain closed and investigate individually.

**Status:** release candidate under verification; hosted archive, final deployment and public opening are NOT claimed by this document until an explicit postflight is appended.
