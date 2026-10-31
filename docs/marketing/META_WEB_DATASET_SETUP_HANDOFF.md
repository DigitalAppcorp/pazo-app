# PAZO — Meta Events Manager: web Pixel / dataset setup handoff

**Status:** USER META ACCOUNT ACTION REQUIRED. This document does NOT create a dataset, install Pixel, configure CAPI, authorize third-party data collection, or activate ads. Issue #169 and PR #171 remain provider-OFF until all privacy and QA gates pass.

## Verified account context

A read-only Events Manager session for advertising account `2006836613506556` displayed a source **Guastayomi**, ID `648944045758089`, labeled as an **app** source. It is NOT a confirmed PAZO web Pixel and should NOT be reused for PAZO. No verified PAZO web `CompleteRegistration` event was found in that view. Do not confuse a mobile-app ID with a website Pixel/dataset ID.

## User-owned action (Meta Events Manager)
1. Navigate to https://eventsmanager.facebook.com/events_manager2/ .
2. Choose the correct PAZO business / ad account. Confirm ownership or permission to manage web data sources.
3. Select **Connect data / Conectar datos** → **Web / Sitio web**.
4. If Meta offers an existing PAZO-owned web dataset/Pixel, inspect its website/ownership and record its ID. Otherwise follow **Create Pixel / Create new dataset** and name it **PAZO Web** (or another unambiguous PAZO-specific name). Interface wording can vary by account.
5. Website: `https://pazo-app.vercel.app/`. Select **manual** or developer integration where available; choose Pixel + CAPI for technical planning, but **do not install code or grant access to unverified partners** yet.
6. Record the **numeric Web Pixel/Dataset ID only**. This ID can be supplied safely for configuring a future gated build. **Never paste or commit the CAPI access token, account password, user cookies, or private keys** in ChatGPT, GitHub or screenshots.
7. Before any test events: complete third-party privacy notice/consent/opt-out/GPC analysis, server-side claim path, QA exclusion, environment-specific secrets and test-dataset strategy. Event Manager Test Events is not sufficient alone to guarantee no effect on ads/learning.

## Preflight controls the engineer will verify after ID obtained
- Correct PAZO web ownership and dataset access confirmed, unrelated app dataset unchanged.
- No `fbevents.js` requests, Pixel cookies or CAPI requests when explicit Meta purpose consent is absent or revoked, or if GPC is present.
- One verified email signup → at most one business event; Pixel `eventID` and CAPI `event_id` identical; no event for demo, login, QA/admin or old accounts.
- Backend CAPI token server-only with no accidental logging; browser receives only the attested event ID, after authorized registration.
- Correct consent and notice in Spanish and English, separate from PAZO first-party analytics.
- Independent rollback/kill switch OFF-by-default. Paid advertising remains OFF.
- Evidenced Browser+Server receipt and deduplication in Events Manager using an isolated test plan, then only a separate explicit GO for production and ad spend.

## Official help
Meta Business Help Center: https://www.facebook.com/business/help/5270377362999582
Meta Events Manager: https://eventsmanager.facebook.com/events_manager2/

Related: [#168](https://github.com/DigitalAppcorp/pazo-app/issues/168), [#169](https://github.com/DigitalAppcorp/pazo-app/issues/169), [PR #170](https://github.com/DigitalAppcorp/pazo-app/pull/170), [PR #171](https://github.com/DigitalAppcorp/pazo-app/pull/171).

**Decision gate:** No new Meta account data source has been created through ChatGPT. The browser connection in this chat is read-only, and no available Meta Events Manager write interface is connected. The account owner should perform the setup above, while the code PR remains isolated and inactive.
