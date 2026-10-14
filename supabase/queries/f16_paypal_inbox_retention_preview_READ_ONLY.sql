-- PAZO F16: OPERATOR-ONLY preview, NO DELETE and NO mutation.
-- Policy approved by PO: 90 days after definitive reconciliation.
-- When there is no validated ledger/worker, retention_hold stays TRUE;
-- therefore the preview must report ZERO eligible rows.
-- This is a count-only view. Do not use as a purge authorization.
BEGIN READ ONLY;
SELECT
  pg_catalog.count(*) FILTER (WHERE
    e.processing_state = 'processed'
    AND e.processed_at IS NOT NULL
    AND e.retention_hold IS FALSE
    AND e.retention_released_at IS NOT NULL
    AND pg_catalog.greatest(e.processed_at,e.retention_released_at)
      <= pg_catalog.now() - INTERVAL '90 days'
  )::bigint AS eligible_preview_only,
  pg_catalog.count(*) FILTER (
    WHERE e.retention_hold IS TRUE
  )::bigint AS protected_by_hold,
  pg_catalog.count(*) FILTER (
    WHERE e.processing_state IN ('pending','processing','quarantined')
  )::bigint AS nonterminal_or_disputed
FROM supporter_private.paypal_verified_event_inbox AS e;
ROLLBACK;
