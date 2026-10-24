-- F16 Sandbox: allow an Auth-backed, explicitly allowlisted QA owner without
-- requiring the previous P06 checkout. PREPARED ONLY; do not apply without
-- a separately authorized PO migration GO. No new Auth user or allowlist
-- row is created by this migration. No PayPal subscriptions or paid periods.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_owner_can_checkout(uuid)') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_owners') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NULL
 OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(
   'public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)'::regprocedure),
   'Existing-owner v2 requires an intact historical v1 record')=0
 OR pg_catalog.strpos(pg_catalog.pg_get_functiondef(
   'public.f16_qa_v2_owner_can_checkout(uuid)'::regprocedure),
   'paypal_p06_checkout_attempts')=0
 THEN RAISE EXCEPTION 'F16 fresh-owner QA SQL baseline mismatch'
   USING ERRCODE='55000'; END IF;
END $guard$;

-- Preserves exact-owner Auth+private allowlist+expiry, with no legacy P06
-- purchase prerequisite. One original V2 attempt per owner remains.
CREATE OR REPLACE FUNCTION public.f16_qa_v2_owner_can_checkout(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(
 SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
 JOIN auth.users u ON u.id=q.owner_id
 WHERE q.owner_id=p_owner_id AND q.status='enabled'
 AND q.expires_at>pg_catalog.clock_timestamp()
 )
$fn$;

CREATE OR REPLACE FUNCTION public.f16_qa_v2_begin_checkout(
 p_owner_id uuid,p_request_key uuid,p_locale text,
 p_terms_version text,p_terms_digest text,p_affirmative boolean
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 stored supporter_private.paypal_subscription_intents%ROWTYPE;
 a supporter_private.f16_sandbox_qa_v2_checkout_attempts%ROWTYPE;
 offer supporter_private.paypal_p06_offers%ROWTYPE;
 new_id text;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL
 OR p_locale NOT IN ('es','en')
 OR p_terms_version IS DISTINCT FROM 'pazo-supporter-sandbox.benefits-v2'
 OR p_terms_digest IS NULL OR p_terms_digest !~ '^[a-f0-9]{64}$'
 OR p_affirmative IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Explicit four-benefit QA consent required' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
    JOIN auth.users u ON u.id=q.owner_id
    WHERE q.owner_id=p_owner_id AND q.status='enabled'
      AND q.expires_at>pg_catalog.clock_timestamp())
 THEN RAISE EXCEPTION 'QA owner not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.locale IS DISTINCT FROM p_locale
   OR a.terms_version IS DISTINCT FROM p_terms_version
   OR a.terms_sha256 IS DISTINCT FROM p_terms_digest
  THEN RAISE EXCEPTION 'V2 idempotency conflict' USING ERRCODE='22023'; END IF;
  SELECT * INTO stored FROM supporter_private.paypal_subscription_intents
   WHERE owner_id=p_owner_id AND intent_id=a.intent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'V2 intent disappeared' USING ERRCODE='23503'; END IF;
  RETURN pg_catalog.jsonb_build_object('ownerId',p_owner_id,
   'intentId',stored.intent_id,'planId',stored.plan_id,
   'requestKey',a.request_key,'locale',a.locale,
   'termsVersion',a.terms_version,'termsDigest',a.terms_sha256,
   'createdAt',a.created_at,'state',stored.state);
 END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
   WHERE owner_id=p_owner_id)
 THEN RAISE EXCEPTION 'One v2 attempt per owner' USING ERRCODE='23505'; END IF;
 SELECT * INTO offer FROM supporter_private.paypal_p06_offers
 WHERE version=p_terms_version AND locale=p_locale
  AND sha256=p_terms_digest AND published_at IS NOT NULL
  AND plan_id='P-14V25407JP6850922NLHMDKI'
  AND currency='USD' AND price_minor=299 AND cadence='MONTH_1'
  AND EXISTS (SELECT 1 FROM supporter_private.paypal_p06_offers c
   WHERE c.version=p_terms_version AND c.locale<>p_locale
     AND c.published_at IS NOT NULL
     AND c.plan_id='P-14V25407JP6850922NLHMDKI'
     AND c.currency='USD' AND c.price_minor=299 AND c.cadence='MONTH_1');
 IF NOT FOUND THEN RAISE EXCEPTION 'New bilingual QA terms not published'
   USING ERRCODE='42501'; END IF;
 new_id:='intent-'||pg_catalog.gen_random_uuid()::text;
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,provider,plan_id,state)
 VALUES(new_id,p_owner_id,'paypal','P-14V25407JP6850922NLHMDKI','pending');
 INSERT INTO supporter_private.f16_sandbox_qa_v2_checkout_attempts
  (owner_id,request_key,intent_id,locale,terms_version,terms_sha256)
 VALUES(p_owner_id,p_request_key,new_id,p_locale,p_terms_version,p_terms_digest);
 RETURN pg_catalog.jsonb_build_object('ownerId',p_owner_id,'intentId',new_id,
   'planId','P-14V25407JP6850922NLHMDKI','requestKey',p_request_key,
   'locale',p_locale,'termsVersion',p_terms_version,'termsDigest',p_terms_digest,
   'createdAt',pg_catalog.clock_timestamp(),'state','pending');
END $fn$;

-- Preserve the server-only boundary even after CREATE OR REPLACE.
REVOKE ALL ON FUNCTION public.f16_qa_v2_owner_can_checkout(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_owner_can_checkout(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)
 TO service_role;
DO $post$
BEGIN
 IF pg_catalog.has_function_privilege('anon','public.f16_qa_v2_owner_can_checkout(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated','public.f16_qa_v2_owner_can_checkout(uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role','public.f16_qa_v2_owner_can_checkout(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon','public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated','public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role','public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants)
 THEN RAISE EXCEPTION 'F16 fresh-owner QA ACL or financial controls drift' USING ERRCODE='55000'; END IF;
END $post$;
COMMIT;
