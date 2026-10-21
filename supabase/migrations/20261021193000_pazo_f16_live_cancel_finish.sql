-- PAZO F16 Live: finish an already owner-scoped cancel claim.
-- Does not create a claim, send a PayPal request or change paid periods.
-- Only the service-role Edge code may attest independent provider GET.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_cancel_finish(
 p_owner uuid,p_intent text,p_generation bigint,p_outcome text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE changed boolean:=false;
BEGIN
 IF COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claims',true),''),
  '{}')::jsonb->>'role' IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR p_generation NOT BETWEEN 1 AND 9999 OR
  p_outcome NOT IN ('confirmed','review_required')
 THEN RETURN false; END IF;
 -- Retain a prior provider-confirmed cancellation; replays must be idempotent.
 IF p_outcome='confirmed' AND EXISTS(
  SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims c
  JOIN supporter_private.pazo_paypal_live_checkout_intents i
    ON i.intent_id=c.intent_id AND i.merchant_generation=c.merchant_generation
  WHERE i.owner_id=p_owner AND i.intent_id=p_intent AND
    i.merchant_generation=p_generation AND i.source_environment='live'
    AND i.state='bound' AND i.provider_subscription_id IS NOT NULL
    AND c.state='confirmed' AND c.provider_confirmed_at IS NOT NULL
 ) THEN RETURN true; END IF;
 UPDATE supporter_private.pazo_paypal_live_cancel_claims c
 SET state=p_outcome,
  provider_confirmed_at=CASE WHEN p_outcome='confirmed'
    THEN pg_catalog.clock_timestamp() ELSE NULL END
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.intent_id=c.intent_id AND i.merchant_generation=c.merchant_generation
  AND i.owner_id=p_owner AND i.intent_id=p_intent
  AND i.merchant_generation=p_generation AND i.source_environment='live'
  AND i.state='bound' AND i.provider_subscription_id IS NOT NULL
  AND c.state IN ('claimed','review_required')
  AND c.provider_confirmed_at IS NULL;
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed;
END $f$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)
 TO service_role;
COMMIT;
