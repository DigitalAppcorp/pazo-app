-- PAZO F16: expand minimal verified event inbox to ALL EIGHT EXISTING
-- Sandbox PayPal webhook event types plus three new PAYMENT.SALE types.
-- Official name generated using Supabase CLI 2.120.0 on GitHub Action:
-- https://github.com/DigitalAppcorp/pazo-app/actions/runs/38538453624
-- PREPARED ONLY: DO NOT APPLY TO HOSTED SUPABASE without PO's separate GO.
-- No entitlement, checkout, membership, payment or legacy webhook change.
-- Events contain ONLY verified provider_event_id and public event_type;
-- no customer payload, amount, payer address, card or subscription secrets.
-- The two new subscription event types were found by official Sandbox
-- webhook event-catalog GET and explicitly observed by Product Owner.
BEGIN;
ALTER TABLE supporter_private.paypal_verified_event_inbox
 DROP CONSTRAINT f16_provider_event_type,
 ADD CONSTRAINT f16_provider_event_type CHECK (event_type IN (
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.SUBSCRIPTION.CREATED',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED',
  'PAYMENT.SALE.COMPLETED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED'
 ));
-- Preserve the entire verified-event idempotence and collision logic.
-- CREATE OR REPLACE keeps function OID and grants; ownership/ACL reiterated.
CREATE OR REPLACE FUNCTION public.f16_paypal_record_verified_event(
  p_provider_event_id text, p_event_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_inserted boolean;
  v_existing_type text;
BEGIN
  IF p_provider_event_id IS NULL
     OR p_provider_event_id !~ '^[A-Za-z0-9._-]{1,128}$'
     OR p_event_type IS NULL OR p_event_type NOT IN (
       'BILLING.SUBSCRIPTION.ACTIVATED',
       'BILLING.SUBSCRIPTION.UPDATED',
       'BILLING.SUBSCRIPTION.CANCELLED',
       'BILLING.SUBSCRIPTION.SUSPENDED',
       'BILLING.SUBSCRIPTION.EXPIRED',
       'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
       'BILLING.SUBSCRIPTION.CREATED',
       'BILLING.SUBSCRIPTION.RE-ACTIVATED',
       'PAYMENT.SALE.COMPLETED',
       'PAYMENT.SALE.REFUNDED',
       'PAYMENT.SALE.REVERSED'
     )
  THEN
    RAISE EXCEPTION 'Unsupported verified event reference'
      USING ERRCODE = '22023';
  END IF;

  -- The unique primary key serializes concurrent first inserts. Never UPDATE
  -- the row on webhook retries; don't reset processing state or timestamps.
  INSERT INTO supporter_private.paypal_verified_event_inbox AS inbox
    (provider_event_id,event_type)
  VALUES (p_provider_event_id,p_event_type)
  ON CONFLICT (provider_event_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted IS TRUE THEN
    RETURN true;
  END IF;

  SELECT inbox.event_type INTO v_existing_type
  FROM supporter_private.paypal_verified_event_inbox AS inbox
  WHERE inbox.provider_event_id=p_provider_event_id;

  -- Fail closed on a repeated PayPal event ID containing another event type:
  -- it must not be falsely acknowledged as the same event.
  IF v_existing_type IS DISTINCT FROM p_event_type THEN
    RAISE EXCEPTION 'Verified event reference conflicts with existing event'
      USING ERRCODE = '22023';
  END IF;
  RETURN false;
END;
$function$;


ALTER FUNCTION public.f16_paypal_record_verified_event(text,text)
 OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_record_verified_event(text,text)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_record_verified_event(text,text)
 TO service_role;
COMMIT;
