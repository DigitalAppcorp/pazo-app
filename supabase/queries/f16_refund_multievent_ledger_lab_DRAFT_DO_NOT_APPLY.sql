-- F16 approved TECHNICAL ARCHITECTURE, PG17 DISPOSABLE LAB ONLY.
-- NOT a migration; NEVER install in hosted Supabase without a distinct PO GO.
-- Every refund is keyed by PayPal refund ID, linked to original sale ID.
-- Does NOT decide entitlement, refund policy, retention, or coverage periods.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR pg_catalog.to_regclass('supporter_private.paypal_payment_entries') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_lab_commit_claimed_sale(text,uuid,text,text,uuid,text,integer,text,timestamptz)') IS NULL
 THEN RAISE EXCEPTION 'F16 refund multievent requires disposable PG17 + lease finance baseline'; END IF;
END $guard$;

-- provider_status is a snapshot of the SALE's cumulative PayPal status
-- on first sight. It may advance without changing immutable refund identity.
CREATE TABLE supporter_private.f16_lab_refund_events (
 refund_id text PRIMARY KEY CHECK(refund_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 provider_event_id text NOT NULL UNIQUE
   CHECK(provider_event_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 original_sale_id text NOT NULL
   CHECK(original_sale_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 subscription_id text NOT NULL
   CHECK(subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 refund_minor integer NOT NULL CHECK(refund_minor BETWEEN 1 AND 299),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 provider_status text NOT NULL
   CHECK(provider_status IN ('PARTIALLY_REFUNDED','REFUNDED')),
 verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CHECK(verified_at<=recorded_at+interval '5 minutes')
);
CREATE INDEX f16_lab_refund_by_sale_idx
 ON supporter_private.f16_lab_refund_events(original_sale_id);
CREATE TABLE supporter_private.f16_lab_refund_sale_holds (
 original_sale_id text PRIMARY KEY
  CHECK(original_sale_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 subscription_id text NOT NULL
  CHECK(subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 refunded_minor integer NOT NULL CHECK(refunded_minor BETWEEN 1 AND 299),
 refund_count integer NOT NULL CHECK(refund_count>0),
 refund_state text NOT NULL CHECK(refund_state IN ('partial','full')),
 updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CHECK ((refund_state='full' AND refunded_minor=299)
     OR (refund_state='partial' AND refunded_minor<299))
);
ALTER TABLE supporter_private.f16_lab_refund_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_lab_refund_events FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_lab_refund_sale_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_lab_refund_sale_holds FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.f16_lab_refund_events
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE supporter_private.f16_lab_refund_sale_holds
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.f16_lab_commit_claimed_refund(
 p_event_id text,p_lease_token uuid,p_sale_id text,
 p_subscription_id text,p_refund_id text,p_refund_minor integer,
 p_provider_status text,p_verified_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_verified_event_inbox%ROWTYPE;
        existing supporter_private.f16_lab_refund_events%ROWTYPE;
        prior integer; total integer; held_sub text; answer text;
BEGIN
 IF p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
    OR p_lease_token IS NULL OR p_sale_id IS NULL
    OR p_sale_id !~ '^[A-Za-z0-9._-]{3,128}$'
    OR p_subscription_id IS NULL
    OR p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
    OR p_refund_id IS NULL OR p_refund_id !~ '^[A-Za-z0-9._-]{3,128}$'
    OR p_refund_minor IS NULL OR p_refund_minor NOT BETWEEN 1 AND 299
    OR p_provider_status IS NULL
    OR p_provider_status NOT IN ('PARTIALLY_REFUNDED','REFUNDED')
    OR p_verified_at IS NULL OR p_verified_at>pg_catalog.clock_timestamp()+interval '5 minutes'
 THEN RAISE EXCEPTION 'Refund source attributes invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id=p_event_id FOR UPDATE;
 IF NOT FOUND OR v.event_type<>'PAYMENT.SALE.REFUNDED'
    OR v.processing_state<>'processing' OR v.retention_hold IS DISTINCT FROM true
    OR v.f16_lease_token IS DISTINCT FROM p_lease_token
    OR v.f16_lease_expires_at IS NULL OR v.f16_lease_expires_at<=pg_catalog.clock_timestamp()
    OR v.attempt_count NOT BETWEEN 1 AND 5 OR v.reconciled_payment_id IS NOT NULL
 THEN RAISE EXCEPTION 'No live lease for verified refund' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM supporter_private.paypal_subscription_intents i
  WHERE i.external_subscription_id=p_subscription_id
    AND i.state='bound' AND i.provider='paypal'
    AND i.plan_id='P-14V25407JP6850922NLHMDKI'
 ) THEN RAISE EXCEPTION 'Missing bound private owner for refund' USING ERRCODE='22023'; END IF;

 -- Same key and advisory lock as existing payment helper. This serializes
 -- sale/refund arrival even when refund comes BEFORE payment entry exists.
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_sale_id,20261013));
 IF EXISTS(
  SELECT 1 FROM supporter_private.paypal_payment_entries e
  WHERE e.external_payment_id=p_sale_id AND e.external_subscription_id<>p_subscription_id
 ) THEN RAISE EXCEPTION 'Refund sale owner mismatch' USING ERRCODE='22023'; END IF;
 SELECT * INTO existing FROM supporter_private.f16_lab_refund_events
 WHERE refund_id=p_refund_id;
 IF FOUND THEN
  IF existing.original_sale_id IS DISTINCT FROM p_sale_id
     OR existing.subscription_id IS DISTINCT FROM p_subscription_id
     OR existing.refund_minor IS DISTINCT FROM p_refund_minor
     OR existing.verified_at IS DISTINCT FROM p_verified_at
  THEN RAISE EXCEPTION 'Conflicting refund ID evidence' USING ERRCODE='22023'; END IF;
  answer:='refund_duplicate';
 ELSE
  SELECT refunded_minor,subscription_id INTO prior,held_sub
  FROM supporter_private.f16_lab_refund_sale_holds
  WHERE original_sale_id=p_sale_id FOR UPDATE;
  IF held_sub IS NOT NULL AND held_sub IS DISTINCT FROM p_subscription_id
  THEN RAISE EXCEPTION 'Refund subscription conflicts with original sale hold'
    USING ERRCODE='22023'; END IF;
  prior:=COALESCE(prior,0);
  total:=prior+p_refund_minor;
  -- PayPal transaction status is CUMULATIVE at query time, whereas
  -- p_refund_minor is the distinct original refund's immutable amount.
  -- A later full refund may already have changed the transaction to
  -- REFUNDED while this *earlier* refund is being reconciled out of order.
  -- Never infer that this refund covers all 299 cents from REFUNDED alone.
  -- The only source of local full/partial state is SUM(DISTINCT refund_id).
  -- Underreported provider status PARTIALLY_REFUNDED when 299 is already
  -- locally reconciled remains inconsistent and cannot be acknowledged.
  IF total>299 OR (p_provider_status='PARTIALLY_REFUNDED' AND total>=299)
  THEN RAISE EXCEPTION 'Refund total and merchant status disagree' USING ERRCODE='22023'; END IF;
  INSERT INTO supporter_private.f16_lab_refund_events
  (refund_id,provider_event_id,original_sale_id,subscription_id,
   refund_minor,currency,provider_status,verified_at)
  VALUES(p_refund_id,p_event_id,p_sale_id,p_subscription_id,
   p_refund_minor,'USD',p_provider_status,p_verified_at);
  INSERT INTO supporter_private.f16_lab_refund_sale_holds
   (original_sale_id,subscription_id,refunded_minor,refund_count,refund_state)
  VALUES(p_sale_id,p_subscription_id,total,1,
    CASE WHEN total=299 THEN 'full' ELSE 'partial' END)
  ON CONFLICT(original_sale_id) DO UPDATE
   SET refunded_minor=EXCLUDED.refunded_minor,
       refund_count=supporter_private.f16_lab_refund_sale_holds.refund_count+1,
       refund_state=EXCLUDED.refund_state,
       updated_at=pg_catalog.clock_timestamp();
  answer:=CASE WHEN total=299 THEN 'refund_recorded_full'
               ELSE 'refund_recorded_partial' END;
 END IF;
 -- Existing ledger remains conservatively blocked. No "paid through" fields.
 UPDATE supporter_private.paypal_payment_entries
 SET entry_state='blocked_reversal'
 WHERE external_payment_id=p_sale_id AND entry_state<>'blocked_reversal';
 UPDATE supporter_private.paypal_verified_event_inbox
 SET processing_state='processed',processed_at=pg_catalog.clock_timestamp(),
     reconciled_payment_id=p_sale_id,retention_hold=true,
     retention_released_at=NULL,last_error_code=NULL,
     f16_lease_token=NULL,f16_lease_expires_at=NULL
 WHERE provider_event_id=p_event_id;
 RETURN answer;
END $body$;

-- Future replacement for old service-role lab sale writer.
-- Sale and earlier refund both use the same advisory lock. The internal
-- lease-bound original validates the current BOUND intent and paid amount.
CREATE FUNCTION public.f16_lab_commit_claimed_sale_v2(
 p_event_id text,p_lease_token uuid,
 p_payment_id text,p_subscription_id text,p_owner_id uuid,
 p_plan_id text,p_minor integer,p_currency text,p_completed_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE answer text;
BEGIN
 IF p_payment_id IS NULL OR p_payment_id !~ '^[A-Za-z0-9._-]{3,128}$'
 THEN RAISE EXCEPTION 'Invalid original sale ID' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_payment_id,20261013));
 answer:=public.f16_lab_commit_claimed_sale(
  p_event_id,p_lease_token,p_payment_id,p_subscription_id,p_owner_id,
  p_plan_id,p_minor,p_currency,p_completed_at);
 IF EXISTS(SELECT 1 FROM supporter_private.f16_lab_refund_sale_holds h
  WHERE h.original_sale_id=p_payment_id
    AND h.subscription_id IS DISTINCT FROM p_subscription_id)
 THEN RAISE EXCEPTION 'Prior refund belongs to a different subscription'
   USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_lab_refund_sale_holds h
  WHERE h.original_sale_id=p_payment_id)
 THEN
  UPDATE supporter_private.paypal_payment_entries SET entry_state='blocked_reversal'
  WHERE external_payment_id=p_payment_id;
  IF answer='inserted_uncredited' THEN answer:='inserted_blocked'; END IF;
  IF answer='duplicate_uncredited' THEN answer:='duplicate_blocked'; END IF;
 END IF;
 RETURN answer;
END $body$;

ALTER FUNCTION public.f16_lab_commit_claimed_refund(
 text,uuid,text,text,text,integer,text,timestamptz) OWNER TO postgres;
ALTER FUNCTION public.f16_lab_commit_claimed_sale_v2(
 text,uuid,text,text,uuid,text,integer,text,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_lab_commit_claimed_refund(
 text,uuid,text,text,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_lab_commit_claimed_sale_v2(
 text,uuid,text,text,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_commit_claimed_refund(
 text,uuid,text,text,text,integer,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_commit_claimed_sale_v2(
 text,uuid,text,text,uuid,text,integer,text,timestamptz) TO service_role;
-- Remove older lab paths in THIS SAME TRANSACTION; no lease bypass or
-- single-row legacy refund writer exposed to server after cutover.
REVOKE ALL ON FUNCTION public.f16_lab_commit_claimed_sale(
 text,uuid,text,text,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_lab_commit_claimed_reversal(
 text,uuid,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
