# PAZO F16-P26 — Merchant provenance and ledger gate (DRAFT)

Date: 2026-10-15. Branch f13/section-titles-20261012, PR #44 DRAFT.

## Objective
P25 reserves one first-obligation sale for REVIEW ONLY. Its sale ID is caller-provided and does not by itself prove merchant authenticity. P26 must bind authentic merchant evidence to a live inbox lease, exact sale, bound subscription intent, owner and P06 consent before any future accounting operation.

## Fail-closed contract
1. Require cryptographically verified original ingress event AND server-side authenticated PayPal Sandbox GET of the exact same event, original sale and subscription; do not trust caller-supplied authenticity flags or browser data.
2. Compare event ID, sale ID, subscription ID, intended owner, bound private intent and original immutable P06 acceptance. Check merchant scope, timestamp coherence and prospective cutoff; exclude eight historical QA events.
3. Independently establish first REGULAR cycle ordinal 0 from merchant evidence and approved period policy; a future billing date alone is not a verified service period. Late payments must credit original obligation, never create an extra month.
4. Require complete observable refund/dispute coverage and safe handling of out-of-order events, partial and multiple reversals. Zero local reversals does not prove absence.
5. Revalidate fencing token, state and lease under a single transaction before any future ledger write. Prevent time-of-check/time-of-use races, duplicate sale credit, cross-owner assignment and two sales credited to one obligation.
6. Preserve immutable financial history and use compensating reversals for subsequent refunds/disputes. Missing evidence, expired lease or incomplete coverage yields REVIEW_REQUIRED, never paidThrough or benefits.
7. Strictly deny client roles access to private proofs and ledger writes. No log leakage of buyer identifiers or raw PayPal payloads.

## Required adversarial acceptance tests
- Forged sale ID, webhook without merchant GET, merchant GET without first-cycle proof: review only; zero payment, zero paid period, zero benefit.
- Foreign subscription, owner mismatch, expired lease, event predating cutoff: reject.
- Concurrent retries, double sale per obligation, sale reused across owners: at most one reservation, zero duplicate credit.
- Partial/multiple refunds, opened dispute, incomplete history, late/out-of-order events: review, no automatic grant.
- Worker disabled: zero financial writes.
- Anonymous or authenticated app client invoking private RPC: deny.
- Existing eight QA inbox events remain unchanged.

## Explicit execution gates
P26-A: implement offline evidence checker and adversarial tests against real P23/P24/P25 contracts; mock tests do not certify PayPal.
P26-B: prepare a migration draft, retention review and rollback plan without applying hosted SQL.
P26-C: request specific Product Owner GO for a scoped hosted Sandbox merchant read. New buyer, PayPal writes, worker enablement, hosted migrations, ledger, benefits, Live, deployments and merging need separate explicit approval.

## P25/P26/P27 integration checkpoint — 2026-10-16

P25 retains its already-tested private **review-only** reservation in disposable PostgreSQL. P26 already implements the **offline** `assessP26FirstObligationEvidence` fail-closed evaluator and P26-B blocked ledger proposal; P27 already composes merchant observations. These are **not** hosted payment writers. The earlier description "specification only" is superseded.

- `p27OfflineProvenanceReview.mjs` now validates event and UUID lease inputs; matches the exact request to the claimed `eventId` and `leaseToken`; then reuses the P26 identity, consent P06 and P25 sale/obligation reservation checks **before any** history, refund or dispute inspection. Invalid owner, stale lease, foreign event, missing original signature, missing consent or inconsistent reservation are rejected without downstream inspections. The final result is always nonfinancial `REVIEW_REQUIRED`/`DENIED`.
- P26 now **denies QA-only terms** even when P06 consent and merchant sale are real: prospective service cannot proceed without independent confirmation of an immutable published offer, `offerPurpose='PAID_SERVICE_PROSPECTIVE'`, `firstPeriodContractAttested=true`, `qaOnly=false`, and terms version not classified as QA. The existing `pazo-supporter-sandbox.qa20261016-v1` was accepted for a non-benefit QA purchase only and **cannot** be promoted into a first paid period. These are offline input requirements, **not attestation by the module**.
- Six additional negative/positive directed synthetic tests added across existing P26 and P27 files (5 P27 flow checks plus P26 QA-only rejection, plus a new P27 QA-only flow check: seven total). Real P25 database concurrency and P26 blocked-credit constraints remain in their **already existing** disposable PG17 test suites; no duplicate tables/SQL or newly installed RPCs.
- Verified on commit `28e509384d7031082abcdf05969a0e8079879a2e`: [CI SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38984326066), [F16 Disposable PostgreSQL Lab SUCCESS](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38984325976). Previous partial commit `cb8f0b6` also passed both workflows.
- Supabase postflight read only: P21 OFF, P42 OFF, P40=0, signing keys=0, ledger=0, reversals=0; **P25/P26 remain NOT installed**. No new PayPal GET, purchase, deployment, migration or financial write. The P42 expiry patch remains **BLOCKED BY TOOL SAFETY**; this P25/P26 branch work does not circumvent it.

**Remaining gate:** a service-offer contractual approval and genuine owner/event/merchant/cycle/refund/dispute attestation plus separate authorized hosted installation/transactional ledger idempotency. Never infer readiness to credit from offline PASS.

**Current status:** P25/P26/P27 offline safety integration PASS, hosted merchant provenance/ledger/entitlements NOT READY; PAZO stays free; optional Amigo membership remains unavailable for new paid-service enrollment.
