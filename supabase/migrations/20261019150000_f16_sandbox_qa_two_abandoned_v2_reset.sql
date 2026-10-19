-- PAZO F16 - PO-approved one-time reset of checkout blockers for
-- exactly TWO existing no-verified-payment Sandbox QA owners.
-- Keeps auth users, pets, immutable PayPal subscription intents, merchant
-- IDs, historical legacy P06 attempts, paid cycles, and signed webhooks.
-- The archived V2 consent records retain their retention_hold evidence
-- in the private schema; normal QA list/begin no longer sees them.
-- NOT a reusable administrative reset API. Never use in PayPal Live.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '25s';
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

CREATE TABLE IF NOT EXISTS supporter_private.f16_sandbox_qa_checkout_reset_archive (
 owner_id uuid NOT NULL,
 intent_id text NOT NULL,
 original_attempt jsonb NOT NULL,
 original_intent jsonb NOT NULL,
 archived_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 reason text NOT NULL DEFAULT 'po_approved_sandbox_abandoned_no_verified_payment_reset_20261019',
 PRIMARY KEY (owner_id,intent_id)
);
REVOKE ALL ON TABLE supporter_private.f16_sandbox_qa_checkout_reset_archive
 FROM PUBLIC, anon, authenticated, service_role;

DO $f16reset$
DECLARE
 candidate_count integer;
 archived_count integer;
 removed_count integer;
 r record;
BEGIN
 -- Exact one-shot environment and schema contract. Abort on any drift.
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_paid_periods') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'F16 sandbox QA baseline unavailable' USING ERRCODE='55000'; END IF;
 
 -- Lock the exact two un-paid Sandbox accounts to prevent concurrent
 -- checkout mutations while the private session view is reset.
 FOR r IN
  SELECT a.owner_id,a.intent_id FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
  JOIN supporter_private.f16_sandbox_qa_owners q ON q.owner_id=a.owner_id
  JOIN auth.users u ON u.id=a.owner_id
  JOIN supporter_private.paypal_subscription_intents i
   ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
  WHERE a.created_at>='2026-10-17T00:00:00Z'::timestamptz
   AND a.created_at<'2026-10-20T00:00:00Z'::timestamptz
   AND a.created_at<pg_catalog.clock_timestamp()-interval '2 hours'
   AND q.status='enabled'
   AND i.provider='paypal' AND i.plan_id='P-14V25407JP6850922NLHMDKI'
   AND i.state='bound' AND i.external_subscription_id IS NOT NULL
   AND a.retention_hold IS TRUE
   AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p
    WHERE p.owner_id=a.owner_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p
    WHERE p.owner_id=a.owner_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings p
    WHERE p.owner_id=a.owner_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts p
    WHERE p.owner_id=a.owner_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants p
    WHERE p.owner_id=a.owner_id)
   ORDER BY a.owner_id
 LOOP
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.owner_id::text,0));
 END LOOP;

 WITH candidates AS (
 SELECT a.owner_id,a.intent_id FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
 JOIN supporter_private.f16_sandbox_qa_owners q ON q.owner_id=a.owner_id
 JOIN supporter_private.paypal_subscription_intents i ON i.owner_id=a.owner_id AND i.intent_id=a.intent_id
 WHERE a.created_at>='2026-10-17T00:00:00Z'::timestamptz
  AND a.created_at<'2026-10-20T00:00:00Z'::timestamptz
  AND a.created_at<pg_catalog.clock_timestamp()-interval '2 hours'
  AND q.status='enabled' AND a.retention_hold IS TRUE
  AND i.state='bound' AND i.provider='paypal'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants p WHERE p.owner_id=a.owner_id)
 ) SELECT count(*) INTO candidate_count FROM candidates;
 IF candidate_count <> 2 OR
  (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)<>3
 THEN RAISE EXCEPTION 'F16 reset exact two-eligible-owner gate failed (found %)',candidate_count
  USING ERRCODE='55000'; END IF;

 INSERT INTO supporter_private.f16_sandbox_qa_checkout_reset_archive
 (owner_id,intent_id,original_attempt,original_intent)
 SELECT a.owner_id,a.intent_id,pg_catalog.to_jsonb(a),pg_catalog.to_jsonb(i)
 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
 JOIN supporter_private.paypal_subscription_intents i ON i.owner_id=a.owner_id AND i.intent_id=a.intent_id
 WHERE NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants p WHERE p.owner_id=a.owner_id)
  AND a.created_at>='2026-10-17T00:00:00Z'::timestamptz
  AND a.created_at<'2026-10-20T00:00:00Z'::timestamptz
  AND a.created_at<pg_catalog.clock_timestamp()-interval '2 hours'
  AND a.retention_hold IS TRUE
  AND EXISTS (SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q WHERE q.owner_id=a.owner_id AND q.status='enabled')
 ON CONFLICT (owner_id,intent_id) DO NOTHING;
 GET DIAGNOSTICS archived_count=ROW_COUNT;
 IF archived_count<>2 THEN RAISE EXCEPTION 'F16 reset archive gate failed' USING ERRCODE='55000'; END IF;

 DELETE FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
 USING supporter_private.f16_sandbox_qa_checkout_reset_archive z
 WHERE a.owner_id=z.owner_id AND a.intent_id=z.intent_id
  AND z.reason='po_approved_sandbox_abandoned_no_verified_payment_reset_20261019'
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants p WHERE p.owner_id=a.owner_id)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts p WHERE p.owner_id=a.owner_id);
 GET DIAGNOSTICS removed_count=ROW_COUNT;
 IF removed_count<>2 THEN RAISE EXCEPTION 'F16 reset exact deletion count mismatch %',removed_count USING ERRCODE='55000'; END IF;

 -- No deleted owner should remain visible as having a current V2 account.
 IF EXISTS(
  SELECT 1 FROM supporter_private.f16_sandbox_qa_checkout_reset_archive z
  JOIN supporter_private.f16_sandbox_qa_v2_checkout_attempts a ON a.owner_id=z.owner_id
 ) OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)<>1
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_checkout_reset_archive)<>2
 THEN RAISE EXCEPTION 'F16 post-delete state mismatch' USING ERRCODE='55000'; END IF;
END $f16reset$;
COMMIT;
