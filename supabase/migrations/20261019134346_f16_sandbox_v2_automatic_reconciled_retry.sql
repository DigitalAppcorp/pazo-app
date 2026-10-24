-- F16 Sandbox ONLY: bounded merchant-proof retry, preserving append-only
-- intent chain. Does NOT assert that a missing PayPal GET alone is safe.
-- Edge must separately verify exact app's signed CREATED event, complete
-- merchant event list, full inventory for 404, terminal orphans, and zero
-- transaction evidence for terminal subscriptions before calling this RPC.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$ BEGIN
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_retry_grants') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_retry_attempts') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_retry_eligibility(uuid)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz)') IS NOT NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_read_created_webhook_candidate_multi(uuid,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 auto retry baseline mismatch' USING ERRCODE='55000'; END IF;
END $guard$;

-- Distinct service-only read: original + all future append-only attempts.
CREATE FUNCTION public.f16_qa_v2_read_created_webhook_candidate_multi(
 p_owner_id uuid,p_intent_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 WITH started AS (
  SELECT created_at,owner_id,intent_id FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
  UNION ALL
  SELECT created_at,owner_id,intent_id FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
 ), eligible AS (
  SELECT a.created_at FROM started a
  JOIN supporter_private.paypal_subscription_intents i
   ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
  JOIN supporter_private.f16_sandbox_qa_owners q ON q.owner_id=a.owner_id
  WHERE a.owner_id=p_owner_id AND a.intent_id=p_intent_id
   AND i.state='bound' AND i.external_subscription_id IS NOT NULL
   AND q.status='enabled' AND q.expires_at>pg_catalog.clock_timestamp()
 ), candidates AS (
  SELECT e.provider_event_id,e.verified_at
  FROM eligible a JOIN supporter_private.paypal_verified_event_inbox e
   ON e.event_type='BILLING.SUBSCRIPTION.CREATED'
   AND e.retention_hold IS TRUE
   AND e.verified_at>=a.created_at-interval '30 seconds'
   AND e.verified_at<a.created_at+interval '5 minutes'
 ), total AS (
  SELECT count(*) n,max(provider_event_id) event_id,max(verified_at) timestamp_utc FROM candidates
 )
 SELECT CASE WHEN (SELECT count(*) FROM eligible)=1 AND n=1
  THEN pg_catalog.jsonb_build_object(
   'eventId',event_id,'eventType','BILLING.SUBSCRIPTION.CREATED',
   'verifiedAt',timestamp_utc)
  ELSE NULL END FROM total
$fn$;

-- Only attested Edge server can issue an evidence-bound grant. The RPC
-- re-verifies owner, current intent, no financial record, and no unresolved
-- earlier retry inside the same transaction/advisory lock.
CREATE FUNCTION public.f16_qa_v2_issue_reconciled_retry(
 p_owner_id uuid,p_intent_id text,p_subscription_id text,
 p_resolution text,p_evidence_digest text,p_checked_at timestamptz)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 s record;
 now_at timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL
 OR p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 OR p_subscription_id IS NULL OR p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 OR p_resolution NOT IN ('CANCELLED','EXPIRED','MERCHANT_CONFIRMED_ABSENT')
 OR p_evidence_digest IS NULL OR p_evidence_digest !~ '^[a-f0-9]{64}$'
 OR p_checked_at IS NULL OR p_checked_at<now_at-interval '2 minutes'
 OR p_checked_at>now_at+interval '10 seconds'
 THEN RETURN false; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 SELECT x.owner_id,x.intent_id,x.created_at,i.external_subscription_id INTO s
 FROM (
  SELECT owner_id,intent_id,created_at,provider_create_claimed_at
   FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
  UNION ALL
  SELECT owner_id,intent_id,created_at,provider_create_claimed_at
   FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
 ) x
 JOIN supporter_private.paypal_subscription_intents i
  ON i.owner_id=x.owner_id AND i.intent_id=x.intent_id
 JOIN supporter_private.f16_sandbox_qa_owners q ON q.owner_id=x.owner_id
 JOIN auth.users u ON u.id=x.owner_id
 WHERE x.owner_id=p_owner_id AND x.intent_id=p_intent_id
  AND x.provider_create_claimed_at IS NOT NULL
  AND x.created_at < now_at-interval '1 minute'
  AND x.created_at > now_at-interval '30 days'
  AND i.provider='paypal' AND i.state='bound'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND i.external_subscription_id=p_subscription_id
  AND q.status='enabled' AND q.expires_at>now_at
  AND u.email_confirmed_at IS NOT NULL AND u.is_anonymous IS DISTINCT FROM true;
 IF NOT FOUND THEN RETURN false; END IF;
 -- The source must be latest; don't mint a grant for an older subscription
 -- after a newer one exists or an earlier retry grant remains unresolved.
 IF EXISTS(SELECT 1 FROM (
   SELECT owner_id,intent_id,created_at FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
   UNION ALL SELECT owner_id,intent_id,created_at FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
  ) x WHERE x.owner_id=p_owner_id AND x.intent_id<>p_intent_id
   AND x.created_at>s.created_at) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
  WHERE g.owner_id=p_owner_id AND g.predecessor_intent_id=p_intent_id) THEN
  RETURN public.f16_qa_v2_retry_eligibility(p_owner_id); END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
  WHERE g.owner_id=p_owner_id AND g.approved_at IS NULL)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p
  WHERE p.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p
  WHERE p.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings b
  WHERE b.owner_id=p_owner_id)
 THEN RETURN false; END IF;
 INSERT INTO supporter_private.f16_sandbox_qa_v2_retry_grants (
  owner_id,predecessor_intent_id,predecessor_subscription_id,resolution,
  merchant_scope_verified,merchant_terminal_verified,
  all_transactions_reconciled,webhook_inbox_reconciled,
  no_outstanding_charge,no_collectible_subscription,
  evidence_digest,provider_checked_at,reconciliation_checked_at,approved_at
 ) VALUES (
  p_owner_id,p_intent_id,p_subscription_id,p_resolution,
  true,true,true,true,true,true,p_evidence_digest,p_checked_at,p_checked_at,now_at
 );
 RETURN true;
END $fn$;

ALTER FUNCTION public.f16_qa_v2_read_created_webhook_candidate_multi(uuid,text) OWNER TO postgres;
ALTER FUNCTION public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_read_created_webhook_candidate_multi(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_read_created_webhook_candidate_multi(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz) TO service_role;
DO $post$ BEGIN
 IF pg_catalog.has_function_privilege('anon',
  'public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
  'public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
  'public.f16_qa_v2_issue_reconciled_retry(uuid,text,text,text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 auto retry ACL mismatch' USING ERRCODE='42501'; END IF;
END $post$;
COMMIT;
