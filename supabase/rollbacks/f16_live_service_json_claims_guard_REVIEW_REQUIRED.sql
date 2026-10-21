-- REVIEW REQUIRED. Restores the pre-fix behavior (including known JSON-claims bug).
-- Prefer transaction rollback if apply has not committed. After commit only use
-- this with a separate operator GO while checkout remains OFF.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$
DECLARE r record; p record;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND NOT live_enabled
  AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'Live must remain OFF' USING ERRCODE='42501'; END IF;
 FOR r IN SELECT * FROM (VALUES
  ('public.pazo_f16_live_service_active_route()','0a2dfae88a57d2ef9c73b572c37f90bd'),
  ('public.pazo_f16_live_service_binding_read(text)','b100effb2b3fe103294db33b28442897'),
  ('public.pazo_f16_live_service_bootstrap_finalize(uuid,bigint,text,text,text)','c67535bd9b5cf876c483f228718f7f0f'),
  ('public.pazo_f16_live_service_bootstrap_reserve(uuid,text)','4d9445f033ef1409df9bb638aef63a4e'),
  ('public.pazo_f16_live_service_cancel_claim(uuid,text,bigint)','817927d43081d45beb0733e7ac070ddb'),
  ('public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text)','6f690bab480e0bf2c5c42d9163984371'),
  ('public.pazo_f16_live_service_inbox_claim(bigint,text)','e17ad3cecc6e626ec7528b60fa9add9a'),
  ('public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text)','3ae08ef5b7b2266cf3c7b579aa4ddc98'),
  ('public.pazo_f16_live_service_paid_period_projection(uuid,timestamp with time zone)','990723811c0f33f1107538b2a0a18df4'),
  ('public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint)','25922f086748de1c339157365db7071f'),
  ('public.pazo_f16_live_service_provision_finish(uuid,bigint,uuid,text)','4d1c13c33792f7bcd76046477d116d02'),
  ('public.pazo_f16_live_service_provision_generation_read(uuid,bigint)','339bea1cd17eb22294dff3abc0d2c71c'),
  ('public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text)','bcf58a69b9109b84790a8c47867c5563'),
  ('public.pazo_f16_live_service_subscription_bind(uuid,text,uuid,bigint,text,text)','bacddcea62100b7b4a9369f02255c3bd'),
  ('public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text)','52a6ab16387fa5685e99c6172a6b3b7b'),
  ('public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text)','a537dd192a6309fbafc23702cfc85439'),
  ('public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamp with time zone,timestamp with time zone)','02551a930b510a6b098ecc69a7600e4e')
 ) AS expected(signature,source_md5)
 LOOP
  SELECT prosrc INTO p FROM pg_catalog.pg_proc
   WHERE oid=pg_catalog.to_regprocedure(r.signature);
  IF NOT FOUND OR pg_catalog.strpos(p.prosrc,'(NULLIF(pg_catalog.current_setting(''request.jwt.claims'',true),'''')::jsonb ->> ''role'')')=0
   OR pg_catalog.md5(pg_catalog.replace(p.prosrc,'(NULLIF(pg_catalog.current_setting(''request.jwt.claims'',true),'''')::jsonb ->> ''role'')','pg_catalog.current_setting(''request.jwt.claim.role'',true)'))
    IS DISTINCT FROM r.source_md5
  THEN RAISE EXCEPTION 'Rollback source drift: %',r.signature USING ERRCODE='42501';
  END IF;
 END LOOP;
