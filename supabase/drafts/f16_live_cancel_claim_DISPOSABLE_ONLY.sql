-- PAZO F16 — account-owner cancellation claim, PostgreSQL 17 DISPOSABLE.
-- Cancellation remains possible independently of new-checkout kill switch.
-- This is NOT a hosted migration. No service_role RPC access is granted.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
  OR to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
 THEN RAISE EXCEPTION 'F16 LIVE CANCEL CLAIM DISPOSABLE ONLY'
  USING ERRCODE='42501'; END IF;
END $guard$;
CREATE TABLE supporter_private.pazo_paypal_live_cancel_claims(
 intent_id text PRIMARY KEY,
 merchant_generation bigint NOT NULL,
 requested_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 provider_confirmed_at timestamptz,
 state text NOT NULL DEFAULT 'claimed'
  CHECK(state IN ('claimed','confirmed','review_required')),
 CONSTRAINT pazo_live_cancel_origin_fk
  FOREIGN KEY(intent_id,merchant_generation)
  REFERENCES supporter_private.pazo_paypal_live_checkout_intents
   (intent_id,merchant_generation),
 CONSTRAINT pazo_live_cancel_confirm_state CHECK(
  (provider_confirmed_at IS NULL AND state<>'confirmed') OR
  (provider_confirmed_at IS NOT NULL AND state='confirmed'))
);
ALTER TABLE supporter_private.pazo_paypal_live_cancel_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_cancel_claims FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_cancel_claims
 FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION supporter_private.pazo_live_claim_cancel_once(
 p_owner_id uuid,p_intent_id text,p_merchant_generation bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE claimed boolean:=false;
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL OR
  p_merchant_generation IS NULL OR p_merchant_generation<1
 THEN RETURN false; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_cancel_claims(
  intent_id,merchant_generation
 )
 SELECT i.intent_id,i.merchant_generation
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.owner_id=p_owner_id AND i.intent_id=p_intent_id
  AND i.merchant_generation=p_merchant_generation
  AND i.source_environment='live'
  AND i.state='bound' AND i.provider_subscription_id IS NOT NULL
 ON CONFLICT (intent_id) DO NOTHING;
 GET DIAGNOSTICS claimed = ROW_COUNT;
 RETURN claimed;
END $function$;
ALTER FUNCTION supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)
 OWNER TO postgres;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
