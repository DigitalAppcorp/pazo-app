-- PAZO F16 — aggregate delivery-recovery visibility, read-only, no personal data.
-- The inbox contains only events whose PayPal signatures were verified and
-- whose minimal event reference was persisted. A missed/undelivered event
-- does NOT appear here: compare separately with the PayPal Sandbox dashboard.
SELECT
 count(*)::bigint AS verified_inbox_total,
 count(*) FILTER (WHERE processing_state='pending')::bigint AS pending,
 count(*) FILTER (WHERE processing_state='processing')::bigint AS processing,
 count(*) FILTER (WHERE processing_state='quarantined')::bigint AS quarantined,
 count(*) FILTER (WHERE processing_state='processed')::bigint AS processed,
 count(*) FILTER (WHERE retention_hold)::bigint AS retention_hold,
 count(*) FILTER (WHERE next_attempt_at<=clock_timestamp() AND processing_state IN ('pending','processing'))::bigint AS due_for_internal_reconciliation,
 (SELECT COALESCE(SUM(admitted),0)::bigint
  FROM supporter_private.f16_webhook_request_budget) AS total_global_budget_admissions,
 (SELECT count(*)::bigint
  FROM supporter_private.paypal_payment_entries) AS payment_entries,
 (SELECT count(*)::bigint
  FROM supporter_private.paypal_payment_reversals) AS reversals
FROM supporter_private.paypal_verified_event_inbox;
