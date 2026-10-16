# PAZO F16-P28 — Historical evidence read-only gate (2026-10-15)

## Observed state
- Hosted P21 gate is OFF. Operator-read Edge v2 is hard-disabled.
- Verified inbox: 8 pending, 0 claimed; 2 event-type PAYMENT.SALE.COMPLETED.
- Hosted P22 bound-intent RPC installed, service_role EXECUTE only.
- Historical events cannot satisfy P21's prospective signed claim and must not be relabeled as fresh/paid.
- CI for operator auth boundary and disposable PG lab must be verified before any next operation.

## Review design: no worker or entitlement
1. A separate, server-only *historical candidate inventory* may query minimal inbox metadata by exact IDs, using authenticated operator authorisation and an auditable request identifier. No owner/payment IDs in public responses.
2. Inventory is **NOT** P21 claim and MUST NOT create/refresh claim_token, alter verified_at, next_attempt_at, processing_state, retention_hold, gate cutoff, or financial ledgers.
3. Event + subscription merchant GET correlation requires a separate non-P21 historical validation protocol, proof of webhook signature provenance, permission to access PayPal Sandbox merchant resources, original subscription binding and original consent, and a bounded history of reversals/disputes. No such protocol is presently implemented or approved.
4. Therefore do NOT route historic events into P28 current lease reader, change enabled=false, enable P21, create dummy buyers, or record payments. Any operator activation / hosted deployment requires a new scope-specific PO GO.
5. Next technical work is mock-only unit tests for inventory/auth decisions and privacy redaction. Next hosted operation, if approved separately, limited to exact-ID metadata read with negative controls and no new financial authority.

## Exit criteria
- Prove auth before data retrieval; no enumeration, no merchant or DB side effects for bad tokens.
- Strictly separate historical evidence candidates from prospectively claimable events.
- No claims that a paid cycle is verified without original sale/refund/dispute/legal/period proof.
