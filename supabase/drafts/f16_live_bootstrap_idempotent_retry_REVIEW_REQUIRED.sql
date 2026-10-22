-- PAZO F16 — REVIEW REQUIRED: idempotent recovery for reserved generation.
-- Does NOT change an existing merchant generation, settings, payments or keys.
-- Install only with a separate migration GO after isolated PG17 lab.
BEGIN;
DO $gate$
BEGIN
 IF to_regprocedure('public.pazo_f16_live_service_bootstrap_reserve(uuid,text)') IS NULL
  OR to_regclass('admin_private.pazo_paypal_live_bootstrap_reservations') IS NULL
  OR EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND (environment<>'sandbox' OR live_enabled
    OR NOT kill_switch OR active_generation IS NOT NULL))
 THEN RAISE EXCEPTION 'Live generation recovery prerequisite failed' USING ERRCODE='42501';
 END IF;
END $gate$;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_bootstrap_reserve(
 p_actor uuid,p_plan text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
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
END $f$;


ALTER FUNCTION public.pazo_f16_live_service_bootstrap_reserve(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_bootstrap_reserve(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_bootstrap_reserve(uuid,text)
 TO service_role;
COMMIT;
