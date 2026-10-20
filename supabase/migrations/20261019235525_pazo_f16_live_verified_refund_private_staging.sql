-- PAZO F16 Live verified REFUND / REVERSAL receipt STAGING.
-- Proposal only; no PayPal call, production deployment or grants.
-- A signed webhook alone is NOT refund proof. Before calling, the future
-- server backend must GET original merchant's matching refund/reversal,
-- sale ID, subscription/owner and exact amount from PayPal Live.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_period_holds') IS NULL
  OR to_regprocedure('supporter_private.pazo_live_queue_verified_event(uuid,text,text,bigint,text,text)') IS NULL
 THEN RAISE EXCEPTION 'F16 Live refund stage prerequisites missing'
  USING ERRCODE='42501'; END IF;
END $preflight$;

-- Nullable for synthetic history inserted by earlier disposable labs.
-- New records are written only through this owner/merchant-scoped RPC.
ALTER TABLE supporter_private.pazo_paypal_live_period_holds
 ADD COLUMN merchant_generation bigint,
 ADD COLUMN verified_event_id text,
 ADD COLUMN verified_event_type text,
 ADD CONSTRAINT pazo_live_refund_signed_event_fk
  FOREIGN KEY(merchant_generation,verified_event_id,verified_event_type)
  REFERENCES supporter_private.pazo_paypal_live_event_inbox(
   merchant_generation,provider_event_id,event_type),
 ADD CONSTRAINT pazo_live_refund_event_type_check CHECK (
  verified_event_type IS NULL OR verified_event_type IN (
    'PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')),
 ADD CONSTRAINT pazo_live_refund_event_unique UNIQUE
  (merchant_generation,verified_event_id);

CREATE FUNCTION supporter_private.pazo_live_record_verified_refund(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,
 p_sale_id text,p_event_id text,p_hold_id text,p_kind text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE p supporter_private.pazo_paypal_live_paid_periods%ROWTYPE;
 e supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
 h supporter_private.pazo_paypal_live_period_holds%ROWTYPE;
 inserted_id text;
BEGIN
 IF p_owner IS NULL OR p_intent IS NULL OR p_subscription IS NULL OR
  p_generation IS NULL OR p_generation<1 OR p_sale_id IS NULL OR
  p_event_id IS NULL OR p_hold_id IS NULL OR
  p_hold_id !~ '^[A-Za-z0-9._-]{3,128}$' OR
  p_kind NOT IN('refunded','partially_refunded','reversed')
 THEN RETURN 'invalid_refund_contract'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i
  WHERE i.owner_id=p_owner AND i.intent_id=p_intent
   AND i.provider_subscription_id=p_subscription
   AND i.merchant_generation=p_generation
   AND i.source_environment='live' AND i.state='bound'
 ) THEN RETURN 'owner_binding_not_verified'; END IF;
 SELECT * INTO p FROM supporter_private.pazo_paypal_live_paid_periods
 WHERE sale_id=p_sale_id AND intent_id=p_intent
  AND merchant_generation=p_generation FOR UPDATE;
 IF NOT FOUND THEN RETURN 'original_sale_not_verified'; END IF;
 SELECT * INTO e FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND linked_intent_id=p_intent AND source_environment='live'
  AND event_type IN('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')
 FOR UPDATE;
 IF NOT FOUND THEN RETURN 'signed_refund_event_required'; END IF;
 IF (e.event_type='PAYMENT.SALE.REVERSED' AND p_kind<>'reversed') OR
    (e.event_type='PAYMENT.SALE.REFUNDED' AND
     p_kind NOT IN('refunded','partially_refunded'))
 THEN RETURN 'refund_event_kind_conflict'; END IF;
 SELECT * INTO h FROM supporter_private.pazo_paypal_live_period_holds
 WHERE sale_id=p_sale_id AND hold_id=p_hold_id;
 IF FOUND THEN
  IF h.merchant_generation=p_generation AND
     h.verified_event_id=p_event_id AND
     h.verified_event_type=e.event_type AND h.kind=p_kind
  THEN RETURN 'already_recorded'; END IF;
  RETURN 'hold_id_conflict';
 END IF;
 INSERT INTO supporter_private.pazo_paypal_live_period_holds(
   sale_id,hold_id,kind,verified_at,
   merchant_generation,verified_event_id,verified_event_type
 ) VALUES(p_sale_id,p_hold_id,p_kind,pg_catalog.clock_timestamp(),
  p_generation,p_event_id,e.event_type)
 ON CONFLICT DO NOTHING RETURNING hold_id INTO inserted_id;
 IF inserted_id IS NULL THEN RETURN 'duplicate_refund_event_or_hold'; END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox
 SET processing_state='processed'
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id;
 RETURN 'recorded';
END $f$;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_record_verified_refund(
 uuid,text,text,bigint,text,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
