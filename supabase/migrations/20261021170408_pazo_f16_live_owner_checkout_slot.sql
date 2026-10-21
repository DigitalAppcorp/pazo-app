-- One open checkout per owner, including across merchant generations.
-- Metadata/leases only. No PayPal request or release switch is activated here.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF (SELECT md5(replace(prosrc,E'\r','')) FROM pg_proc WHERE oid=
  'public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text)'::regprocedure)
   IS DISTINCT FROM '443488a16a464b9b0e3d962e150f0c56' OR
  (SELECT md5(replace(prosrc,E'\r','')) FROM pg_proc WHERE oid=
  'public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint)'::regprocedure)
   IS DISTINCT FROM '0b0b5503361b525fc786e24625213f50' OR
  (SELECT md5(replace(prosrc,E'\r','')) FROM pg_proc WHERE oid=
  'public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb)'::regprocedure)
   IS DISTINCT FROM '0535d6e49a5ca11ca1e396909df95280'
 THEN RAISE EXCEPTION 'owner checkout bridge source drift'; END IF;
 IF to_regclass('supporter_private.pazo_live_offer_versions') IS NULL OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents) OR
  NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND NOT processing_enabled) OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton
   AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'owner checkout slot prerequisite drift'; END IF;
END $guard$;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents
 ADD COLUMN closed_at timestamptz,
 ADD COLUMN closed_reason text CHECK(closed_reason IN('unclaimed_abandoned','provider_terminal_reconciled')),
 ADD COLUMN provider_request_origin text CHECK(provider_request_origin ~ '^https://[a-z0-9][a-z0-9.-]{1,240}$'),
 ADD COLUMN provider_request_version text CHECK(provider_request_version='pazo_subscription_create_v1'),
 ADD COLUMN recovery_lease uuid,ADD COLUMN recovery_expires_at timestamptz,
 ADD COLUMN recovery_attempts integer NOT NULL DEFAULT 0 CHECK(recovery_attempts BETWEEN 0 AND 3),
 ADD COLUMN last_recovery_at timestamptz,
 ADD CONSTRAINT pazo_live_closed_slot_pair CHECK((closed_at IS NULL)=(closed_reason IS NULL)),
 ADD CONSTRAINT pazo_live_original_request_pair CHECK((provider_request_origin IS NULL)=(provider_request_version IS NULL)),
 ADD CONSTRAINT pazo_live_recovery_lease_pair CHECK((recovery_lease IS NULL)=(recovery_expires_at IS NULL));
CREATE UNIQUE INDEX pazo_live_one_open_owner_checkout ON supporter_private.pazo_paypal_live_checkout_intents(owner_id)
 WHERE closed_at IS NULL;
CREATE FUNCTION supporter_private.pazo_live_original_provider_request_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $original$
BEGIN
 IF (OLD.provider_request_origin IS NOT NULL AND
   ROW(NEW.provider_request_origin,NEW.provider_request_version) IS DISTINCT FROM ROW(OLD.provider_request_origin,OLD.provider_request_version)) OR
  (OLD.closed_at IS NOT NULL AND ROW(NEW.closed_at,NEW.closed_reason) IS DISTINCT FROM ROW(OLD.closed_at,OLD.closed_reason)) OR
  (NEW.closed_at IS NOT NULL AND (NEW.recovery_lease IS NOT NULL OR NEW.recovery_expires_at IS NOT NULL))
 THEN RAISE EXCEPTION 'original Live provider request or closed slot is immutable' USING ERRCODE='23514'; END IF;
 IF NEW.state='bound' THEN NEW.recovery_lease:=NULL;NEW.recovery_expires_at:=NULL; END IF;
 RETURN NEW;
END $original$;
CREATE TRIGGER pazo_live_original_provider_request_immutable BEFORE UPDATE ON supporter_private.pazo_paypal_live_checkout_intents
 FOR EACH ROW EXECUTE FUNCTION supporter_private.pazo_live_original_provider_request_immutable();
REVOKE ALL ON FUNCTION supporter_private.pazo_live_original_provider_request_immutable() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_checkout_begin(
 p_owner uuid,p_request_key uuid,p_generation bigint,p_locale text,p_terms_version text,p_terms_digest text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $begin$
DECLARE current supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_request_key IS NULL THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','invalid_consent'); END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1602));
 SELECT * INTO current FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND request_key=p_request_key;
 IF FOUND AND current.closed_at IS NOT NULL
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','closed_checkout_requires_new_consent'); END IF;
 SELECT * INTO current FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND closed_at IS NULL;
 IF FOUND AND current.request_key<>p_request_key
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','owner_slot_occupied'); END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_live_offer_versions WHERE terms_version=p_terms_version
  AND locale=p_locale AND terms_digest=p_terms_digest)
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','published_terms_unverified'); END IF;
 IF current.intent_id IS NULL AND EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
  JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
  WHERE i.owner_id=p_owner AND p.service_start<=pg_catalog.clock_timestamp() AND p.service_end>pg_catalog.clock_timestamp()
   AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h WHERE h.sale_id=p.sale_id AND h.released_at IS NULL))
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','verified_coverage_still_active'); END IF;
 RETURN supporter_private.pazo_live_intent_begin(p_owner,p_request_key,p_generation,p_locale,p_terms_version,p_terms_digest);
