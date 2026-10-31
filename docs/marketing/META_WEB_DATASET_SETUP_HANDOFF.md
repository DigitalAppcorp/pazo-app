# PAZO — Meta Events Manager + CAPI credential handoff

## Confirmed by owner (30 Oct 2026, LA time)
- The owner identified **PAZO Web** in Meta Events Manager: numeric dataset ID `1438916858347709`. The unrelated **Guastayomi** app source, ID `648944045758089`, must not be reused.
- The owner generated a Meta CAPI server token using direct integration **without Dataset Quality API**. **Do not copy token bytes to GitHub, ChatGPT, ads, frontend or logs**.
- The owner saved two Edge Functions secrets in the existing hosted PAZO Supabase project (`mrybvqdebbgcayuvgkkr`): `META_CAPI_ACCESS_TOKEN`, `META_DATASET_ID`. A read-only view of Supabase confirmed **both secret names** are present with saved timestamps. Their **values were not read, verified or tested**.
- A read-only inspection of the Supabase Edge Functions list showed no Meta Pixel/CAPI-specific deployed function. The isolated code on PR #171 remains **NOT deployed / PROVIDER OFF**. **Saving secrets does not send events.**

## Remaining tasks — release blocking
1. Confirm the PAZO Web dataset has correct ownership and permissions for the intended ad account, and that Meta authorizes the API version used. Use a separate test dataset or controlled test strategy; never infer that Meta Test Events does not affect ads delivery.
2. Approve the third-party privacy notice and consent/opt-out/GPC behavior in English and Spanish; distinguish the Meta-purpose preference from PAZO's first-party analytics. Choose and document each matching field (hashed email etc.) before using one.
3. Implement authenticated, persisted consent, cancellation, admin/QA exclusions, atomic conversion outbox and fenced lease/settle via **reviewed migration and Edge service**. The current SQL exists only as a disposable PG17 test fixture, NOT a hosted migration.
4. Only then wire the isolated, opt-in Pixel loader and CAPI sender. Require **one original `CompleteRegistration`**, matching browser `eventID` and server `event_id`, no PageView or automatic advanced matching, and rollback kill switches OFF by default.
5. Verify with Meta Events Manager Test Events using authorized synthetic accounts while checking consent denial, GPC, retry/deduplication and data minimization. Document exact evidence; no PASS based on unit tests alone.
6. Obtain separate PO GO before merging, deploying to production, enabling real third-party transfers, or spending the proposed US$84 budget.

## Links
- [PR #171: prepared OFF-by-default integration](https://github.com/DigitalAppcorp/pazo-app/pull/171)
- [Issue #169: implementation gates](https://github.com/DigitalAppcorp/pazo-app/issues/169)
- [Meta Events Manager](https://eventsmanager.facebook.com/events_manager2/)
- [Supabase Edge Function secrets](https://supabase.com/dashboard/project/mrybvqdebbgcayuvgkkr/functions/secrets)

**Current state:** PAZO web dataset identified and credentials stored in secret manager; no token validity check, no Meta Test Events, no live conversion sending, no ad activation.
