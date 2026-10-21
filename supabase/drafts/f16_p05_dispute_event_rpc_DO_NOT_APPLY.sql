-- F16-P05 DISPUTE ALLOWLIST FOR EXISTING INBOX: DRAFT / DISPOSABLE ONLY.
-- DO NOT APPLY TO HOSTED. No new capture/deploy/PayPal subscription authorized.
-- ONLY safe if server confirms event's PAZO ownership before RPC invocation.
\set ON_ERROR_STOP on
BEGIN;
DO $f16_gate$
BEGIN
 IF current_database()<>'f14_synthetic' OR
    session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'PAZO F16 DISPUTE DRAFT DISPOSABLE ONLY'
 USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'F16 signed-event inbox must already exist'; END IF;
END
$f16_gate$;

-- Mirrors the EXISTING hosted service_role-only function with ONLY 3 event
-- types added. No payload storage, full dispute snapshots, PII or ledger writes.
-- Function itself DOES NOT prove PAZO ownership: it trusts the gated Edge
-- receiver, whose PAZO-only scope adapter is NOT yet deployed.
CREATE OR REPLACE FUNCTION public.f16_paypal_record_verified_event(
 p_provider_event_id text,p_event_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $f16_event$
DECLARE
 v_inserted boolean;
 v_existing_type text;
BEGIN
 IF p_provider_event_id IS NULL
  OR p_provider_event_id !~ '^[A-Za-z0-9._-]{1,128}$'
  OR p_event_type IS NULL
  OR p_event_type NOT IN (
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
   'PAYMENT.SALE.REVERSED',
   'CUSTOMER.DISPUTE.CREATED',
   'CUSTOMER.DISPUTE.UPDATED',
   'CUSTOMER.DISPUTE.RESOLVED'
  )
 THEN
  RAISE EXCEPTION 'Unsupported verified event reference'
   USING ERRCODE='22023';
 END IF;
 INSERT INTO supporter_private.paypal_verified_event_inbox AS inbox
  (provider_event_id,event_type)
 VALUES (p_provider_event_id,p_event_type)
 ON CONFLICT (provider_event_id) DO NOTHING
 RETURNING true INTO v_inserted;

 IF v_inserted IS TRUE THEN RETURN true; END IF;
 SELECT inbox.event_type INTO v_existing_type
 FROM supporter_private.paypal_verified_event_inbox AS inbox
 WHERE inbox.provider_event_id=p_provider_event_id;
 IF v_existing_type IS DISTINCT FROM p_event_type THEN
  RAISE EXCEPTION 'Verified event reference conflicts with existing event'
   USING ERRCODE='22023';
 END IF;
 RETURN false;
END
$f16_event$;

REVOKE ALL ON FUNCTION public.f16_paypal_record_verified_event(text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_paypal_record_verified_event(text,text)
 TO service_role;
COMMIT;
