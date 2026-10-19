-- PAZO F16 LIVE verified-binding / signed-event / paid-receipt STAGING.
-- PROPOSAL ONLY: must NOT apply to hosted Supabase without explicit PO GO.
-- NO EXECUTE grants to anon, authenticated or service_role. No payment calls.
-- Backend future MUST independently GET PayPal Live subscription/sale with
-- ORIGINAL merchant Vault generation and verify owner/plan/amount/period
-- BEFORE invoking these private functions. A signed webhook alone is not
-- payment evidence. Never accept these arguments directly from a browser.
BEGIN;
DO $requirements$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_event_inbox') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_paid_periods') IS NULL
  OR to_regprocedure('supporter_private.pazo_live_intent_claim_once(uuid,text,uuid,bigint)') IS NULL
 THEN RAISE EXCEPTION 'F16 LIVE receipt private infrastructure prerequisite missing'
   USING ERRCODE='42501'; END IF;
END $requirements$;

-- Called only AFTER authenticated owner + PayPal Live merchant GET show the
-- same intent_id (custom_id), plan_id, owner-linked merchant and provider ID.
-- Does not depend on the new-checkout selector: interrupted purchases must
-- be recoverable even after the kill switch closes NEW checkouts.
CREATE FUNCTION supporter_private.pazo_live_bind_verified_subscription(
 p_owner uuid,p_intent text,p_request_key uuid,p_generation bigint,
 p_plan text,p_provider_subscription text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
BEGIN
 IF p_owner IS NULL OR p_intent IS NULL OR p_request_key IS NULL
  OR p_generation IS NULL OR p_generation<1
  OR p_plan IS NULL OR p_plan !~ '^P-[A-Z0-9]{12,40}$'
  OR p_provider_subscription IS NULL
  OR p_provider_subscription !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RETURN 'invalid_binding'; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE intent_id=p_intent AND owner_id=p_owner AND request_key=p_request_key
  AND merchant_generation=p_generation AND source_environment='live'
  AND plan_id=p_plan AND affirmative_consent=true
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'owner_intent_or_plan_mismatch'; END IF;
 IF i.state='bound' THEN
  IF i.provider_subscription_id=p_provider_subscription
  THEN RETURN 'already_bound'; END IF;
  RETURN 'binding_conflict';
 END IF;
 IF i.state<>'pending' OR i.provider_create_claimed_at IS NULL
 THEN RETURN 'provider_create_not_claimed'; END IF;
 -- A DB CHECK/UNIQUE additionally prevents a second owner from binding the
 -- same PayPal subscription and prohibits changing merchant generation.
 UPDATE supporter_private.pazo_paypal_live_checkout_intents
 SET provider_subscription_id=p_provider_subscription,state='bound'
 WHERE intent_id=i.intent_id AND state='pending';
 RETURN 'bound';
EXCEPTION WHEN unique_violation THEN RETURN 'subscription_already_bound_elsewhere';
END $f$;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_bind_verified_subscription(uuid,text,uuid,bigint,text,text)
 FROM PUBLIC,anon,authenticated,service_role;

-- Only after PayPal has confirmed webhook signature with LIVE webhook ID
-- AND backend cross-checked event/subscription/plan/merchant owner via GET.
-- Only minimal event ID/type is kept. Repeat returns duplicate, not a charge.
CREATE FUNCTION supporter_private.pazo_live_queue_verified_event(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,
 p_event_id text,p_event_type text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE existing_type text; saved_type text;
BEGIN
 IF p_owner IS NULL OR p_intent IS NULL OR p_subscription IS NULL
  OR p_generation IS NULL OR p_generation<1 OR
  p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
  OR p_event_type IS NULL OR p_event_type NOT IN(
   'PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED',
   'PAYMENT.SALE.REVERSED','BILLING.SUBSCRIPTION.CREATED',
   'BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.CANCELLED',
   'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.EXPIRED',
   'BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.PAYMENT.FAILED')
 THEN RETURN 'invalid_event'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i
  JOIN admin_private.pazo_paypal_merchant_generations m
   ON m.generation=i.merchant_generation AND m.environment='live'
  WHERE i.owner_id=p_owner AND i.intent_id=p_intent
   AND i.provider_subscription_id=p_subscription
   AND i.state='bound' AND i.merchant_generation=p_generation
   AND i.source_environment='live' AND i.plan_id=m.plan_id
 ) THEN RETURN 'owner_binding_not_verified'; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
  merchant_generation,provider_event_id,event_type,source_environment)
 VALUES(p_generation,p_event_id,p_event_type,'live')
 ON CONFLICT (merchant_generation,provider_event_id) DO NOTHING
 RETURNING event_type INTO saved_type;
 IF saved_type IS NOT NULL THEN RETURN 'queued'; END IF;
 SELECT event_type INTO existing_type
 FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id;
 IF existing_type=p_event_type THEN RETURN 'duplicate_verified_event'; END IF;
 RETURN 'event_id_conflict';
