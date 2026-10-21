-- Administrative resource inspection only. No credential storage or financial release.
BEGIN;
DO $guard$
BEGIN
 IF to_regprocedure('public.pazo_f16_live_service_bootstrap_read(uuid,text)') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_bootstrap_record_resources(uuid,bigint,text,text)') IS NOT NULL
  OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n
   ON n.oid=c.relnamespace WHERE n.nspname='admin_private'
   AND c.relname='pazo_paypal_live_bootstrap_reservations'
   AND c.relrowsecurity AND c.relforcerowsecurity)
  OR NOT EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled
    AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'resource inspection preflight blocked' USING ERRCODE='42501'; END IF;
END $guard$;

-- Private table has no service SELECT grant. Return only the same admin's reservation.
CREATE FUNCTION public.pazo_f16_live_service_bootstrap_read(p_actor uuid,p_plan text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE result jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
    IS DISTINCT FROM 'service_role' OR p_actor IS NULL OR p_plan IS NULL
  OR p_plan !~ '^P-[A-Z0-9]{12,40}$'
  OR NOT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled
    AND kill_switch AND active_generation IS NULL) THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object('generation',r.generation,
   'planId',r.plan_id,'webhookId',s.webhook_id,'state',r.state,
   'environment','live','mayCharge',false)
 INTO result FROM admin_private.pazo_paypal_live_bootstrap_reservations r
 JOIN admin_private.paypal_gateway_settings s
  ON s.environment='live' AND s.plan_id=r.plan_id
 WHERE r.actor_id=p_actor AND r.plan_id=p_plan AND r.state='reserved';
 RETURN result;
END $f$;

-- Called only after the authenticated Edge has independently GET-verified PayPal.
-- This records resource configuration, NOT merchant identity, delivery or custody.
CREATE FUNCTION public.pazo_f16_live_service_bootstrap_record_resources(
 p_actor uuid,p_generation bigint,p_plan text,p_webhook text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE previous_webhook text;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
    IS DISTINCT FROM 'service_role' OR p_actor IS NULL
  OR p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_plan IS NULL OR p_plan !~ '^P-[A-Z0-9]{12,40}$'
  OR p_webhook IS NULL OR p_webhook !~ '^[A-Za-z0-9_-]{8,100}$'
  OR NOT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND NOT live_enabled
   AND kill_switch AND active_generation IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM admin_private.pazo_paypal_live_bootstrap_reservations
  WHERE generation=p_generation AND actor_id=p_actor AND plan_id=p_plan
   AND state='reserved' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT webhook_id INTO previous_webhook FROM admin_private.paypal_gateway_settings
  WHERE environment='live' AND plan_id=p_plan AND price_minor=299
   AND currency='USD' AND interval_unit='MONTH'
   AND return_origin='https://pazo-app-t83r.vercel.app' FOR UPDATE;
 IF NOT FOUND OR (previous_webhook<>'' AND previous_webhook<>p_webhook)
 THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM admin_private.paypal_gateway_change_log
  WHERE environment='live' AND actor_id=p_actor AND kind='validation'
   AND details->>'scope'='live_resource_configuration'
   AND details->>'generation'=p_generation::text
   AND details->>'webhook_id'=p_webhook)
  AND previous_webhook=p_webhook THEN RETURN true; END IF;
 UPDATE admin_private.paypal_gateway_settings SET webhook_id=p_webhook,
  validation_status='not_verified',validated_at=NULL,
  updated_at=pg_catalog.clock_timestamp(),updated_by=p_actor
 WHERE environment='live';
 INSERT INTO admin_private.paypal_gateway_change_log(environment,actor_id,kind,details)
 VALUES('live',p_actor,'validation',pg_catalog.jsonb_build_object(
  'scope','live_resource_configuration','generation',p_generation,
  'webhook_id',p_webhook,'plan_read_verified',true,'webhook_read_verified',true,
  'merchant_identity_verified',false,'webhook_delivery_verified',false,
  'credentials_stored',false,'may_charge',false));
 RETURN true;
END $f$;
ALTER FUNCTION public.pazo_f16_live_service_bootstrap_read(uuid,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_bootstrap_record_resources(uuid,bigint,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_bootstrap_read(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_bootstrap_record_resources(uuid,bigint,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_bootstrap_read(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_bootstrap_record_resources(uuid,bigint,text,text) TO service_role;
COMMIT;
