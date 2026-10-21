-- PAZO F16. Read-only service-only slot inspection before any new checkout.
-- Prevents a new requestKey from creating another PayPal subscription while
-- an original attempt is pending, claimed, bound, or not yet reconciled.
-- Strictly fail closed; never infer absence from an API timeout/404.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_owner_slot(
 p_owner uuid,p_generation bigint)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $rpc$
DECLARE
 v_count integer;
 v supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
    IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
 THEN RETURN pg_catalog.jsonb_build_object('state','review_required'); END IF;

 -- All generations are considered: a merchant rotation must never allow
 -- a second subscription while an older one may still auto-renew.
 SELECT pg_catalog.count(*)::integer INTO v_count
 FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE owner_id=p_owner AND source_environment='live';
 IF v_count=0 THEN RETURN pg_catalog.jsonb_build_object('state','none'); END IF;
 IF v_count<>1 THEN RETURN pg_catalog.jsonb_build_object('state','review_required'); END IF;

 SELECT * INTO v FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE owner_id=p_owner AND source_environment='live'
 ORDER BY created_at DESC LIMIT 1;
 IF v.intent_id IS NULL OR v.affirmative_consent IS NOT TRUE OR
  v.state NOT IN('pending','bound') OR
  v.merchant_generation NOT BETWEEN 1 AND 9999
 THEN RETURN pg_catalog.jsonb_build_object('state','review_required'); END IF;

 IF v.state='pending' AND v.provider_create_claimed_at IS NULL
 THEN RETURN pg_catalog.jsonb_build_object(
  'state','pending_unclaimed','intentId',v.intent_id,
  'requestKey',v.request_key,'merchantGeneration',v.merchant_generation);
 END IF;
 IF v.state='pending' AND v.provider_create_claimed_at IS NOT NULL
 THEN RETURN pg_catalog.jsonb_build_object(
  'state','pending_claimed_review','intentId',v.intent_id,
  'merchantGeneration',v.merchant_generation);
 END IF;
 IF v.state='bound' AND v.provider_subscription_id IS NOT NULL
 THEN RETURN pg_catalog.jsonb_build_object(
  'state','bound_requires_owner_management','intentId',v.intent_id,
  'merchantGeneration',v.merchant_generation,
  'providerStatus',COALESCE(v.provider_status,'UNKNOWN'));
 END IF;
 RETURN pg_catalog.jsonb_build_object('state','review_required');
END $rpc$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_owner_slot(uuid,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_owner_slot(uuid,bigint)
 TO service_role;
-- Concurrency protection: two browser tabs with different request keys
-- cannot both insert an unverified subscription intent for one owner.
-- Same request key remains idempotent through the existing UNIQUE constraint.
CREATE OR REPLACE FUNCTION supporter_private.pazo_live_owner_slot_insert_guard()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $trigger$
BEGIN
 IF NEW.source_environment IS DISTINCT FROM 'live' OR NEW.owner_id IS NULL
 THEN RAISE EXCEPTION 'invalid live owner slot' USING ERRCODE='23514'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('pazo:live:checkout:owner:'||NEW.owner_id::text,0));
 IF EXISTS(
  SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents old
  WHERE old.owner_id=NEW.owner_id AND old.source_environment='live'
   AND old.request_key IS DISTINCT FROM NEW.request_key
 )
 THEN RAISE EXCEPTION 'existing Live checkout requires reconciliation' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $trigger$;
DROP TRIGGER IF EXISTS pazo_live_owner_slot_insert_guard ON supporter_private.pazo_paypal_live_checkout_intents;
CREATE TRIGGER pazo_live_owner_slot_insert_guard
BEFORE INSERT ON supporter_private.pazo_paypal_live_checkout_intents
FOR EACH ROW EXECUTE FUNCTION supporter_private.pazo_live_owner_slot_insert_guard();
REVOKE ALL ON FUNCTION supporter_private.pazo_live_owner_slot_insert_guard()
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
