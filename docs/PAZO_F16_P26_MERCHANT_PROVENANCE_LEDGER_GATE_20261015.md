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

Current status: P25 laboratory PASS per existing repo evidence; P26 specification only, NO runtime implementation or provider verification. PAZO stays free; Amigo de PAZO optional and unavailable for new purchases.
