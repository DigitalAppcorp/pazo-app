-- PAZO F16: REVIEW REQUIRED / NO HOSTED APPLY WITHOUT DISTINCT PO GO.
-- Controlled service-only RPC bridges to ALREADY INSTALLED private financial logic.
-- This file is a draft, not an automatic migration. Historical merchant routing
-- and all runtime OFF CHECK constraints remain untouched.
-- Authentication / provider verification belong to the Edge server; these bridges
-- still verify PostgREST role claim, and private functions enforce immutable DB keys.
BEGIN;

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

COMMIT;
