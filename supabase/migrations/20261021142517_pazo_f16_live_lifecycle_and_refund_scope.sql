BEGIN;
DO $guard$ BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_signed_receipts') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid)') IS NULL
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'lifecycle/refund scope prerequisite drift'; END IF;
END $guard$;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents
 ADD COLUMN provider_status text CHECK(provider_status IN('APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
 ADD COLUMN provider_status_at timestamptz,
 ADD COLUMN provider_observed_at timestamptz,
 ADD COLUMN last_payment_failure_at timestamptz;

-- Used ONLY after signature postback or by the private refund worker.
-- A refund may omit billing_agreement_id: ownership and original transaction
-- time then come from the original verified ledger/receipt, never a URL or PII.
CREATE FUNCTION public.pazo_f16_live_service_refund_sale_binding_read(p_generation bigint,p_sale_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $scope$
DECLARE result jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_sale_id IS NULL OR p_sale_id !~ '^[A-Za-z0-9._-]{3,128}$' THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object('provider','paypal','sourceEnvironment','live','recorded',true,
  'ownerId',i.owner_id,'intentId',i.intent_id,'subscriptionId',i.provider_subscription_id,
  'merchantGeneration',p.merchant_generation,'planId',i.plan_id,'state',i.state,
  'consentVerified',i.affirmative_consent,'saleId',p.sale_id,'amountMinor',p.amount_minor,'currency',p.currency,
  'originalPaymentAt',pg_catalog.to_char(r.subject_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
 INTO result FROM supporter_private.pazo_paypal_live_paid_periods p
 JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id
  AND i.merchant_generation=p.merchant_generation AND i.source_environment='live' AND i.state='bound'
 JOIN supporter_private.pazo_paypal_live_signed_receipts r ON r.merchant_generation=p.merchant_generation
  AND r.provider_event_id=p.provider_event_id AND r.event_type='PAYMENT.SALE.COMPLETED'
  AND r.subject_id=p.sale_id AND r.subscription_id=i.provider_subscription_id
  AND r.proof_source='paypal_live_postback_success'
 WHERE p.sale_id=p_sale_id AND p.merchant_generation=p_generation AND i.affirmative_consent;
 RETURN result;
END $scope$;

CREATE FUNCTION public.pazo_f16_live_service_leased_lifecycle_record(
 p_generation bigint,p_event_id text,p_lease uuid,p_status text,p_status_at timestamptz
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $lifecycle$
DECLARE e supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
 i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; receipt jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_lease IS NULL OR p_status IS NULL OR p_status NOT IN('APPROVAL_PENDING','APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')
  OR p_status_at IS NULL OR NOT pg_catalog.isfinite(p_status_at) OR p_status_at>pg_catalog.clock_timestamp()+interval '5 minutes'
 THEN RETURN 'invalid_lifecycle_evidence'; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE intent_id=(SELECT linked_intent_id FROM supporter_private.pazo_paypal_live_event_inbox
  WHERE merchant_generation=p_generation AND provider_event_id=p_event_id)
  AND merchant_generation=p_generation AND source_environment='live' AND state='bound' FOR UPDATE;
 IF NOT FOUND THEN RETURN 'owner_binding_not_verified'; END IF;
 SELECT * INTO e FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id AND linked_intent_id=i.intent_id
  AND source_environment='live' AND event_type IN('BILLING.SUBSCRIPTION.CREATED','BILLING.SUBSCRIPTION.ACTIVATED',
   'BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.SUSPENDED',
   'BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.PAYMENT.FAILED') FOR UPDATE;
 IF NOT FOUND THEN RETURN 'signed_lifecycle_event_required'; END IF;
 IF e.processing_state='processed' AND e.completed_lease_token=p_lease THEN RETURN 'already_recorded'; END IF;
 receipt:=public.pazo_f16_live_service_signed_receipt_read(p_generation,p_event_id,p_lease);
 IF receipt IS NULL OR receipt->>'subscriptionId' IS DISTINCT FROM i.provider_subscription_id
 THEN RETURN 'current_signed_lease_required'; END IF;
 IF i.provider_status_at=p_status_at AND i.provider_status IS DISTINCT FROM p_status
 THEN RETURN 'provider_status_timestamp_conflict'; END IF;
 -- Late/out-of-order delivery cannot roll a newer merchant observation back.
 IF i.provider_status_at IS NULL OR p_status_at>=i.provider_status_at THEN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents SET provider_status=p_status,
   provider_status_at=p_status_at,provider_observed_at=pg_catalog.clock_timestamp()
  WHERE intent_id=i.intent_id;
 END IF;
 IF e.event_type='BILLING.SUBSCRIPTION.PAYMENT.FAILED' THEN
  UPDATE supporter_private.pazo_paypal_live_checkout_intents
  SET last_payment_failure_at=GREATEST(last_payment_failure_at,(receipt->>'providerEventAt')::timestamptz)
  WHERE intent_id=i.intent_id;
 END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed',completed_lease_token=p_lease,
  lease_token=NULL,leased_at=NULL,lease_expires_at=NULL
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id;
 -- No INSERT/UPDATE of paid periods, holds or entitlement grants here.
 RETURN 'recorded';
END $lifecycle$;
ALTER FUNCTION public.pazo_f16_live_service_refund_sale_binding_read(bigint,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_leased_lifecycle_record(bigint,text,uuid,text,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_refund_sale_binding_read(bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_leased_lifecycle_record(bigint,text,uuid,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_refund_sale_binding_read(bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_leased_lifecycle_record(bigint,text,uuid,text,timestamptz) TO service_role;
COMMIT;
