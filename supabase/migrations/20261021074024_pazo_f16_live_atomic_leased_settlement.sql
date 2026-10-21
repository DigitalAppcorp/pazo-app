-- The existing private writers and lease acknowledgement commit together.
-- No Live selector, webhook release, provider operation or credentials changed.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_signed_receipts') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid)') IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
  OR (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid=to_regprocedure(
   'supporter_private.pazo_live_record_verified_sale(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz)'))
    IS DISTINCT FROM 'a43f0f2457eb37e9124efa7692d61fd2'
  OR (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid=to_regprocedure(
   'supporter_private.pazo_live_record_verified_refund(uuid,text,text,bigint,text,text,text,text)'))
    IS DISTINCT FROM '063a4e7dcdb00480cc20306cc7c55d82'
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid IN(
   to_regprocedure('supporter_private.pazo_live_record_verified_sale(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz)'),
   to_regprocedure('supporter_private.pazo_live_record_verified_refund(uuid,text,text,bigint,text,text,text,text)'))
   AND (NOT p.prosecdef OR pg_catalog.pg_get_userbyid(p.proowner)<>'postgres'
    OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']
    OR p.proacl::text IS DISTINCT FROM '{postgres=X/postgres}'))
 THEN RAISE EXCEPTION 'leased settlement prerequisite drift' USING ERRCODE='42501'; END IF;
END $guard$;

-- Retains only the successful private attempt identity so an uncertain HTTP
-- response can be resolved idempotently. Active lease fields are still cleared.
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox
 ADD COLUMN completed_lease_token uuid,
 ADD CONSTRAINT pazo_live_completed_lease_processed CHECK(
  completed_lease_token IS NULL OR processing_state='processed');

CREATE FUNCTION public.pazo_f16_live_service_leased_sale_record(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,
 p_event_id text,p_sale_id text,p_cycle_key text,p_amount_minor integer,p_currency text,
 p_start timestamptz,p_end timestamptz,p_lease uuid
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $sale$
DECLARE e supporter_private.pazo_paypal_live_event_inbox%ROWTYPE; result text;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_lease IS NULL THEN RETURN 'current_signed_lease_required'; END IF;
 -- Same lock order as the existing writer: owner intent, then inbox.
 PERFORM 1 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.owner_id=p_owner AND i.intent_id=p_intent AND i.provider_subscription_id=p_subscription
  AND i.merchant_generation=p_generation AND i.source_environment='live' AND i.state='bound'
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'owner_binding_not_verified'; END IF;
 SELECT * INTO e FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND linked_intent_id=p_intent AND event_type='PAYMENT.SALE.COMPLETED' AND source_environment='live'
 FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts r
  WHERE r.merchant_generation=p_generation AND r.provider_event_id=p_event_id
   AND r.subscription_id=p_subscription AND r.subject_id=p_sale_id
   AND r.event_type=e.event_type AND r.proof_source='paypal_live_postback_success')
 THEN RETURN 'persisted_signed_sale_required'; END IF;
 IF e.processing_state='processed' AND e.completed_lease_token=p_lease THEN
  IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
   WHERE p.sale_id=p_sale_id AND p.intent_id=p_intent AND p.merchant_generation=p_generation
    AND p.provider_event_id=p_event_id AND p.cycle_key=p_cycle_key
    AND p.amount_minor=p_amount_minor AND p.currency=p_currency
    AND p.service_start=p_start AND p.service_end=p_end)
  THEN RETURN 'already_recorded'; END IF;
  RETURN 'completed_lease_evidence_conflict';
 END IF;
 IF e.processing_state<>'processing' OR e.lease_token IS DISTINCT FROM p_lease
  OR e.lease_expires_at IS NULL OR e.lease_expires_at<pg_catalog.clock_timestamp()
 THEN RETURN 'current_signed_lease_required'; END IF;
 result:=supporter_private.pazo_live_record_verified_sale(p_owner,p_intent,p_subscription,p_generation,
  p_event_id,p_sale_id,p_cycle_key,p_amount_minor,p_currency,p_start,p_end);
 IF result IN('recorded','already_recorded') THEN
  UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed',
   completed_lease_token=p_lease,lease_token=NULL,leased_at=NULL,lease_expires_at=NULL
  WHERE merchant_generation=p_generation AND provider_event_id=p_event_id;
 END IF;
 RETURN result;
END $sale$;

CREATE FUNCTION public.pazo_f16_live_service_leased_refund_record(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,
 p_sale_id text,p_event_id text,p_hold_id text,p_kind text,p_lease uuid
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $refund$
DECLARE e supporter_private.pazo_paypal_live_event_inbox%ROWTYPE; result text;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_lease IS NULL THEN RETURN 'current_signed_lease_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i
  WHERE i.owner_id=p_owner AND i.intent_id=p_intent AND i.provider_subscription_id=p_subscription
   AND i.merchant_generation=p_generation AND i.source_environment='live' AND i.state='bound')
 THEN RETURN 'owner_binding_not_verified'; END IF;
 -- Match the refund writer's lock order: original paid period, then inbox.
 PERFORM 1 FROM supporter_private.pazo_paypal_live_paid_periods p
 WHERE p.sale_id=p_sale_id AND p.intent_id=p_intent AND p.merchant_generation=p_generation FOR UPDATE;
 IF NOT FOUND THEN RETURN 'original_sale_not_verified'; END IF;
 SELECT * INTO e FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND linked_intent_id=p_intent AND source_environment='live'
  AND event_type IN('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED') FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts r
  WHERE r.merchant_generation=p_generation AND r.provider_event_id=p_event_id
   AND r.subscription_id=p_subscription AND r.event_type=e.event_type
   AND r.proof_source='paypal_live_postback_success')
 THEN RETURN 'persisted_signed_refund_required'; END IF;
 IF e.processing_state='processed' AND e.completed_lease_token=p_lease THEN
  IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
   WHERE h.sale_id=p_sale_id AND h.hold_id=p_hold_id AND h.merchant_generation=p_generation
    AND h.verified_event_id=p_event_id AND h.verified_event_type=e.event_type AND h.kind=p_kind)
  THEN RETURN 'already_recorded'; END IF;
  RETURN 'completed_lease_evidence_conflict';
 END IF;
 IF e.processing_state<>'processing' OR e.lease_token IS DISTINCT FROM p_lease
  OR e.lease_expires_at IS NULL OR e.lease_expires_at<pg_catalog.clock_timestamp()
 THEN RETURN 'current_signed_lease_required'; END IF;
 result:=supporter_private.pazo_live_record_verified_refund(p_owner,p_intent,p_subscription,p_generation,
  p_sale_id,p_event_id,p_hold_id,p_kind);
 IF result IN('recorded','already_recorded') THEN
  UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed',
   completed_lease_token=p_lease,lease_token=NULL,leased_at=NULL,lease_expires_at=NULL
  WHERE merchant_generation=p_generation AND provider_event_id=p_event_id;
 END IF;
 RETURN result;
END $refund$;

ALTER FUNCTION public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_leased_refund_record(uuid,text,text,bigint,text,text,text,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_leased_refund_record(uuid,text,text,bigint,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_leased_refund_record(uuid,text,text,bigint,text,text,text,text,uuid) TO service_role;
-- Prevent the old non-leased bridges from bypassing the atomic contract.
REVOKE EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text) FROM service_role;
COMMIT;
