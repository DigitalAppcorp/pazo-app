# PAZO F16-P16 — Account portal route independent of pets

**2026-10-15.** Product Owner: «ok sigamos». Scope: branch-only code audit and bugfix, hosted Supabase read-only verification, preview read-only inspection; **no new SQL, Edge deployment, payment, real cancellation, Live, merge or production promotion**.

## Technical change

- `src/features/supporter/supporterAccountRoute.mjs` + TS declaration: exact hash `#/account/supporter` and controlled exit. This address opens owner-authenticated supporter account management without relying on `currentPet`, pet bootstrap success or pet count. It does NOT relax Edge JWT/auth/owner constraints.
- `src/App.tsx`: checks the route after Auth/loading/password recovery and **before** pet bootstrapping states that can block user access. The pet-load error view provides a dedicated supporter management link instead of denying cancellation access when pets cannot load. Existing menu entry remains.
- `src/features/supporter/components/SupporterAccountManagement.tsx`: appends download link to DOM before clicking, delays revocation of blob URL to prevent premature invalidation; no new tracking or PII persistence.
- `src/features/supporter/testing/f16P16SupporterAccountRoute.test.mjs`: route exactness/avoid confusion with public rescue, precedence over broken pet loading, protected Blob download lifecycle. `supporterAccountRoute.d.mts`: TypeScript declaration for the ESM helper.
- Commit [e501b18](https://github.com/DigitalAppcorp/pazo-app/commit/e501b18c6395126c0ad275a2a563600a8641215b) **CI SUCCESS**, **F16 Disposable PostgreSQL Lab SUCCESS**. Previous commit [4e6dcd0](https://github.com/DigitalAppcorp/pazo-app/commit/4e6dcd08939ef34601fb468c0885d81d8fe51646) hit TS7016 and was fixed before reaching this gate.
- Vercel Git integration automatically created a **READY preview** `https://pazo-app-t83r-gmiex98ov-digitalapp.vercel.app` corresponding to e501b18. Not promoted to a production alias and not visually approved by PO. Inspection of deployment aliases hit scope 403; do not assert stable branch origin or that preview is publicly accessible.

## Hosted read-only regression snapshot

Supabase project `mrybvqdebbgcayuvgkkr`: 0 P06 published offers, 0 P06 checkout acceptances, 0 payment ledger entries, 8 historical inbox events PENDING. None of the examined P06/P14/P15 privileged RPCs exposed to `anon`/`authenticated`. `f16-paypal-supporter-account` ACTIVE v2, `verify_jwt=true`; previous `f16-paypal-webhook` v13 and `paypal-webhook` v35 unchanged. No new hosted mutation made during P16.

## Remaining E2E blocker

`f16-paypal-supporter-account` requires `PAZO_F16_APP_ORIGIN` an exact HTTPS value + `PAZO_F16_PAYPAL_ENV=sandbox`, service-role key, and PayPal Sandbox credentials for status/cancel. The connected tools do not expose an approved secrets-presence read and the sandbox browser HTTP request could not be performed; **do not claim that status/cancel/receipt are operational from a real user session**. A READY Vercel preview is not a verified CORS origin. Reconfirm the stable preview origin and set appropriate Edge config through an explicitly authorized operator secret-management flow. Do not weaken CORS to wildcard or expose service-role key to frontend.

The one historical intent is bound to PayPal and was cancelled in prior QA but has **no P06 accepted offer**, so it must not show a generated acceptance receipt. Do not initiate another subscription or repeat a PayPal cancellation on the historical QA ID merely for a test. End-to-end test must use a previously owner-verified account and read-only `list` first; `status` may do PayPal GET with consent; `cancel` is a real merchant mutation and requires separate exact target confirmation. No new paid period/benefits can arise from provider ACTIVE alone.

## Future work

Precise app origin and browser Auth/CORS smoke test; non-obstructive cancel access/visual QA, verified delivery of renewal acknowledgement after legally approved ES/EN offer, financial reconciliation first period and reversals/retention P01–P09, authorized Sandbox buyer later, independent Live GO. PR #44 stays DRAFT; PAZO remains free, Amigo voluntary USD 2.99/month OFF.
