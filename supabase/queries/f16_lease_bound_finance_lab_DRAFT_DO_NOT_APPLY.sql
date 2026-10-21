-- PAZO F16 — LAB ONLY, NEVER APPLY HOSTED.
-- Requires: existing F16 CLI ledger migrations + F16 lease DRAFT in PG17 disposable.
-- This is NOT a migration or an authorization to process PayPal/user events.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR pg_catalog.to_regprocedure('public.f16_lab_claim_verified_inbox(text,integer)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)') IS NULL
 THEN RAISE EXCEPTION 'F16 finance lease SQL requires complete disposable PG17 baseline'; END IF;
END $guard$;

-- LAB: remove service_role access to old non-lease-aware writes. The future
-- versioned hosted migration MUST revoke these old entrypoints atomically.
REVOKE EXECUTE ON FUNCTION public.f16_paypal_commit_verified_sale(
 text,text,text,uuid,text,integer,text,timestamptz) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.f16_paypal_commit_verified_reversal(
 text,text,text,timestamptz) FROM service_role;

-- Only an independently authenticated private worker may call this after it
-- checked the ORIGINAL transaction/subscription with PayPal Sandbox and PAZO
-- Auth owner, including merchant, event provenance and reversal history.
-- SQL verifies the durable owner binding, not the PayPal HTTP response.
CREATE FUNCTION public.f16_lab_commit_claimed_sale(
 p_event_id text,p_lease_token uuid,
 p_payment_id text,p_subscription_id text,p_owner_id uuid,
 p_plan_id text,p_minor integer,p_currency text,p_completed_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_verified_event_inbox%ROWTYPE;
        decision text;
BEGIN
 IF p_lease_token IS NULL OR p_event_id IS NULL
 THEN RAISE EXCEPTION 'A live private lease is required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id=p_event_id FOR UPDATE;
 IF NOT FOUND OR v.event_type<>'PAYMENT.SALE.COMPLETED'
    OR v.processing_state<>'processing' OR v.retention_hold IS DISTINCT FROM true
    OR v.f16_lease_token IS DISTINCT FROM p_lease_token
    OR v.f16_lease_expires_at IS NULL
    OR v.f16_lease_expires_at<=pg_catalog.clock_timestamp()
    OR v.attempt_count NOT BETWEEN 1 AND 5
    OR v.reconciled_payment_id IS NOT NULL
 THEN RAISE EXCEPTION 'Claim is missing expired or inconsistent'
      USING ERRCODE='22023'; END IF;
 IF p_event_id !~ '^[A-Za-z0-9._-]{1,128}$'
 OR p_payment_id IS NULL OR p_subscription_id IS NULL OR p_owner_id IS NULL
 OR p_plan_id IS DISTINCT FROM 'P-14V25407JP6850922NLHMDKI'
 OR p_minor IS DISTINCT FROM 299 OR p_currency IS DISTINCT FROM 'USD'
 OR p_completed_at IS NULL
 THEN RAISE EXCEPTION 'Unverified sale evidence' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (
    SELECT 1 FROM supporter_private.paypal_subscription_intents i
    WHERE i.external_subscription_id=p_subscription_id
      AND i.owner_id=p_owner_id AND i.plan_id=p_plan_id
      AND i.state='bound' AND i.provider='paypal'
 ) THEN RAISE EXCEPTION 'Verified owner subscription binding missing'
    USING ERRCODE='22023'; END IF;
 -- A single transaction holds the inbox lock through the ledger write and
 -- terminal state update. Errors including unique conflicts rollback both.
 decision:=supporter_private.f16_private_record_payment(
   p_payment_id,p_subscription_id,p_owner_id,p_plan_id,
   p_minor,p_currency,p_completed_at);
 UPDATE supporter_private.paypal_verified_event_inbox SET
   processing_state='processed',processed_at=pg_catalog.clock_timestamp(),
   reconciled_payment_id=p_payment_id,retention_hold=true,
   retention_released_at=NULL,last_error_code=NULL,
   f16_lease_token=NULL,f16_lease_expires_at=NULL
 WHERE provider_event_id=p_event_id;
 -- No coverage, entitlement, 90-day clock release or paid badge.
 RETURN decision;
END $body$;

-- A reversal is financially decisive ONLY after independent PayPal proof of
-- the original sale and refund/reversal identity; the private worker MUST
-- establish that evidence. SQL supports reversal-before-sale tombstones.
CREATE FUNCTION public.f16_lab_commit_claimed_reversal(
 p_event_id text,p_lease_token uuid,
 p_payment_id text,p_kind text,p_verified_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_verified_event_inbox%ROWTYPE;
        decision text;
BEGIN
 IF p_lease_token IS NULL OR p_event_id IS NULL
 THEN RAISE EXCEPTION 'A live private lease is required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id=p_event_id FOR UPDATE;
 IF NOT FOUND OR v.processing_state<>'processing'
 OR v.retention_hold IS DISTINCT FROM true
 OR v.f16_lease_token IS DISTINCT FROM p_lease_token
 OR v.f16_lease_expires_at IS NULL
 OR v.f16_lease_expires_at<=pg_catalog.clock_timestamp()
 OR v.attempt_count NOT BETWEEN 1 AND 5
 OR v.reconciled_payment_id IS NOT NULL
 OR NOT (
   (v.event_type='PAYMENT.SALE.REVERSED' AND p_kind='reversed')
   OR (v.event_type='PAYMENT.SALE.REFUNDED'
        AND p_kind IN ('refunded','partially_refunded'))
 )
 THEN RAISE EXCEPTION 'Reversal claim missing expired or mismatched'
    USING ERRCODE='22023'; END IF;
 IF p_payment_id IS NULL OR p_kind IS NULL OR p_verified_at IS NULL
 THEN RAISE EXCEPTION 'Unverified reversal evidence' USING ERRCODE='22023'; END IF;
 decision:=supporter_private.f16_private_record_reversal(
   p_payment_id,p_kind,p_verified_at);
 UPDATE supporter_private.paypal_verified_event_inbox SET
   processing_state='processed',processed_at=pg_catalog.clock_timestamp(),
   reconciled_payment_id=p_payment_id,retention_hold=true,
   retention_released_at=NULL,last_error_code=NULL,
   f16_lease_token=NULL,f16_lease_expires_at=NULL
 WHERE provider_event_id=p_event_id;
 RETURN decision;
END $body$;

ALTER FUNCTION public.f16_lab_commit_claimed_sale(
 text,uuid,text,text,uuid,text,integer,text,timestamptz) OWNER TO postgres;
ALTER FUNCTION public.f16_lab_commit_claimed_reversal(
 text,uuid,text,text,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_lab_commit_claimed_sale(
 text,uuid,text,text,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_lab_commit_claimed_reversal(
 text,uuid,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_commit_claimed_sale(
 text,uuid,text,text,uuid,text,integer,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_commit_claimed_reversal(
 text,uuid,text,text,timestamptz) TO service_role;
COMMIT;
