-- PAZO F16 live owner-intent reservation API. PREPARED, NOT APPLIED.
-- NO role gets EXECUTE: use only after separate PO-approved service role
-- integration with GoTrue owner verification and payment reconciliation.
-- Fully fail-closed while the new checkout switch is Sandbox/OFF.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
  OR to_regclass('admin_private.pazo_paypal_new_checkout_switch') IS NULL
 THEN RAISE EXCEPTION 'PAZO F16 Live intent staging prerequisites missing'
  USING ERRCODE='42501'; END IF;
END $preflight$;

CREATE FUNCTION supporter_private.pazo_live_intent_begin(
 p_owner uuid,p_request_key uuid,p_generation bigint,
 p_locale text,p_terms_version text,p_terms_digest text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
 v_plan text; v_now timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 IF p_owner IS NULL OR p_request_key IS NULL OR p_generation IS NULL
  OR p_generation<1 OR p_locale NOT IN('es','en')
  OR p_terms_version IS NULL OR
    p_terms_version !~ '^pazo-supporter-live[.][a-z0-9.-]{3,40}$'
  OR p_terms_digest IS NULL OR
    p_terms_digest !~ '^[a-f0-9]{64}$'
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','invalid_consent'); END IF;
 SELECT g.plan_id INTO v_plan
 FROM admin_private.pazo_paypal_merchant_generations g
 JOIN admin_private.pazo_paypal_new_checkout_switch s
  ON s.active_generation=g.generation
 WHERE s.singleton=true AND s.environment='live' AND
  s.live_enabled=true AND s.kill_switch=false
  AND g.environment='live' AND g.retired_at IS NULL AND
  g.generation=p_generation;
 IF v_plan IS NULL THEN
  RETURN pg_catalog.jsonb_build_object('ok',false,'code','live_checkout_not_released');
 END IF;

 INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
  intent_id,owner_id,request_key,merchant_generation,source_environment,
  plan_id,locale,terms_version,terms_digest,affirmative_consent
 ) VALUES(
  'intent-'||pg_catalog.gen_random_uuid()::text,p_owner,p_request_key,
  p_generation,'live',v_plan,p_locale,p_terms_version,p_terms_digest,true
 )
 ON CONFLICT(owner_id,request_key) DO NOTHING
 RETURNING * INTO v;
 IF v.intent_id IS NULL THEN
  SELECT * INTO v FROM supporter_private.pazo_paypal_live_checkout_intents
  WHERE owner_id=p_owner AND request_key=p_request_key FOR UPDATE;
 END IF;
 IF v.intent_id IS NULL OR v.merchant_generation<>p_generation OR
  v.plan_id<>v_plan OR v.source_environment<>'live' OR
  v.locale<>p_locale OR v.terms_version<>p_terms_version OR
  v.terms_digest<>p_terms_digest OR v.affirmative_consent IS NOT TRUE
 THEN RETURN pg_catalog.jsonb_build_object('ok',false,'code','request_conflict'); END IF;
 RETURN pg_catalog.jsonb_build_object(
  'ok',true,'ownerId',v.owner_id,'requestKey',v.request_key,
  'intentId',v.intent_id,'planId',v.plan_id,'merchantGeneration',v.merchant_generation,
  'sourceEnvironment',v.source_environment,'locale',v.locale,
  'termsVersion',v.terms_version,'termsDigest',v.terms_digest,
  'createdAt',v.created_at,'state',v.state);
END $f$;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_intent_begin(uuid,uuid,bigint,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION supporter_private.pazo_live_intent_claim_once(
 p_owner uuid,p_intent text,p_request_key uuid,p_generation bigint
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_id text; v_now timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 IF p_owner IS NULL OR p_intent IS NULL OR p_request_key IS NULL OR
  p_generation IS NULL OR p_generation<1
 THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents i
 SET provider_create_claimed_at=v_now
 FROM admin_private.pazo_paypal_new_checkout_switch s
 WHERE s.singleton=true AND s.environment='live' AND s.live_enabled=true
  AND s.kill_switch=false AND s.active_generation=p_generation
  AND i.owner_id=p_owner AND i.intent_id=p_intent AND
  i.request_key=p_request_key AND i.merchant_generation=p_generation
  AND i.source_environment='live' AND i.state='pending'
  AND i.provider_create_claimed_at IS NULL
  AND i.created_at<=v_now AND i.created_at>=v_now-interval '48 hours'
 RETURNING i.intent_id INTO v_id;
 RETURN v_id IS NOT NULL;
END $f$;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_intent_claim_once(uuid,text,uuid,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
