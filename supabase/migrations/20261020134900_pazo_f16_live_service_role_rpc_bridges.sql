-- PO authorized on 2026-10-20: install nine server-only F16 RPC bridges.
-- NO permission to enable Live, deploy Edge, create payments, or merge main.
-- This migration is atomic and fail-closed. The production Live CHECK
-- constraints and historical Sandbox remain unchanged.
DO $preflight$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='service_role')
  OR (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname LIKE 'pazo_f16_live_service_%'
      AND p.proname<>'pazo_f16_live_service_binding_read')<>0
  OR (SELECT count(*) FROM admin_private.pazo_paypal_new_checkout_switch s
      WHERE singleton AND environment='sandbox' AND live_enabled=false
       AND kill_switch=true AND active_generation IS NULL)<>1
  OR EXISTS (SELECT 1 FROM admin_private.pazo_paypal_merchant_generations WHERE environment='live')
  OR EXISTS (SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents)
  OR (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n
      ON n.oid=p.pronamespace WHERE n.nspname='supporter_private' AND p.proname LIKE 'pazo_live_%')<>8
 THEN RAISE EXCEPTION 'F16 service bridge hosted preflight failed' USING ERRCODE='42501';
 END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_checkout_begin(p_owner uuid, p_request_key uuid, p_generation bigint, p_locale text, p_terms_version text, p_terms_digest text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_intent_begin(p_owner,p_request_key,p_generation,p_locale,p_terms_version,p_terms_digest);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_checkout_begin(uuid,uuid,bigint,text,text,text)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_provider_claim(p_owner uuid, p_intent text, p_request_key uuid, p_generation bigint)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_intent_claim_once(p_owner,p_intent,p_request_key,p_generation);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_provider_claim(uuid,text,uuid,bigint)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_subscription_bind(p_owner uuid, p_intent text, p_request_key uuid, p_generation bigint, p_plan text, p_subscription text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_bind_verified_subscription(p_owner,p_intent,p_request_key,p_generation,p_plan,p_subscription);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_subscription_bind(uuid,text,uuid,bigint,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_subscription_bind(uuid,text,uuid,bigint,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_subscription_bind(uuid,text,uuid,bigint,text,text)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_cancel_claim(p_owner uuid, p_intent text, p_generation bigint)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_claim_cancel_once(p_owner,p_intent,p_generation);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_cancel_claim(uuid,text,bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_cancel_claim(uuid,text,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_cancel_claim(uuid,text,bigint)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_event_queue(p_owner uuid, p_intent text, p_subscription text, p_generation bigint, p_event_id text, p_event_type text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_queue_verified_event(p_owner,p_intent,p_subscription,p_generation,p_event_id,p_event_type);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_sale_record(p_owner uuid, p_intent text, p_subscription text, p_generation bigint, p_event_id text, p_sale_id text, p_cycle_key text, p_amount_minor integer, p_currency text, p_start timestamptz, p_end timestamptz)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_record_verified_sale(p_owner,p_intent,p_subscription,p_generation,p_event_id,p_sale_id,p_cycle_key,p_amount_minor,p_currency,p_start,p_end);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_refund_record(p_owner uuid, p_intent text, p_subscription text, p_generation bigint, p_sale_id text, p_event_id text, p_hold_id text, p_kind text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_record_verified_refund(p_owner,p_intent,p_subscription,p_generation,p_sale_id,p_event_id,p_hold_id,p_kind);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text)
 TO service_role;


CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_paid_period_projection(p_owner uuid, p_as_of timestamptz)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $pazo$
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 RETURN supporter_private.pazo_live_project_paid_periods(p_owner,p_as_of);
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_paid_period_projection(uuid,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_paid_period_projection(uuid,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_paid_period_projection(uuid,timestamptz)
 TO service_role;


-- Read only the currently selected Live generation. Never reveal secrets.
-- Existing historical subscriptions resolve by original generation separately.
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
  'planId',g.plan_id,'credentialSource',g.credential_source
 ) INTO output
 FROM admin_private.pazo_paypal_new_checkout_switch s
 JOIN admin_private.pazo_paypal_merchant_generations g
  ON g.generation=s.active_generation
 WHERE s.singleton=true AND s.environment='live'
  AND s.live_enabled=true AND s.kill_switch=false
  AND g.environment='live' AND g.retired_at IS NULL
  AND g.credential_source='edge_secrets';
 RETURN output;
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_active_route() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_active_route()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_active_route()
 TO service_role;

DO $postflight$
DECLARE f record;
BEGIN
 IF (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'pazo_f16_live_service_%'
     AND p.proname<>'pazo_f16_live_service_binding_read')<>9
 THEN RAISE EXCEPTION 'F16 service bridge count mismatch'; END IF;
 FOR f IN SELECT p.oid FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'pazo_f16_live_service_%'
     AND p.proname<>'pazo_f16_live_service_binding_read'
 LOOP
   IF NOT pg_catalog.has_function_privilege('service_role',f.oid,'EXECUTE')
     OR pg_catalog.has_function_privilege('anon',f.oid,'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated',f.oid,'EXECUTE')
     OR NOT (SELECT prosecdef FROM pg_catalog.pg_proc WHERE oid=f.oid)
   THEN RAISE EXCEPTION 'F16 service bridge permission mismatch';
   END IF;
 END LOOP;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_new_checkout_switch
      WHERE singleton AND environment='sandbox' AND live_enabled=false
       AND kill_switch=true AND active_generation IS NULL)<>1
 THEN RAISE EXCEPTION 'F16 Live gate changed'; END IF;
END $postflight$;
