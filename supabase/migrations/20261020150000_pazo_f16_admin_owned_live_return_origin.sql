-- PAZO F16 — service-owned HTTPS origin for active Live merchant.
-- Existing admin draft is the ONLY source of return origin; never browser
-- input or an environment variable changed after beta publication.
-- Does not enable Live, write secrets, modify billing, or change checkout.
BEGIN;
DO $guard$
BEGIN
 IF (SELECT count(*) FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND live_enabled=false
   AND kill_switch=true AND active_generation IS NULL)<>1
  OR to_regprocedure('public.pazo_f16_live_service_active_route()') IS NULL
  OR to_regclass('admin_private.paypal_gateway_settings') IS NULL
 THEN RAISE EXCEPTION 'F16 ORIGIN PRECHECK NOT READY' USING ERRCODE='42501'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_active_route()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $pazo$
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
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_active_route() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_active_route()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_active_route()
 TO service_role;
DO $post$
BEGIN
 IF NOT pg_catalog.has_function_privilege('service_role',
   'public.pazo_f16_live_service_active_route()','EXECUTE')
  OR pg_catalog.has_function_privilege('anon',
   'public.pazo_f16_live_service_active_route()','EXECUTE')
  OR pg_catalog.has_function_privilege('authenticated',
   'public.pazo_f16_live_service_active_route()','EXECUTE')
  OR (SELECT count(*) FROM admin_private.pazo_paypal_new_checkout_switch
    WHERE singleton AND environment='sandbox' AND live_enabled=false
     AND kill_switch=true AND active_generation IS NULL)<>1
 THEN RAISE EXCEPTION 'F16 ORIGIN POSTCHECK FAILED'; END IF;
END $post$;
COMMIT;
