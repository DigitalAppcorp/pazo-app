-- Sandbox QA ONLY. PAZO Product Owner approved resetting abandoned,
-- unpaid, disposable buyer attempts. NOT a PayPal cancellation and NEVER
-- a merchant-terminal/no-collectible proof or a benefit/charge grant.
-- The original immutable intent + signed webhook remain for reconciliation.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$ BEGIN
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_checkout_reset_archive') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_abandonment_preflight(uuid,text)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_read_created_webhook_candidate_multi(uuid,text)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 Sandbox pending approval restart baseline mismatch'
   USING ERRCODE='55000'; END IF;
END $guard$;

CREATE FUNCTION public.f16_qa_v2_archive_pending_approval_qa(
 p_owner_id uuid,p_intent_id text,p_subscription_id text,p_provider_checked_at timestamptz)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 a supporter_private.f16_sandbox_qa_v2_checkout_attempts%ROWTYPE;
 i supporter_private.paypal_subscription_intents%ROWTYPE;
 now_at timestamptz:=pg_catalog.clock_timestamp();
 archived_count integer:=0;
 deleted_count integer:=0;
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL OR
 p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 OR p_subscription_id IS NULL OR p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 OR p_provider_checked_at IS NULL
 OR p_provider_checked_at<now_at-interval '20 seconds'
 OR p_provider_checked_at>now_at+interval '5 seconds'
 THEN RETURN false; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 SELECT * INTO a FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
  WHERE owner_id=p_owner_id AND intent_id=p_intent_id FOR UPDATE;
 IF NOT FOUND OR a.created_at>now_at-interval '90 seconds'
 OR a.created_at<now_at-interval '30 days'
 OR a.provider_create_claimed_at IS NULL
 OR a.retention_hold IS DISTINCT FROM true
 THEN RETURN false; END IF;

 SELECT * INTO i FROM supporter_private.paypal_subscription_intents
  WHERE owner_id=p_owner_id AND intent_id=p_intent_id;
 IF NOT FOUND OR i.state<>'bound' OR i.provider<>'paypal'
  OR i.plan_id<>'P-14V25407JP6850922NLHMDKI'
  OR i.external_subscription_id IS DISTINCT FROM p_subscription_id
 THEN RETURN false; END IF;

 IF NOT public.f16_qa_v2_abandonment_preflight(p_owner_id,p_intent_id)
 OR public.f16_qa_v2_read_created_webhook_candidate_multi(p_owner_id,p_intent_id) IS NULL
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts r
    WHERE r.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
    WHERE g.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p
    WHERE p.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p
    WHERE p.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings b
    WHERE b.owner_id=p_owner_id)
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_checkout_reset_archive z
    WHERE z.owner_id=p_owner_id)>=5
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_checkout_reset_archive z
    WHERE z.owner_id=p_owner_id AND z.intent_id=p_intent_id)
 THEN RETURN false; END IF;

 INSERT INTO supporter_private.f16_sandbox_qa_checkout_reset_archive
  (owner_id,intent_id,original_attempt,original_intent,reason)
 VALUES(p_owner_id,p_intent_id,pg_catalog.to_jsonb(a),pg_catalog.to_jsonb(i),
  'sandbox_buyer_abandoned_unapproved_checkout_verified_pending_not_cancelled')
 ON CONFLICT (owner_id,intent_id) DO NOTHING;
 GET DIAGNOSTICS archived_count=ROW_COUNT;
 IF archived_count<>1 THEN RAISE EXCEPTION 'QA archive insert mismatch' USING ERRCODE='55000'; END IF;
 DELETE FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
  WHERE owner_id=p_owner_id AND intent_id=p_intent_id;
 GET DIAGNOSTICS deleted_count=ROW_COUNT;
 IF deleted_count<>1 THEN RAISE EXCEPTION 'QA archive removal mismatch' USING ERRCODE='55000'; END IF;

 -- The original merchant subscription remains APPROVAL_PENDING, not
 -- CANCELLED. No payment, credit, entitlement or retry grant is minted.
 RETURN true;
END $fn$;

ALTER FUNCTION public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz)
 TO service_role;
DO $post$ BEGIN
 IF pg_catalog.has_function_privilege('anon',
 'public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
 'public.f16_qa_v2_archive_pending_approval_qa(uuid,text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'Sandbox restart ACL invalid' USING ERRCODE='42501'; END IF;
END $post$;
COMMIT;
