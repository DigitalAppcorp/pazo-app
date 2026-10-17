-- PAZO F16-P05 | DISPUTE OWNERSHIP LEDGER READ | DISPOSABLE ONLY.
-- NEVER apply to hosted: no GO for financial DDL or public Data API changes.
-- Scope-only attribution; not payment credit, first cycle, paidThrough or grant.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'PAZO F16 ledger reader: disposable test DB ONLY'
   USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_payment_entries') IS NULL
    OR to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 THEN RAISE EXCEPTION 'F16 requires synthetic ledger and intents'; END IF;
END
$guard$;

-- The minimal F16-P05 disposable fixture predates the hosted ledger columns.
-- Add only pre-existing hosted metadata here, never alter the hosted schema.
ALTER TABLE supporter_private.paypal_payment_entries
 ADD COLUMN owner_id uuid,
 ADD COLUMN plan_id text,
 ADD COLUMN gross_minor_units integer,
 ADD COLUMN currency text,
 ADD COLUMN completed_at timestamptz;

-- One sale ID, no list or full ledger SELECT. Confirm an existing BOUND intent
-- belongs to the SAME owner/subscription/plan before returning minimum fields.
-- The caller MUST derive seller_transaction_id from authenticated PayPal GET.
CREATE FUNCTION public.f16_p05_draft_read_pazo_payment_by_sale(
 p_seller_transaction_id text)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path=''
AS $read_sale$
 SELECT pg_catalog.jsonb_build_object(
  'externalPaymentId',p.external_payment_id,
  'externalSubscriptionId',p.external_subscription_id,
  'ownerId',p.owner_id,
  'planId',p.plan_id,
  'currency',p.currency,
  'grossMinorUnits',p.gross_minor_units,
  'entryState',p.entry_state
 )
 FROM supporter_private.paypal_payment_entries p
 WHERE p_seller_transaction_id ~ '^[A-Za-z0-9._-]{3,128}$'
  AND p.external_payment_id=p_seller_transaction_id
  AND p.external_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
  AND p.owner_id IS NOT NULL
  AND p.plan_id='P-14V25407JP6850922NLHMDKI'
  AND p.currency='USD' AND p.gross_minor_units=299
  AND p.entry_state IN ('uncredited','blocked_reversal')
  AND EXISTS (
   SELECT 1 FROM supporter_private.paypal_subscription_intents i
   WHERE i.external_subscription_id=p.external_subscription_id
    AND i.owner_id=p.owner_id
    AND i.plan_id=p.plan_id
    AND i.provider='paypal'
    AND i.state='bound'
    AND i.bound_at IS NOT NULL
  )
 LIMIT 1
$read_sale$;

-- Second independent check is explicitly owner-scoped: an arbitrary sub ID
-- alone cannot disclose another owner's intent to the service worker.
CREATE FUNCTION public.f16_p05_draft_read_bound_intent_for_sale(
 p_subscription_id text,p_expected_owner_id uuid)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path=''
AS $read_intent$
 SELECT pg_catalog.jsonb_build_object(
  'intentId',i.intent_id,
  'subscriptionId',i.external_subscription_id,
  'ownerId',i.owner_id,
  'planId',i.plan_id,
  'provider',i.provider,
  'state',i.state
 )
 FROM supporter_private.paypal_subscription_intents i
 WHERE p_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
  AND p_expected_owner_id IS NOT NULL
  AND i.external_subscription_id=p_subscription_id
  AND i.owner_id=p_expected_owner_id
  AND i.provider='paypal'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND i.state='bound' AND i.bound_at IS NOT NULL
  AND EXISTS (
   SELECT 1 FROM supporter_private.paypal_payment_entries p
   WHERE p.external_subscription_id=i.external_subscription_id
    AND p.owner_id=i.owner_id
    AND p.plan_id=i.plan_id
    AND p.currency='USD'
    AND p.gross_minor_units=299
    AND p.entry_state IN ('uncredited','blocked_reversal')
  )
 LIMIT 1
$read_intent$;

-- The functions sit in the established public RPC namespace, but are
-- service-role ONLY. In a future design prefer an unexposed private schema
-- and a trusted direct connection. Never pass service_role to the browser.
REVOKE ALL ON FUNCTION
 public.f16_p05_draft_read_pazo_payment_by_sale(text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.f16_p05_draft_read_bound_intent_for_sale(text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.f16_p05_draft_read_pazo_payment_by_sale(text)
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.f16_p05_draft_read_bound_intent_for_sale(text,uuid)
 TO service_role;
COMMIT;
