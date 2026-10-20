-- F16 REVIEW DRAFT ONLY; DO NOT APPLY HOSTED without separately reviewing ACL.
-- Server-only read of an ALREADY persisted Live sale from immutable owner binding.
-- No checkout, PayPal call, entitlement grant, payment write, or secrets.
BEGIN;
DO $requirements$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_paid_periods') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_event_inbox') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_recorded_sale_read(uuid,text,text,bigint,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 recorded sale read preflight blocked' USING ERRCODE='42501';
 END IF;
END $requirements$;

CREATE FUNCTION public.pazo_f16_live_service_recorded_sale_read(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,p_sale_id text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $pazo$
DECLARE result jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
    IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR
  p_intent !~ '^intent-[a-f0-9-]{36}$' OR
  p_subscription IS NULL OR
  p_subscription !~ '^I-[A-Za-z0-9_-]{3,70}$' OR
  p_generation IS NULL OR p_generation<1 OR p_generation>9999 OR
  p_sale_id IS NULL OR p_sale_id !~ '^[A-Za-z0-9._-]{3,128}$'
 THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'recorded',true,'sourceEnvironment','live',
  'ownerId',i.owner_id,'intentId',i.intent_id,
  'subscriptionId',i.provider_subscription_id,
  'merchantGeneration',p.merchant_generation,
  'saleId',p.sale_id,'amountMinor',p.amount_minor,
  'currency',p.currency
 ) INTO result
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 JOIN supporter_private.pazo_paypal_live_paid_periods p
  ON p.intent_id=i.intent_id AND p.merchant_generation=i.merchant_generation
 JOIN supporter_private.pazo_paypal_live_event_inbox e
  ON e.merchant_generation=p.merchant_generation
  AND e.provider_event_id=p.provider_event_id
 WHERE i.owner_id=p_owner AND i.intent_id=p_intent
  AND i.provider_subscription_id=p_subscription AND i.state='bound'
  AND i.source_environment='live' AND i.affirmative_consent
  AND i.merchant_generation=p_generation
  AND p.sale_id=p_sale_id AND p.amount_minor=299 AND p.currency='USD'
  AND p.verified_event_type='PAYMENT.SALE.COMPLETED'
  AND e.source_environment='live' AND e.linked_intent_id=i.intent_id
  AND e.event_type='PAYMENT.SALE.COMPLETED';
 RETURN result;
END $pazo$;
ALTER FUNCTION public.pazo_f16_live_service_recorded_sale_read(
 uuid,text,text,bigint,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_recorded_sale_read(
 uuid,text,text,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_recorded_sale_read(
 uuid,text,text,bigint,text) TO service_role;
COMMIT;
