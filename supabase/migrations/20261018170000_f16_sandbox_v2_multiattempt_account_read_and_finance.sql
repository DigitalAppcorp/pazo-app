-- PAZO F16: private multiattempt reads + preserve existing verified-cycle
-- accounting on a successor retry. Requires the independently reviewed retry
-- migration first. No grants, no merchant writes, no Live exposure.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$
BEGIN
 IF pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_retry_attempts') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_multi_list_owner_accounts(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 multiattempt baseline mismatch' USING ERRCODE='55000'; END IF;
END $guard$;
-- Read complete, owner-scoped history for exact-intent status, cancellation
-- and immutable accepted-terms acknowledgement. P06 remains a distinct flow.
CREATE FUNCTION public.f16_qa_v2_multi_list_owner_accounts(p_owner_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 WITH records AS (
  SELECT a.created_at AS ordered_at,
   public.f16_qa_v2_read_owner_account(p_owner_id,a.intent_id) AS record
  FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
  WHERE a.owner_id=p_owner_id
  UNION ALL
  SELECT r.created_at AS ordered_at,
   pg_catalog.jsonb_build_object(
    'ownerId',r.owner_id,'intentId',i.intent_id,'provider','paypal',
    'planId',i.plan_id,'state',i.state,
    'externalSubscriptionId',CASE WHEN i.state='bound'
      THEN i.external_subscription_id ELSE NULL END,
    'locale',r.locale,'termsVersion',r.terms_version,
    'termsDigest',r.terms_sha256,'exactCopy',o.exact_copy,
    'consentedAt',r.consented_at,'priceMinor',o.price_minor,
    'currency',o.currency,'cadence',o.cadence,
    'providerCreateClaimed',r.provider_create_claimed_at IS NOT NULL
   ) AS record
  FROM supporter_private.f16_sandbox_qa_v2_retry_attempts r
  JOIN supporter_private.paypal_subscription_intents i
   ON i.intent_id=r.intent_id AND i.owner_id=r.owner_id
   AND i.provider='paypal' AND i.plan_id='P-14V25407JP6850922NLHMDKI'
   AND i.state IN ('pending','bound')
  JOIN supporter_private.paypal_p06_offers o
   ON o.version=r.terms_version AND o.locale=r.locale
   AND o.sha256=r.terms_sha256 AND o.currency='USD'
   AND o.price_minor=299 AND o.cadence='MONTH_1'
  WHERE r.owner_id=p_owner_id
 )
 SELECT COALESCE(pg_catalog.jsonb_agg(s.record ORDER BY s.ordered_at DESC),
   '[]'::jsonb)
 FROM (SELECT ordered_at,record FROM records WHERE record IS NOT NULL
   ORDER BY ordered_at DESC LIMIT 20) s
$fn$;
ALTER FUNCTION public.f16_qa_v2_multi_list_owner_accounts(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_multi_list_owner_accounts(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_multi_list_owner_accounts(uuid)
 TO service_role;

-- Preserve old financial restrictions for V2; include retry consent rows
-- in the same exact-owner verified-cycle and refund/dispute proofs.
CREATE OR REPLACE FUNCTION public.f16_qa_v2_mark_merchant_sale_reversal(p_owner_id uuid, p_intent_id text, p_sale_id text, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_sale supporter_private.f16_sandbox_qa_paid_periods%ROWTYPE;
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL
 OR p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 OR p_sale_id IS NULL OR p_sale_id !~ '^[A-Za-z0-9._-]{6,110}$'
 OR p_reason NOT IN ('refunded','partially_refunded','reversed','disputed')
 THEN RAISE EXCEPTION 'Invalid V2 merchant reversal proof' USING ERRCODE='22023'; END IF;
 SELECT p.* INTO v_sale
 FROM supporter_private.f16_sandbox_qa_paid_periods p
 JOIN (SELECT owner_id,intent_id,terms_version FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
 UNION ALL SELECT owner_id,intent_id,terms_version FROM supporter_private.f16_sandbox_qa_v2_retry_attempts) a
 ON a.owner_id=p.owner_id AND a.terms_version='pazo-supporter-sandbox.benefits-v2'
 JOIN supporter_private.paypal_subscription_intents i
 ON i.intent_id=a.intent_id AND i.owner_id=p.owner_id
 AND i.external_subscription_id=p.provider_subscription_id
 WHERE p.owner_id=p_owner_id AND a.intent_id=p_intent_id AND p.sale_id=p_sale_id
 FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'V2 sale not attached to this Auth owner'
  USING ERRCODE='42501'; END IF;
 INSERT INTO supporter_private.f16_sandbox_qa_holds(sale_id,event_id,reason,verified_at)
 VALUES(p_sale_id,'QA-REVERSAL-'||p_sale_id,p_reason,pg_catalog.clock_timestamp())
 ON CONFLICT (sale_id,event_id) DO UPDATE SET
   reason=EXCLUDED.reason,verified_at=EXCLUDED.verified_at;
 RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public.f16_qa_v2_record_verified_first_cycle(p_owner_id uuid, p_intent_id text, p_sale_id text, p_sale_completed_at timestamp with time zone, p_service_start timestamp with time zone, p_service_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_intent supporter_private.paypal_subscription_intents%ROWTYPE;
 v_existing supporter_private.f16_sandbox_qa_paid_periods%ROWTYPE;
 v_cycle text;
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL
 OR p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 OR p_sale_id IS NULL OR p_sale_id !~ '^[A-Za-z0-9._-]{6,110}$'
 OR p_sale_completed_at IS NULL OR p_service_start IS NULL OR p_service_end IS NULL
 OR p_service_start>pg_catalog.clock_timestamp()
 OR p_service_start<pg_catalog.clock_timestamp()-interval '14 days'
 OR p_service_end<=pg_catalog.clock_timestamp()
 OR p_service_end<p_service_start+interval '27 days'
 OR p_service_end>p_service_start+interval '32 days'
 OR p_sale_completed_at<p_service_start-interval '12 hours'
 OR p_sale_completed_at>p_service_start+interval '7 days'
 OR p_sale_completed_at>pg_catalog.clock_timestamp()+interval '5 minutes'
 THEN RAISE EXCEPTION 'V2 first cycle dates/merchant evidence invalid' USING ERRCODE='22023'; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,16));
 SELECT i.* INTO v_intent
 FROM supporter_private.paypal_subscription_intents i
 JOIN (SELECT owner_id,intent_id,locale,terms_version,terms_sha256,provider_create_claimed_at FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
 UNION ALL SELECT owner_id,intent_id,locale,terms_version,terms_sha256,provider_create_claimed_at FROM supporter_private.f16_sandbox_qa_v2_retry_attempts) a
 ON a.intent_id=i.intent_id AND a.owner_id=i.owner_id
 JOIN supporter_private.f16_sandbox_qa_owners qa ON qa.owner_id=i.owner_id
 JOIN supporter_private.paypal_p06_offers o
 ON o.version=a.terms_version AND o.locale=a.locale AND o.sha256=a.terms_sha256
 WHERE i.owner_id=p_owner_id AND i.intent_id=p_intent_id AND i.state='bound'
 AND i.provider='paypal' AND i.plan_id='P-14V25407JP6850922NLHMDKI'
 AND i.external_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
 AND a.terms_version='pazo-supporter-sandbox.benefits-v2'
 AND a.provider_create_claimed_at IS NOT NULL
 AND o.published_at IS NOT NULL AND o.currency='USD' AND o.price_minor=299
 AND o.cadence='MONTH_1'
 AND qa.status='enabled' AND qa.expires_at>pg_catalog.clock_timestamp()
 FOR UPDATE OF i;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'V2 verified owner, terms or binding absent' USING ERRCODE='42501';
 END IF;
 v_cycle:='QA-FIRST-'||p_intent_id;
 SELECT * INTO v_existing FROM supporter_private.f16_sandbox_qa_paid_periods
 WHERE owner_id=p_owner_id OR sale_id=p_sale_id FOR UPDATE;
 IF FOUND THEN
  IF v_existing.owner_id=p_owner_id AND v_existing.sale_id=p_sale_id
  AND v_existing.provider_subscription_id=v_intent.external_subscription_id
  AND v_existing.cycle_key=v_cycle
  AND v_existing.service_start=p_service_start
  AND v_existing.service_end=p_service_end
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_holds h
   WHERE h.sale_id=p_sale_id)
  THEN RETURN pg_catalog.jsonb_build_object('phase','already_verified',
   'cycleVerified',true,'periodEnd',v_existing.service_end);
  END IF;
  RAISE EXCEPTION 'V2 duplicate or conflicting paid cycle' USING ERRCODE='23505';
 END IF;
 INSERT INTO supporter_private.f16_sandbox_qa_paid_periods(
  sale_id,event_id,provider_subscription_id,owner_id,cycle_key,
  accepted_offer_version,provider_environment,amount_minor,currency,
  service_start,service_end,merchant_verified_at
 ) VALUES(p_sale_id,'QA-MERCHANT-GET-'||p_sale_id,
 v_intent.external_subscription_id,p_owner_id,v_cycle,
 'pazo-supporter-sandbox.benefits-v2','sandbox',299,'USD',
 p_service_start,p_service_end,pg_catalog.clock_timestamp());
 RETURN pg_catalog.jsonb_build_object('phase','verified_first_sandbox_cycle',
   'cycleVerified',true,'periodEnd',p_service_end);
END $function$;

DO $check$
BEGIN
 IF pg_catalog.has_function_privilege('authenticated',
  'public.f16_qa_v2_multi_list_owner_accounts(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
  'public.f16_qa_v2_multi_list_owner_accounts(uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
  'public.f16_qa_v2_multi_list_owner_accounts(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 multiattempt RPC ACL mismatch' USING ERRCODE='42501'; END IF;
END $check$;
COMMIT;
