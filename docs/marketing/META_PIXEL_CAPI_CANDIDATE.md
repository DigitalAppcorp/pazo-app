# PAZO #169 — Pixel + CAPI: groundwork, NOT activated (31-oct-2026)

## Scope and status

This branch follows [PR #170](https://github.com/DigitalAppcorp/pazo-app/pull/170) (#168). It adds independently testable Meta Pixel and CAPI event *adapters* only. **Neither is imported or invoked by the production app. No SDK, HTTP request, secret, Meta dataset, ad or budget has been created or activated.** This is not a claim of full integration or an Events Manager PASS.

**Candidate: CODE_PARTIAL (contracts, private purpose policy, lazy SDK and delivery coordinator), PROVIDER_OFF, PRIVACY_BLOCKED, META_DATASET_NOT_VERIFIED.**
The user approved implementation and testing, but not the third-party production data release or ad spend.

## Technical assets
- `supabase/functions/_shared/metaConversion.mjs`: shared, strictly validated `CompleteRegistration` contract; the same random UUIDv4 event ID is presented as Pixel `eventID` and CAPI `event_id`. Requires independent positive Meta purpose consent, independently *trusted* consent, valid verified account, QA/admin/exclusion/GPC/opt-out negative checks, format-valid ID, server event timestamp and explicit dataset ID + SHA256 match field. Uses a fixed query-free canonical URL. This module **does not issue or persist event IDs**.
- `supabase/functions/_shared/metaCapi.mjs`: isolated server-side transport with flags OFF, trusted server-side authorization recheck, a required unique-claim proof, strict canonical payload and version, token only in `Authorization` header, timeout/error handling without logging data. A caller MUST implement durable idempotency, server-only approved match-field processing, and privacy authorization before using it.
- `src/features/marketing/metaPixel.mjs`: isolated Pixel event dispatcher requiring positive browser privacy and a same-ID server-attested conversion. It intentionally does **not** load a third-party script or initialize a Pixel. A later, reviewed consent-gated loader is still needed.
- `supabase/functions/_shared/metaPurposePolicy.mjs`: independent, versioned affirmative marketing purpose; opt-out, GPC, QA/admin and withdrawal override any prior grant. A trusted server read is mandatory. It **does not persist consent**.
- `supabase/functions/_shared/metaDeliveryCoordinator.mjs`: composed CAPI event delivery with a required DB-backed `leaseOne()` + privacy read + idempotent `settle()` interface. Rechecks current permission immediately before network transmission; failures remain retryable using the same event ID. No DB adapter is implemented yet.
- `src/features/marketing/metaPixelLoader.mjs`: isolated SDK bootstrap that creates no third-party script until release, purpose-specific consent and browser eligibility are all affirmative. Queues a consent revoke before init; does not send PageView; sends the named event only after a post-load consent/GPC check. Does not import into PAZO.
- `scripts/meta-conversion-off.test.mjs`, `scripts/meta-delivery-coordinator.test.mjs`, `scripts/meta-pixel-loader.test.mjs` and isolated workflow: synthetic-only tests. No real Meta or Supabase requests.
- `supabase/tests/marketing/meta-outbox-candidate.sql`: laboratory-only private PG17 candidate, **NOT** a migration or deployable release. Candidate outbox is a child of first-party acquisition so 14-day pruning/withdrawal cascades, with one-time event IDs created in the **same transaction as newly inserted verified acquisition** through a laboratory-only AFTER INSERT trigger. Separate Meta-specific release gate defaults OFF, independent of first-party analytics; a distinct purpose ledger is required before the trigger can insert. Prior registrations and post-registration opt-in are not backfilled. RLS forced, no direct public/anon/authenticated table grants; a service-only claim bridge must be bound to trusted Auth by Edge if ever used. The candidate requires a server-persisted prior specific permission; it cannot create new consent by itself.
- `scripts/meta-outbox-pg17.mjs`: isolated PG17 tests for eight concurrent first-party insert attempts (one acquisition/one event), eight concurrent worker leases (one active lease), failed-delivery retry with same event ID, stale-worker fencing, no grant/GPC/post-verification consent, retroactive QA exclusion, private RLS and 14-day-related cascade. CI has an Ads2 job to run it after the original marketing baseline. Mark PASS only after that job succeeds.

## Blockers — do not flip flags or wire the adapters until resolved

1. **Meta asset ownership:** #168 read-only audit found no PAZO-specific Pixel/web dataset in the accessible Events Manager. Obtain PAZO-owned dataset ID, approved API version and server-side access token through secure settings, not in GitHub. No borrowing unrelated datasets.
2. **Privacy and consent:** first-party PAZO analytics notice does not imply authorization to disclose verified registrations to Meta. Review whether and how California CCPA/CPRA applies, opt-out of sharing, GPC, withdrawal and accurate ES/EN notice. Record an explicit, durable purpose-specific Meta consent/opt-out decision and a corresponding trusted server proof. Any PII/matching data (including hashed email, IP and cookies) needs explicit inventory/review. `hashedEmail` in the pure fixture is an imaginary 64-character hash; no real email is processed.
3. **Server-generated durable event proof:** existing `pazo_marketing_record_verified_v1` returns only boolean and enforces insertion/deduplication internally. Do not reuse the Auth user ID or invent a client ID. Build a private, persistent one-time conversion claim with unique random UUIDv4 `event_id` and trusted eligibility at the **same atomic boundary** as newly accepted signup. Return only the event ID to the correct authorized browser if consent permits. Server submission and Pixel must use that same ID; no reissue on retries, refresh, account switches, or email reconfirmation. Existing 14-day retention policy and QA exclusions must not be weakened; choose TTL and retry policy consistent with Meta's window and the privacy policy.
4. **Live runtime integration:** only after 1–3, connect one authenticated server-backed flow to the existing verified signup success; connect a guarded SDK loader in the browser, never automatic PageView/advanced matching. Server-side authorization must be independently verified, not derived from request body boolean. Browser GPC/withdrawal must be checked prior to SDK and prior to event. No unconditional `fbevents.js` in HTML or startup.
5. **External validation:** run synthetic QA with isolated test dataset/access; independently verify Browser+Server `CompleteRegistration` matching `event_id` and deduplicated counts in Meta Events Manager Test Events. Never infer success from unit tests. Confirm traffic with no consent emits zero Meta network calls, that QA/admin are suppressed *before* transfer, and that the real signup+confirmed account boundary is used.
6. **Change control:** a different GO is required to merge/deploy any provider activation, add disclosures/consent UI, send production data to Meta, create or activate ads, or spend the proposed USD 84. Keep PayPal, MFA, admin data and historical attribution intact.

## Gates (as delivered)

| Gate | State |
|---|---|
| #168 attribution implementation | PR #170 draft; CI succeeded before #169 branch |
| Shared event data contract | Prepared, provider disconnected |
| Pixel SDK loader | Isolated opt-in loader implemented; NOT wired to production |
| Pixel runtime integration | NOT IMPLEMENTED |
| CAPI API transport | Prepared, provider disconnected |
| Consent purpose policy | Tested, but no durable trusted storage or UI |
| Trusted persistent privacy decision | BLOCKED |
| Atomic one-time event proof | Lab-only, OFF-by-default AFTER INSERT trigger + service-only lease/settle RPCs; no hosted migration, trusted Edge integration or browser event receipt |
| Meta asset ID/token | NOT VERIFIED |
| Browser/server dedup in Meta | NOT TESTED |
| Real Meta conversions | NOT VERIFIED |
| Production provider transfer | OFF |
| Advertising spend | No Ads Manager write by #169 |

Documentation basis: https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events and https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api ; official California guidance https://cppa.ca.gov/faq. Do not mistake documentation for a legal determination.

## Handoff for subsequent work (do not bypass gates)

The next implementation milestone is to mature the laboratory-only atomic acquisition-trigger/outbox + lease/settle RPC into a reviewed Supabase CLI-generated migration; bind the trusted signup/Auth flow and browser receipt after verified registration, with a persistent, authenticated and independently verified Meta-purpose preference, GPC handling and withdrawal. Test concurrently on disposable PG17 first; any additional SQL is PREPARED_ONLY with no hosted installation. Only then bind the isolated coordinator to that private adapter and a consented browser-side callback; continue to require an owned PAZO Pixel/dataset and Test Events evidence. In the interim the isolated loader is inert; do not interpret code preparation as Meta registration measurement.

Privacy basis: California's CPPA describes the opt-out right for cross-context behavioral advertising and user-enabled opt-out signals at https://cppa.ca.gov/faq ; a legal review is still required to determine the exact PAZO implementation. The prior PAZO 14-day acquisition record purge and the duration of a purpose-specific preference are separate concerns; do not silently expire a privacy opt-out by applying the analytics TTL.

## Worker safety, still lab-only

The candidate Meta-specific release gate starts **OFF** and is separate from PAZO's already-active first-party gate. Only a previously granted purpose decision (not first-party analytics consent) allows an event to be created in the same transaction as a newly verified acquisition. The worker uses `FOR UPDATE SKIP LOCKED` to lease one record at a time, never generates a second event ID on retry, and requires a separate lease token to settle; an expired worker's late acknowledgement cannot settle a newer lease. Purpose withdrawal and retroactive QA classification block leasing, and any existing first-party withdrawal cascades to the associated Meta outbox. These are database **candidate** guarantees only, not Meta-side delivery proofs. The mutable GPC snapshot is not a substitute for real-time policy propagation; client/server privacy must be reevaluated at send time. No provider token, SDK or live Meta network is present.
