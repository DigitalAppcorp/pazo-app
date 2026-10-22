-- Stop and audit BEFORE rollback. Never remove financial or authorization history.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods)
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control WHERE singleton AND mode='off')
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'rollback requires OFF and no Live attempts; preserve historical processing'; END IF;
END $guard$;
DROP TRIGGER pazo_live_switch_matches_control ON admin_private.pazo_paypal_new_checkout_switch;
ALTER TABLE admin_private.pazo_paypal_new_checkout_switch DROP CONSTRAINT pazo_paypal_controlled_switch_shape,
 ADD CONSTRAINT pazo_paypal_new_checkout_switch_environment_check CHECK(environment='sandbox'),
 ADD CONSTRAINT pazo_paypal_new_checkout_switch_live_enabled_check CHECK(live_enabled=false),
 ADD CONSTRAINT pazo_paypal_new_checkout_switch_kill_switch_check CHECK(kill_switch=true),
 ADD CONSTRAINT pazo_paypal_off_switch_generation CHECK(active_generation IS NULL);
ALTER TABLE admin_private.paypal_gateway_runtime DROP CONSTRAINT pazo_paypal_controlled_runtime_shape,
 ADD CONSTRAINT paypal_gateway_runtime_active_environment_check CHECK(active_environment='sandbox'),
 ADD CONSTRAINT paypal_gateway_runtime_live_checkout_enabled_check CHECK(live_checkout_enabled=false);
UPDATE supporter_private.pazo_paypal_live_worker_control SET processing_enabled=false WHERE singleton;
DELETE FROM admin_private.pazo_live_release_artifact WHERE singleton;
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
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provider_claim_with_origin(
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
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_recovery_claim(p_owner uuid,p_intent text)
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
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_active_route()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE output jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'sourceEnvironment','live','merchantGeneration',g.generation,
  'planId',g.plan_id,'credentialSource',g.credential_source,
  'returnOrigin',c.return_origin)
 INTO output
 FROM admin_private.pazo_paypal_new_checkout_switch s
 JOIN admin_private.pazo_paypal_merchant_generations g ON g.generation=s.active_generation
 JOIN admin_private.paypal_gateway_settings c ON c.environment='live'
  AND c.plan_id=g.plan_id AND c.webhook_id=g.webhook_id
 WHERE s.singleton=true AND s.environment='live' AND s.live_enabled=true
  AND s.kill_switch=false AND g.environment='live'
  AND g.retired_at IS NULL AND g.credential_source IN ('vault','edge_secrets')
  AND c.return_origin='https://pazo-app-t83r.vercel.app';
 RETURN output;
