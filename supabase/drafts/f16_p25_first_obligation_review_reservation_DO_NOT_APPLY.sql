-- PAZO F16-P25 — OFFLINE REVIEW RESERVATION, NOT A PAYMENT LEDGER.
-- DO NOT APPLY HOSTED. Requires separate PO approval, audit and versioned migration.
-- This lab can't certify PayPal provenance, cycle attribution or rights.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin' OR current_user<>'postgres'
 OR to_regprocedure('public.f16_p24_read_claimed_original_consent(text,uuid,text,text)') IS NULL
 OR to_regprocedure('public.f16_p05_draft_finish_claimed_event(text,uuid,text,text)') IS NULL
 THEN RAISE EXCEPTION 'P25 disposable PG17 P21/P24 prerequisites only'
 USING ERRCODE='42501';
 END IF;
END
$guard$;

CREATE TABLE supporter_private.p25_first_obligation_reviews (
 intent_id text NOT NULL,
 obligation_ordinal smallint NOT NULL DEFAULT 0 CHECK (obligation_ordinal=0),
 subscription_id text NOT NULL CHECK (subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 external_sale_id text NOT NULL UNIQUE CHECK (external_sale_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 provider_event_id text NOT NULL UNIQUE CHECK (provider_event_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 owner_id uuid NOT NULL,
 review_state text NOT NULL DEFAULT 'review_required' CHECK (review_state='review_required'),
 review_reason text NOT NULL DEFAULT 'cycle_unproven' CHECK (review_reason='cycle_unproven'),
 retention_hold boolean NOT NULL DEFAULT true CHECK (retention_hold=true),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY (intent_id,obligation_ordinal),
 FOREIGN KEY (intent_id) REFERENCES supporter_private.paypal_subscription_intents(intent_id)
);
-- Read, update and delete are intentionally unavailable to app or service APIs.
ALTER TABLE supporter_private.p25_first_obligation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p25_first_obligation_reviews FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.p25_first_obligation_reviews
 FROM PUBLIC,anon,authenticated,service_role;

-- Only reserves a candidate for manual reconciliation. No credits, periods,
-- monetary writes, paidThrough, approved entitlement, or event ACK.
-- The merchant sale ID is server-supplied and NOT independently attested here.
CREATE FUNCTION public.f16_p25_draft_reserve_first_obligation_review(
 p_event_id text,p_claim_token uuid,p_subscription_id text,
 p_intent_id text,p_sale_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $reserve$
DECLARE proof jsonb;
        old_row supporter_private.p25_first_obligation_reviews%ROWTYPE;
        inserted bool;
BEGIN
 IF p_claim_token IS NULL OR
 p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$' OR
 p_subscription_id IS NULL OR
 p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$' OR
 p_intent_id IS NULL OR
 p_intent_id !~ '^intent-[A-Za-z0-9_-]{12,90}$' OR
 p_sale_id IS NULL OR p_sale_id !~ '^[A-Za-z0-9._-]{3,128}$'
 THEN RAISE EXCEPTION 'P25 invalid reserved reference' USING ERRCODE='22023';
 END IF;
 -- P24 requires an active P21 lease, signed SALE event, exact owner P06
 -- acceptance, immutable published offer, active cutoff and chronological proof.
 proof:=public.f16_p24_read_claimed_original_consent(
  p_event_id,p_claim_token,p_subscription_id,p_intent_id);
 IF proof IS NULL
 THEN RAISE EXCEPTION 'P25 verified private consent lease absent'
 USING ERRCODE='22023'; END IF;
 -- Transaction locks serialize duplicates for this exact intent. UNIQUE sale
 -- also prevents cross-account assignment when intents differ.
 PERFORM 1 FROM supporter_private.paypal_subscription_intents i
  WHERE i.intent_id=p_intent_id AND i.owner_id=(proof->>'ownerId')::uuid
    AND i.external_subscription_id=p_subscription_id
    AND i.state='bound'
  FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'P25 private owner link changed' USING ERRCODE='22023';
 END IF;
 INSERT INTO supporter_private.p25_first_obligation_reviews
 (intent_id,obligation_ordinal,subscription_id,external_sale_id,
  provider_event_id,owner_id)
 VALUES(p_intent_id,0,p_subscription_id,p_sale_id,p_event_id,
   (proof->>'ownerId')::uuid)
 ON CONFLICT (intent_id,obligation_ordinal) DO NOTHING
 RETURNING true INTO inserted;
 IF inserted IS TRUE THEN
  RETURN pg_catalog.jsonb_build_object(
   'phase','FIRST_OBLIGATION_RESERVED_FOR_REVIEW',
   'reason','cycle_and_reversal_unproven',
   'mayRecordPayment',false,'mayCreatePaidPeriod',false,
   'mayGrantBenefits',false,'paidThrough',NULL);
 END IF;
 SELECT * INTO old_row FROM supporter_private.p25_first_obligation_reviews
 WHERE intent_id=p_intent_id AND obligation_ordinal=0 FOR UPDATE;
 IF NOT FOUND OR
 old_row.subscription_id IS DISTINCT FROM p_subscription_id OR
 old_row.external_sale_id IS DISTINCT FROM p_sale_id OR
 old_row.provider_event_id IS DISTINCT FROM p_event_id OR
 old_row.owner_id IS DISTINCT FROM (proof->>'ownerId')::uuid OR
 old_row.review_state<>'review_required' OR
 old_row.retention_hold IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'P25 conflicting first obligation or sale'
 USING ERRCODE='22023'; END IF;
 RETURN pg_catalog.jsonb_build_object(
  'phase','FIRST_OBLIGATION_ALREADY_RESERVED',
  'reason','cycle_and_reversal_unproven',
  'mayRecordPayment',false,'mayCreatePaidPeriod',false,
  'mayGrantBenefits',false,'paidThrough',NULL);
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'P25 sale already reserved to another intent'
 USING ERRCODE='22023';
END
$reserve$;
REVOKE ALL ON FUNCTION public.f16_p25_draft_reserve_first_obligation_review(
 text,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p25_draft_reserve_first_obligation_review(
 text,uuid,text,text,text)
 TO service_role;
COMMIT;
