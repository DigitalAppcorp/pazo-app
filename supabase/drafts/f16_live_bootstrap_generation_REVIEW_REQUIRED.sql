-- PAZO F16 — REVIEW REQUIRED, NOT HOSTED. PO must approve a versioned
-- migration after ACL/PG17 lab. Resolves generation/webhook circular dependency:
-- reserve identity once, register the exact provider webhook, finalize metadata.
-- No provider credentials, subscriptions, payments, entitlements, or switch.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('admin_private.pazo_paypal_live_bootstrap_reservations') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_bootstrap_reserve(uuid,text)') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_bootstrap_finalize(uuid,bigint,text,text,text)') IS NOT NULL
  OR to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL
  OR to_regclass('admin_private.paypal_gateway_settings') IS NULL
  OR to_regclass('admin_private.pazo_paypal_new_checkout_switch') IS NULL
  OR EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
    WHERE singleton AND (environment<>'sandbox' OR live_enabled OR
      NOT kill_switch OR active_generation IS NOT NULL))
 THEN RAISE EXCEPTION 'live bootstrap preflight blocked' USING ERRCODE='42501';
 END IF;
END $guard$;

CREATE TABLE admin_private.pazo_paypal_live_bootstrap_reservations (
 generation bigint PRIMARY KEY
  CHECK(generation BETWEEN 1 AND 9999),
 actor_id uuid NOT NULL,
 plan_id text NOT NULL UNIQUE CHECK(plan_id ~ '^P-[A-Z0-9]{12,40}$'),
 state text NOT NULL DEFAULT 'reserved'
  CHECK(state IN ('reserved','finalized')),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 finalized_at timestamptz,
 CONSTRAINT live_bootstrap_state_check CHECK(
  (state='reserved' AND finalized_at IS NULL) OR
  (state='finalized' AND finalized_at IS NOT NULL)
 )
);
ALTER TABLE admin_private.pazo_paypal_live_bootstrap_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_paypal_live_bootstrap_reservations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_paypal_live_bootstrap_reservations
 FROM PUBLIC,anon,authenticated,service_role;

-- May reserve only by an authenticated and step-up verified admin at the
-- external server boundary. This privileged RPC is never callable by a user JWT.
-- Durable UNIQUE(plan_id) makes timeout/retry ambiguous, not another reservation.
CREATE FUNCTION public.pazo_f16_live_service_bootstrap_reserve(
 p_actor uuid,p_plan text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE g bigint;
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
  WHERE environment='live' AND plan_id=p_plan) OR
  EXISTS (SELECT 1 FROM admin_private.pazo_paypal_live_bootstrap_reservations
    WHERE plan_id=p_plan) OR
  EXISTS (SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
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

-- This consumes a provider-verified fingerprint and webhook ID from the
-- private server workflow. SQL does NOT certify provider authentication.
-- Only one state transition; no overwrites, no implicit retry.
CREATE FUNCTION public.pazo_f16_live_service_bootstrap_finalize(
 p_actor uuid,p_generation bigint,p_plan text,p_webhook text,p_fingerprint text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
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
END $f$;

ALTER FUNCTION public.pazo_f16_live_service_bootstrap_reserve(uuid,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_bootstrap_finalize(uuid,bigint,text,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_bootstrap_reserve(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_bootstrap_finalize(uuid,bigint,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_bootstrap_reserve(uuid,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_bootstrap_finalize(uuid,bigint,text,text,text)
 TO service_role;
COMMIT;
