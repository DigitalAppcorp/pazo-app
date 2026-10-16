# F16-P38 — P21 activation claim: SQL contract review (NO-GO hosted)

The last P37 CI and PG17 runs passed: 38854397802 and 38854397647.
P21's current read_claimed_event returns only id, type, verifiedAt and processingState.
The P37 adapter requires independent subscription identity, verified signature
provenance, active lease and source origin. These attributes cannot be fabricated.

## Proposed PG17-only gate
1. First inspect verified inbox and private intent schemas for an authoritative
   activation→subscription binding. A textual subscription ID supplied by
   a privileged caller is not sufficient.
2. Under the disabled-by-default P21 worker, use a strictly leased and
   prospectively eligible activation event. The existing read RPC does not
   establish whether a claimed activation event is linked to the same
   subscription as the separately claimed SALE.
3. Reconcile both claims and subscription ownership server-side; reject
   mismatched events, tokens, owners, inactive/expired leases or absent
   proof of webhook signature validation.
4. Return only a minimal boolean or bounded projection from a reviewed
   SECURITY DEFINER RPC; do not return secrets, payer data or raw events.
5. Test in disposable PostgreSQL before proposing hosted SQL. Any migration,
   new grants, worker activation or PayPal requests require distinct PO GO.

## Explicit blocker
A safe SQL implementation cannot be inferred merely from the P21 fixture:
it recreates only preexisting inbox columns, not a trusted
activation→subscription relationship. Until this provenance is confirmed
in the actual model, P37 remains offline and disabled.

P28 deferred. No ledger entries, checkout, charges, worker or benefits.