END $f$;
CREATE OR REPLACE FUNCTION public.pazo_admin_live_readiness()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE checks jsonb; blockers jsonb:='[]'::jsonb; active boolean; phase text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin()
 THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'termsReady',(SELECT count(*)=2 FROM supporter_private.pazo_live_offer_versions
   WHERE terms_version='pazo-supporter-live.beta20261021-v1' AND locale IN('es','en')),
  'ownerRecoverySchemaReady',
   pg_catalog.to_regprocedure('public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text)') IS NOT NULL AND
   pg_catalog.to_regprocedure('public.pazo_f16_live_service_terminal_checkout_close(uuid,text,bigint,text,text)') IS NOT NULL AND
   pg_catalog.to_regprocedure('public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)') IS NOT NULL,
  'benefitsSchemaReady',EXISTS(SELECT 1 FROM pg_catalog.pg_class c
   WHERE c.oid=pg_catalog.to_regclass('supporter_private.pazo_live_pet_themes')
    AND c.relrowsecurity AND c.relforcerowsecurity),
  'financeSchemaReady',pg_catalog.to_regprocedure('public.pazo_admin_live_finance_summary()') IS NOT NULL,
  -- Schema existence alone cannot certify deployed release logic. Remains
  -- false until the separate controlled-release migration replaces this read.
  'releaseControlsReady',false,
  'credentialsStored',EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings s
   JOIN admin_private.pazo_paypal_merchant_generations g
    ON g.environment='live' AND g.retired_at IS NULL AND g.credential_source='vault'
     AND g.plan_id=s.plan_id AND g.webhook_id=s.webhook_id
     AND g.client_id_vault=s.client_id_vault AND g.client_secret_vault=s.client_secret_vault
   WHERE s.environment='live' AND s.client_id_vault IS NOT NULL AND s.client_secret_vault IS NOT NULL),
  'providerResourcesVerified',EXISTS(SELECT 1 FROM admin_private.paypal_gateway_settings s
   WHERE s.environment='live' AND s.validation_status='valid' AND s.validated_at IS NOT NULL
    AND s.client_id_vault IS NOT NULL AND s.client_secret_vault IS NOT NULL),
  'workerHealthy',EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control c
   WHERE c.singleton AND c.enabled AND c.expected_build='pazo_live_worker_v2'
    AND c.last_heartbeat_at>=pg_catalog.statement_timestamp()-interval '5 minutes')) INTO checks;
 IF checks->>'termsReady'<>'true' THEN blockers:=blockers||'"terms_unavailable"'::jsonb; END IF;
 IF checks->>'ownerRecoverySchemaReady'<>'true' THEN blockers:=blockers||'"account_backend_unavailable"'::jsonb; END IF;
 IF checks->>'benefitsSchemaReady'<>'true' THEN blockers:=blockers||'"benefits_backend_unavailable"'::jsonb; END IF;
 IF checks->>'financeSchemaReady'<>'true' THEN blockers:=blockers||'"finance_backend_unavailable"'::jsonb; END IF;
 IF checks->>'releaseControlsReady'<>'true' THEN blockers:=blockers||'"controlled_release_pending"'::jsonb; END IF;
 IF checks->>'credentialsStored'<>'true' THEN blockers:=blockers||'"live_credentials_pending"'::jsonb; END IF;
 IF checks->>'providerResourcesVerified'<>'true' THEN blockers:=blockers||'"provider_verification_pending"'::jsonb; END IF;
 IF checks->>'workerHealthy'<>'true' THEN blockers:=blockers||'"private_worker_unavailable"'::jsonb; END IF;
 SELECT COALESCE(bool_or(s.environment='live' AND s.live_enabled AND NOT s.kill_switch),false)
 INTO active FROM admin_private.pazo_paypal_new_checkout_switch s WHERE s.singleton;
 phase:=CASE WHEN active THEN 'active' ELSE 'engineering_pending' END;
 RETURN pg_catalog.jsonb_build_object('source','pazo_live_admin_readiness_v1',
  'asOf',pg_catalog.statement_timestamp(),'phase',phase,'checks',checks,
  'blockers',blockers,'checkoutActive',active,'mayActivate',false,'mayCharge',false);
END $f$;
DROP FUNCTION public.pazo_f16_live_service_release_admit(uuid,bigint),
 public.pazo_f16_live_service_release_runtime(text,text),
 public.pazo_f16_live_service_release_change(uuid,text,bigint,uuid),public.pazo_admin_live_release_status();
DROP FUNCTION admin_private.pazo_live_switch_matches_control(),admin_private.pazo_live_control_admits(uuid,bigint),admin_private.pazo_live_artifact_ready();
CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
 SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid())
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
 'active_environment','sandbox','live_checkout_enabled',false,
 'checkout_source','legacy_sandbox_checkout',
 'environments',COALESCE(jsonb_agg(jsonb_build_object(
  'environment',c.environment,'plan_id',c.plan_id,
  'price_minor',c.price_minor,'currency',c.currency,
  'interval_unit',c.interval_unit,'product_name',c.product_name,
  'return_origin',c.return_origin,'webhook_id',c.webhook_id,
  'client_id_stored',c.client_id_vault IS NOT NULL,
  'client_secret_stored',c.client_secret_vault IS NOT NULL,
  'validation_status',c.validation_status,'validated_at',c.validated_at,
  'updated_at',c.updated_at
 ) ORDER BY c.environment),'[]'::jsonb)
 ) INTO v FROM admin_private.paypal_gateway_settings c;
 RETURN v;
END $function$;
COMMIT;
