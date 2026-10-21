-- Read only the original consent, signed activation and prior verified periods
-- for an existing current lease. Never accepts a client-selected subscription.
BEGIN;
DO $guard$ BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_signed_receipts') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_signed_receipt_read(bigint,text,uuid)') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_financial_context_read(bigint,text,uuid)') IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'financial context prerequisite drift'; END IF;
END $guard$;
CREATE FUNCTION public.pazo_f16_live_service_financial_context_read(
 p_generation bigint,p_event_id text,p_lease uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $context$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
 receipt jsonb; activation jsonb; previous jsonb; n integer;
 canonical CONSTANT text='YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 receipt:=public.pazo_f16_live_service_signed_receipt_read(p_generation,p_event_id,p_lease);
 IF receipt IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE provider_subscription_id=receipt->>'subscriptionId' AND merchant_generation=p_generation
  AND source_environment='live' AND state='bound';
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(a.item),'[]'::jsonb) INTO activation FROM (
  SELECT pg_catalog.jsonb_build_object('eventId',r.provider_event_id,
   'activationAt',pg_catalog.to_char(r.activation_at AT TIME ZONE 'UTC',canonical),
   'nextBillingAt',pg_catalog.to_char(r.next_billing_at AT TIME ZONE 'UTC',canonical),
   'signedBodySha256',r.signed_body_sha256) AS item
  FROM supporter_private.pazo_paypal_live_signed_receipts r
  JOIN supporter_private.pazo_paypal_live_event_inbox e ON e.merchant_generation=r.merchant_generation
   AND e.provider_event_id=r.provider_event_id AND e.linked_intent_id=i.intent_id
  WHERE r.merchant_generation=p_generation AND r.subscription_id=i.provider_subscription_id
   AND r.event_type='BILLING.SUBSCRIPTION.ACTIVATED' AND r.activation_at IS NOT NULL
   AND r.next_billing_at IS NOT NULL AND r.proof_source='paypal_live_postback_success'
  ORDER BY r.activation_at,r.provider_event_id LIMIT 2
 ) a;
 SELECT count(*)::integer INTO n FROM supporter_private.pazo_paypal_live_paid_periods p
 WHERE p.intent_id=i.intent_id AND p.merchant_generation=p_generation;
 SELECT pg_catalog.jsonb_build_object('saleId',p.sale_id,'cycleKey',p.cycle_key,
  'serviceStart',pg_catalog.to_char(p.service_start AT TIME ZONE 'UTC',canonical),
  'serviceEnd',pg_catalog.to_char(p.service_end AT TIME ZONE 'UTC',canonical))
 INTO previous FROM supporter_private.pazo_paypal_live_paid_periods p
 WHERE p.intent_id=i.intent_id AND p.merchant_generation=p_generation
 ORDER BY p.service_end DESC LIMIT 1;
 RETURN pg_catalog.jsonb_build_object('source','original_bound_live_financial_context',
  'merchantGeneration',p_generation,'eventId',p_event_id,'ownerId',i.owner_id,
  'intentId',i.intent_id,'subscriptionId',i.provider_subscription_id,'planId',i.plan_id,
  'affirmativeConsent',i.affirmative_consent,'termsVersion',i.terms_version,'termsDigest',i.terms_digest,'locale',i.locale,
  'consentedAt',pg_catalog.to_char(i.created_at AT TIME ZONE 'UTC',canonical),
  'activationReceipts',activation,'paidPeriodCount',n,'lastPaidPeriod',previous,
  'activeHold',EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
   JOIN supporter_private.pazo_paypal_live_paid_periods p ON p.sale_id=h.sale_id
   WHERE p.intent_id=i.intent_id AND p.merchant_generation=p_generation AND h.released_at IS NULL),
  'unreconciledFinancialRisk',EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox e
   WHERE e.linked_intent_id=i.intent_id AND e.merchant_generation=p_generation
    AND e.event_type IN('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED') AND e.processing_state<>'processed'),
  'paymentRecorded',false,'mayGrantBenefits',false);
END $context$;
ALTER FUNCTION public.pazo_f16_live_service_financial_context_read(bigint,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_financial_context_read(bigint,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_financial_context_read(bigint,text,uuid) TO service_role;
COMMIT;