END $begin$;

CREATE FUNCTION public.pazo_f16_live_service_provider_claim_with_origin(
 p_owner uuid,p_intent text,p_request_key uuid,p_generation bigint,p_origin text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $claim$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; claimed boolean;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR p_request_key IS NULL OR p_generation IS NULL OR p_origin IS NULL
  OR p_origin !~ '^https://[a-z0-9][a-z0-9.-]{1,240}$' THEN RETURN false; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND intent_id=p_intent
  AND request_key=p_request_key AND merchant_generation=p_generation AND closed_at IS NULL FOR UPDATE;
 IF NOT FOUND OR i.provider_create_claimed_at IS NOT NULL OR i.provider_request_origin IS NOT NULL OR
  NOT EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings WHERE environment='live' AND plan_id=i.plan_id AND return_origin=p_origin) OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=i.merchant_generation
   AND environment='live' AND plan_id=i.plan_id AND retired_at IS NULL)
 THEN RETURN false; END IF;
 claimed:=supporter_private.pazo_live_intent_claim_once(p_owner,p_intent,p_request_key,p_generation);
 IF NOT claimed THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_request_origin=p_origin,
  provider_request_version='pazo_subscription_create_v1' WHERE intent_id=p_intent;
 RETURN true;
END $claim$;
-- A create without its exact original return URL is no longer admissible.
REVOKE EXECUTE ON FUNCTION public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint) FROM service_role;