END $guard$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_active_route()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE output jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'sourceEnvironment','live','merchantGeneration',g.generation,
  'planId',g.plan_id,'credentialSource',g.credential_source,
  'returnOrigin',c.return_origin
 ) INTO output
 FROM admin_private.pazo_paypal_new_checkout_switch s
 JOIN admin_private.pazo_paypal_merchant_generations g ON g.generation=s.active_generation
 JOIN admin_private.paypal_gateway_settings c
  ON c.environment='live' AND c.plan_id=g.plan_id AND c.webhook_id=g.webhook_id
 WHERE s.singleton=true AND s.environment='live'
  AND s.live_enabled=true AND s.kill_switch=false
  AND g.environment='live' AND g.retired_at IS NULL
  AND g.credential_source='edge_secrets'
  AND c.return_origin ~ '^https://[a-z0-9][a-z0-9.-]{1,240}(:443)?$';
 RETURN output;
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_binding_read(p_subscription_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v jsonb;
BEGIN
 -- JWT claim is imposed by PostgREST. This defense is IN ADDITION TO
 -- EXECUTE being exclusively granted to service_role below.
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RETURN NULL; END IF;
 IF p_subscription_id IS NULL OR
  p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'provider','paypal',
  'sourceEnvironment','live',
  'subscriptionId',i.provider_subscription_id,
  'ownerId',i.owner_id,
  'intentId',i.intent_id,
  'planId',i.plan_id,
  'merchantGeneration',i.merchant_generation,
  'state',i.state,
  'consentVerified',true
 ) INTO v
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 JOIN admin_private.pazo_paypal_merchant_generations g
  ON g.generation=i.merchant_generation
 WHERE i.provider_subscription_id=p_subscription_id
  AND i.source_environment='live' AND i.state='bound'
  AND i.affirmative_consent AND i.provider_create_claimed_at IS NOT NULL
  AND g.environment='live' AND g.plan_id=i.plan_id
 LIMIT 1;
 RETURN v;
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_bootstrap_finalize(p_actor uuid, p_generation bigint, p_plan text, p_webhook text, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE reserved_record admin_private.pazo_paypal_live_bootstrap_reservations%ROWTYPE;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
  OR p_actor IS NULL OR p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_plan IS NULL OR p_plan !~ '^P-[A-Z0-9]{12,40}$'
  OR p_webhook IS NULL OR p_webhook !~ '^[A-Za-z0-9_-]{8,100}$'
  OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$'
  OR NOT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND live_enabled=false
   AND kill_switch=true AND active_generation IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('finalized',false); END IF;
 SELECT * INTO reserved_record
 FROM admin_private.pazo_paypal_live_bootstrap_reservations
 WHERE generation=p_generation FOR UPDATE;
 IF NOT FOUND OR reserved_record.actor_id IS DISTINCT FROM p_actor
  OR reserved_record.plan_id IS DISTINCT FROM p_plan
  OR reserved_record.state IS DISTINCT FROM 'reserved'
  OR NOT EXISTS (SELECT 1 FROM admin_private.paypal_gateway_settings
    WHERE environment='live' AND plan_id=p_plan)
 THEN RETURN pg_catalog.jsonb_build_object('finalized',false); END IF;
 -- Original generation identity is stable; only insert after provider proof.
 INSERT INTO admin_private.pazo_paypal_merchant_generations(
  generation,environment,merchant_fingerprint_sha256,
  plan_id,webhook_id,credential_source,client_id_vault,client_secret_vault)
 OVERRIDING SYSTEM VALUE
 VALUES(p_generation,'live',p_fingerprint,p_plan,p_webhook,'edge_secrets',NULL,NULL);
 UPDATE admin_private.pazo_paypal_live_bootstrap_reservations
 SET state='finalized',finalized_at=pg_catalog.clock_timestamp()
 WHERE generation=p_generation AND state='reserved';
 RETURN pg_catalog.jsonb_build_object('finalized',true,'generation',p_generation,
  'planId',p_plan,'webhookId',p_webhook,'merchantFingerprint',p_fingerprint,
  'environment','live','mayCharge',false);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_bootstrap_reserve(p_actor uuid, p_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE g bigint;
        existing admin_private.pazo_paypal_live_bootstrap_reservations%ROWTYPE;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
  OR p_actor IS NULL OR p_plan IS NULL OR
     p_plan !~ '^P-[A-Z0-9]{12,40}$' OR
  NOT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;

 PERFORM 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND live_enabled=false
   AND kill_switch=true AND active_generation IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 IF NOT EXISTS (SELECT 1 FROM admin_private.paypal_gateway_settings
  WHERE environment='live' AND plan_id=p_plan)
 THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;

 -- Serialize by checkout switch row already locked above. A timeout followed
 -- by the SAME verified administrator may safely retrieve that same reserved
 -- identity without incrementing the generation sequence a second time.
 SELECT * INTO existing
 FROM admin_private.pazo_paypal_live_bootstrap_reservations
 WHERE plan_id=p_plan FOR UPDATE;
 IF FOUND THEN
  IF existing.actor_id=p_actor AND existing.state='reserved'
  THEN RETURN pg_catalog.jsonb_build_object('reserved',true,
    'generation',existing.generation,'planId',p_plan,
    'environment','live','mayCharge',false,'replayed',true);
  END IF;
  RETURN pg_catalog.jsonb_build_object('reserved',false);
 END IF;
 IF EXISTS (SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
   WHERE environment='live' AND plan_id=p_plan)
 THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;

 -- Consume the *real* sequence for the identity column, not a guessed number.
 g:=pg_catalog.nextval(pg_catalog.pg_get_serial_sequence(
  'admin_private.pazo_paypal_merchant_generations','generation')::regclass);
 IF g IS NULL OR g>9999 THEN
  RAISE EXCEPTION 'Live generation limit' USING ERRCODE='42501';
 END IF;
 INSERT INTO admin_private.pazo_paypal_live_bootstrap_reservations(
  generation,actor_id,plan_id) VALUES(g,p_actor,p_plan);
 RETURN pg_catalog.jsonb_build_object('reserved',true,'generation',g,
  'planId',p_plan,'environment','live','mayCharge',false);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_cancel_claim(p_owner uuid, p_intent text, p_generation bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_claim_cancel_once(p_owner,p_intent,p_generation);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_checkout_begin(p_owner uuid, p_request_key uuid, p_generation bigint, p_locale text, p_terms_version text, p_terms_digest text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_intent_begin(p_owner,p_request_key,p_generation,p_locale,p_terms_version,p_terms_digest);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_inbox_claim(p_generation bigint, p_event_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
        out_result jsonb; uid uuid;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
 THEN RETURN NULL; END IF;

 SELECT * INTO v FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND source_environment='live' AND linked_intent_id IS NOT NULL
  AND (
   (processing_state='pending' AND claim_attempts<3)
   OR (processing_state='processing' AND lease_expires_at<pg_catalog.clock_timestamp()
       AND claim_attempts<3)
  )
 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;

 SELECT i.owner_id INTO uid
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.intent_id=v.linked_intent_id AND
  i.merchant_generation=v.merchant_generation AND
  i.source_environment='live' AND i.state='bound';
 IF uid IS NULL THEN RETURN NULL; END IF;

 UPDATE supporter_private.pazo_paypal_live_event_inbox
 SET processing_state='processing',
     lease_token=pg_catalog.gen_random_uuid(),
     leased_at=pg_catalog.clock_timestamp(),
     lease_expires_at=pg_catalog.clock_timestamp()+interval '2 minutes',
     claim_attempts=claim_attempts+1
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
 RETURNING lease_token INTO v.lease_token;

 -- Receipt and original binding are proven by existing private constraints,
 -- but NO signed body or PayPal GET has been fetched by this SQL function.
 RETURN pg_catalog.jsonb_build_object(
  'claimed',true,'leaseToken',v.lease_token,'eventId',p_event_id,
  'eventType',v.event_type,'merchantGeneration',p_generation,
  'sourceEnvironment','live','intentId',v.linked_intent_id,
  'ownerId',uid,'provider','paypal',
  'financialEvidenceVerified',false,'mayGrantBenefits',false
 );
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_inbox_finish(p_generation bigint, p_event_id text, p_lease uuid, p_result text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE changed integer;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_lease IS NULL OR p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
  OR p_result NOT IN ('held','pending','processed') THEN RETURN false; END IF;

 -- Financial events cannot be acknowledged as processed without an actual
 -- recorded sale or hold tied to their original VERIFIED event reference.
 IF p_result='processed' AND EXISTS (
  SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox e
  WHERE e.merchant_generation=p_generation AND e.provider_event_id=p_event_id
   AND (
    (e.event_type='PAYMENT.SALE.COMPLETED' AND NOT EXISTS(
      SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
       WHERE p.merchant_generation=e.merchant_generation AND
        p.provider_event_id=e.provider_event_id))
    OR (e.event_type IN ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED') AND NOT EXISTS(
      SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
      JOIN supporter_private.pazo_paypal_live_paid_periods p ON p.sale_id=h.sale_id
      WHERE h.hold_id=e.provider_event_id
       AND p.merchant_generation=e.merchant_generation))

   )
 ) THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox
 SET processing_state=p_result,lease_token=NULL,leased_at=NULL,lease_expires_at=NULL
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND source_environment='live' AND processing_state='processing'
  AND lease_token=p_lease AND lease_expires_at>=pg_catalog.clock_timestamp();
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_paid_period_projection(p_owner uuid, p_as_of timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_project_paid_periods(p_owner,p_as_of);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provider_claim(p_owner uuid, p_intent text, p_request_key uuid, p_generation bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_intent_claim_once(p_owner,p_intent,p_request_key,p_generation);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provision_finish(p_actor uuid, p_generation bigint, p_attempt uuid, p_result text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE changed integer;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_result NOT IN ('generation_secret_names_confirmed','secret_preflight_unavailable',
  'generation_secrets_already_present','secret_write_outcome_unknown_manual_review',
  'provisioning_audit_unavailable_manual_review') THEN RETURN false; END IF;
 UPDATE admin_private.pazo_paypal_secret_provision_attempts
 SET state=CASE WHEN p_result='generation_secret_names_confirmed'
             THEN 'confirmed' ELSE 'review_required' END,
  result_code=p_result, completed_at=pg_catalog.clock_timestamp()
 WHERE actor_id=p_actor AND merchant_generation=p_generation AND attempt_id=p_attempt
  AND state='reserved';
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provision_generation_read(p_actor uuid, p_generation bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'generation',g.generation,'environment',g.environment,
  'credentialSource',g.credential_source,'isRetired',(g.retired_at IS NOT NULL),
  'verifiedAdminId',p_actor,'revision',s.revision,
  'liveCheckoutEnabled',s.live_enabled,'killSwitch',s.kill_switch,
  'planId',g.plan_id,'webhookId',g.webhook_id,
  'merchantFingerprint',g.merchant_fingerprint_sha256
 ) INTO v
 FROM admin_private.pazo_paypal_merchant_generations g
 CROSS JOIN admin_private.pazo_paypal_new_checkout_switch s
 WHERE g.generation=p_generation AND s.singleton
  AND g.environment='live' AND g.credential_source='edge_secrets'
  AND s.environment='sandbox' AND NOT s.live_enabled AND s.kill_switch
  AND s.active_generation IS NULL;
 RETURN v;
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provision_reserve(p_actor uuid, p_generation bigint, p_expected_revision bigint, p_plan text, p_webhook text, p_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE attempt uuid; current_row jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 -- The SELECT ... FOR UPDATE locks are held through the insert/commit, so
 -- concurrent admin switch/generation rotation cannot race this reservation.
 PERFORM 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND live_enabled=false
   AND kill_switch=true AND active_generation IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 PERFORM 1 FROM admin_private.pazo_paypal_merchant_generations
  WHERE generation=p_generation AND environment='live' AND retired_at IS NULL
   AND credential_source='edge_secrets' FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 SELECT public.pazo_f16_live_service_provision_generation_read(p_actor,p_generation)
 INTO current_row;
 IF current_row IS NULL OR current_row->>'isRetired' IS DISTINCT FROM 'false'
  OR current_row->>'planId' IS DISTINCT FROM p_plan
  OR current_row->>'webhookId' IS DISTINCT FROM p_webhook
  OR current_row->>'merchantFingerprint' IS DISTINCT FROM p_fingerprint
  OR (current_row->>'revision')::bigint IS DISTINCT FROM p_expected_revision
 THEN RETURN pg_catalog.jsonb_build_object('reserved',false); END IF;
 INSERT INTO admin_private.pazo_paypal_secret_provision_attempts(
  merchant_generation,actor_id,expected_revision,plan_id,webhook_id,
  merchant_fingerprint_sha256)
 VALUES (p_generation,p_actor,p_expected_revision,p_plan,p_webhook,p_fingerprint)
 ON CONFLICT (merchant_generation) DO NOTHING
 RETURNING attempt_id INTO attempt;
 RETURN pg_catalog.jsonb_build_object('reserved',attempt IS NOT NULL,'attemptId',attempt);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_subscription_bind(p_owner uuid, p_intent text, p_request_key uuid, p_generation bigint, p_plan text, p_subscription text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_bind_verified_subscription(p_owner,p_intent,p_request_key,p_generation,p_plan,p_subscription);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_event_queue(p_owner uuid, p_intent text, p_subscription text, p_generation bigint, p_event_id text, p_event_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_queue_verified_event(p_owner,p_intent,p_subscription,p_generation,p_event_id,p_event_type);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_refund_record(p_owner uuid, p_intent text, p_subscription text, p_generation bigint, p_sale_id text, p_event_id text, p_hold_id text, p_kind text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_record_verified_refund(p_owner,p_intent,p_subscription,p_generation,p_sale_id,p_event_id,p_hold_id,p_kind);
END $function$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_sale_record(p_owner uuid, p_intent text, p_subscription text, p_generation bigint, p_event_id text, p_sale_id text, p_cycle_key text, p_amount_minor integer, p_currency text, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_record_verified_sale(p_owner,p_intent,p_subscription,p_generation,p_event_id,p_sale_id,p_cycle_key,p_amount_minor,p_currency,p_start,p_end);
END $function$;

COMMIT;