END $f$;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_queue_verified_event(uuid,text,text,bigint,text,text)
 FROM PUBLIC,anon,authenticated,service_role;

-- Backend must GET a COMPLETED SALE from the exact original PayPal merchant
-- and calculate the verified service window BEFORE invoking. Nothing here
-- trusts a redirect, subscription ACTIVE status, or unchecked event payload.
-- Serializing on the owner intent prevents concurrent overlapping periods.
CREATE FUNCTION supporter_private.pazo_live_record_verified_sale(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,
 p_event_id text,p_sale_id text,p_cycle_key text,
 p_amount_minor integer,p_currency text,
 p_service_start timestamptz,p_service_end timestamptz
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
 e supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
 s supporter_private.pazo_paypal_live_paid_periods%ROWTYPE;
 inserted_id text;
BEGIN
 IF p_owner IS NULL OR p_intent IS NULL OR p_subscription IS NULL
  OR p_generation IS NULL OR p_generation<1 OR p_event_id IS NULL
  OR p_sale_id IS NULL OR p_sale_id !~ '^[A-Za-z0-9._-]{3,128}$'
  OR p_cycle_key IS NULL OR p_cycle_key !~ '^[A-Za-z0-9_-]{6,100}$'
  OR p_amount_minor IS DISTINCT FROM 299 OR p_currency IS DISTINCT FROM 'USD'
  OR p_service_start IS NULL OR p_service_end IS NULL OR
     p_service_end<=p_service_start OR
     p_service_end>p_service_start+interval '32 days'
 THEN RETURN 'invalid_sale_contract'; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE owner_id=p_owner AND intent_id=p_intent AND
  provider_subscription_id=p_subscription AND
  merchant_generation=p_generation AND source_environment='live'
  AND state='bound'
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'owner_binding_not_verified'; END IF;
 SELECT * INTO e FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND source_environment='live' AND event_type='PAYMENT.SALE.COMPLETED'
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'signed_completed_sale_event_required'; END IF;
 SELECT * INTO s FROM supporter_private.pazo_paypal_live_paid_periods
 WHERE sale_id=p_sale_id;
 IF FOUND THEN
  IF s.intent_id=p_intent AND s.merchant_generation=p_generation
   AND s.provider_event_id=p_event_id AND s.cycle_key=p_cycle_key
   AND s.amount_minor=p_amount_minor AND s.currency=p_currency
   AND s.service_start=p_service_start AND s.service_end=p_service_end
  THEN RETURN 'already_recorded'; END IF;
  RETURN 'sale_id_conflict';
 END IF;
 IF EXISTS(
  SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
  WHERE p.intent_id=p_intent AND
   p.service_start<p_service_end AND p.service_end>p_service_start
 ) THEN RETURN 'overlapping_service_period'; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
  sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
  amount_minor,currency,service_start,service_end,merchant_verified_at
 ) VALUES(p_sale_id,p_intent,p_generation,p_event_id,p_cycle_key,
   p_amount_minor,p_currency,p_service_start,p_service_end,
   pg_catalog.clock_timestamp())
 ON CONFLICT DO NOTHING RETURNING sale_id INTO inserted_id;
 IF inserted_id IS NULL THEN RETURN 'duplicate_sale_or_cycle_conflict'; END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox
 SET processing_state='processed'
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND event_type='PAYMENT.SALE.COMPLETED';
 RETURN 'recorded';
END $f$;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_record_verified_sale(uuid,text,text,bigint,
  text,text,text,integer,text,timestamptz,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