CREATE FUNCTION public.pazo_f16_live_service_owner_checkouts_read(p_owner uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $read$
DECLARE accounts jsonb; current_id text;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL THEN RETURN NULL; END IF;
 SELECT intent_id INTO current_id FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND closed_at IS NULL;
 SELECT COALESCE(pg_catalog.jsonb_agg(x.data ORDER BY x.created_at DESC),'[]'::jsonb) INTO accounts FROM(
  SELECT i.created_at,pg_catalog.jsonb_build_object('intentId',i.intent_id,'requestKey',i.request_key,
   'merchantGeneration',i.merchant_generation,'planId',i.plan_id,'subscriptionId',i.provider_subscription_id,
   'state',i.state,'createdAt',i.created_at,'locale',i.locale,'termsVersion',i.terms_version,'termsDigest',i.terms_digest,
   'providerCreateClaimedAt',i.provider_create_claimed_at,'providerOrigin',i.provider_request_origin,
   'providerRequestVersion',i.provider_request_version,'recoveryAttempts',i.recovery_attempts,
   'closedAt',i.closed_at,'closedReason',i.closed_reason,'providerStatus',i.provider_status,
   'cancelState',(SELECT c.state FROM supporter_private.pazo_paypal_live_cancel_claims c WHERE c.intent_id=i.intent_id)) AS data
  FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.owner_id=p_owner ORDER BY i.created_at DESC LIMIT 20
 ) x;
 RETURN pg_catalog.jsonb_build_object('source','private_original_live_owner_checkouts','currentIntentId',current_id,'accounts',accounts);
END $read$;

CREATE FUNCTION public.pazo_f16_live_service_pending_checkout_read(p_intent text,p_generation bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $pending$
DECLARE result jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_intent IS NULL OR p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999 THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object('source','original_pending_live_checkout','provider','paypal','sourceEnvironment','live',
  'intentId',i.intent_id,'ownerId',i.owner_id,'requestKey',i.request_key,'planId',i.plan_id,'merchantGeneration',i.merchant_generation,
  'state',i.state,'consentVerified',i.affirmative_consent,'createdAt',i.created_at,'providerCreateClaimedAt',i.provider_create_claimed_at)
 INTO result FROM supporter_private.pazo_paypal_live_checkout_intents i WHERE i.intent_id=p_intent AND i.merchant_generation=p_generation
  AND i.state='pending' AND i.closed_at IS NULL AND i.provider_subscription_id IS NULL AND i.provider_create_claimed_at IS NOT NULL
  AND i.provider_request_origin IS NOT NULL AND i.provider_request_version='pazo_subscription_create_v1';
 RETURN result;
END $pending$;

CREATE FUNCTION public.pazo_f16_live_service_recovery_claim(p_owner uuid,p_intent text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $recover$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; token uuid; at timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND intent_id=p_intent
  AND closed_at IS NULL FOR UPDATE;
 IF NOT FOUND OR i.state<>'pending' OR i.provider_create_claimed_at IS NULL OR i.provider_create_claimed_at>at OR
  i.provider_create_claimed_at<at-interval '48 hours' OR i.provider_request_origin IS NULL OR
  i.provider_request_version IS DISTINCT FROM 'pazo_subscription_create_v1' OR i.recovery_attempts>=3 OR
  (i.recovery_expires_at IS NOT NULL AND i.recovery_expires_at>=at) OR
  (i.last_recovery_at IS NOT NULL AND i.last_recovery_at>=at-interval '1 minute') OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=i.merchant_generation
   AND environment='live' AND plan_id=i.plan_id AND retired_at IS NULL) OR
  NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton AND environment='live'
   AND live_enabled AND NOT kill_switch AND active_generation=i.merchant_generation)
 THEN RETURN NULL; END IF;
 -- Shorter than PayPal's documented72h retention; first claim is immutable.
 token:=pg_catalog.gen_random_uuid();
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET recovery_lease=token,recovery_expires_at=at+interval '2 minutes',
  last_recovery_at=at,recovery_attempts=recovery_attempts+1 WHERE intent_id=i.intent_id;
 RETURN pg_catalog.jsonb_build_object('source','private_original_live_create_recovery','leaseToken',token,'intentId',i.intent_id,
  'requestKey',i.request_key,'merchantGeneration',i.merchant_generation,'planId',i.plan_id,'providerOrigin',i.provider_request_origin,
  'providerRequestVersion',i.provider_request_version,'originalClaimedAt',i.provider_create_claimed_at);
END $recover$;

CREATE FUNCTION public.pazo_f16_live_service_abandon_unclaimed(p_owner uuid,p_intent text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $abandon$
DECLARE changed integer;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL THEN RETURN false; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1602));
 UPDATE supporter_private.pazo_paypal_live_checkout_intents SET closed_at=pg_catalog.clock_timestamp(),closed_reason='unclaimed_abandoned'
 WHERE owner_id=p_owner AND intent_id=p_intent AND closed_at IS NULL AND state='pending' AND provider_create_claimed_at IS NULL
  AND provider_subscription_id IS NULL AND recovery_lease IS NULL AND NOT EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox e WHERE e.linked_intent_id=p_intent);
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $abandon$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_provider_claim_with_origin(uuid,text,uuid,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_owner_checkouts_read(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_pending_checkout_read(text,bigint) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_recovery_claim(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_abandon_unclaimed(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_provider_claim_with_origin(uuid,text,uuid,bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_owner_checkouts_read(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_pending_checkout_read(text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_recovery_claim(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_abandon_unclaimed(uuid,text) TO service_role;

-- Preserve the already tested receipt validator intact, behind a transactional
-- wrapper. This helper cannot be invoked through PostgREST or a service grant.
ALTER FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb)
 SET SCHEMA supporter_private;
ALTER FUNCTION supporter_private.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb)
 RENAME TO pazo_live_queue_signed_bound_original;
REVOKE ALL ON FUNCTION supporter_private.pazo_live_queue_signed_bound_original(uuid,text,text,bigint,text,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_f16_live_service_signed_event_queue(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,p_event_id text,p_event_type text,p_evidence jsonb)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $signed$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; result text;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role') IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 -- Called only after postback SUCCESS and an original-generation provider GET.
 -- The event's custom_id was only a lookup hint; all ownership is read from DB.
 BEGIN
  SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=p_owner AND intent_id=p_intent
   AND merchant_generation=p_generation FOR UPDATE;
  IF NOT FOUND THEN RETURN 'owner_binding_not_verified'; END IF;
  IF i.state='pending' THEN
   IF p_event_type NOT IN('BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED') OR
    i.closed_at IS NOT NULL OR i.provider_create_claimed_at IS NULL OR i.provider_request_origin IS NULL OR
    i.provider_request_version IS DISTINCT FROM 'pazo_subscription_create_v1'
   THEN RETURN 'original_claimed_checkout_required'; END IF;
   result:=supporter_private.pazo_live_bind_verified_subscription(p_owner,p_intent,i.request_key,p_generation,i.plan_id,p_subscription);
   IF result NOT IN('bound','already_bound') THEN RETURN result; END IF;
  END IF;
  result:=supporter_private.pazo_live_queue_signed_bound_original(p_owner,p_intent,p_subscription,p_generation,p_event_id,p_event_type,p_evidence);
  IF result IS NULL OR result NOT IN('queued','duplicate_verified_event') THEN
   RAISE EXCEPTION 'signed intake rejected' USING ERRCODE='P1602';
  END IF;
  RETURN result;
 EXCEPTION WHEN SQLSTATE 'P1602' THEN RETURN COALESCE(result,'signed_evidence_invalid'); END;
END $signed$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb) TO service_role;
COMMIT;
