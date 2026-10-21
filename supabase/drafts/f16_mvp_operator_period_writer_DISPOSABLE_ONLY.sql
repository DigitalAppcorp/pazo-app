-- F16 minimal private paid-period ingestion -- synthetic PG17 ONLY.
-- Requires f16_mvp_verified_paid_period_source_DISPOSABLE_ONLY.sql.
-- NOT a production migration, NOT callable by web/service_role and NOT a
-- substitute for independent verified webhook/Sale/Subscription evidence.
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'f14_synthetic' OR current_user <> 'postgres'
 OR to_regclass('supporter_private.f16_mvp_paid_period_proofs') IS NULL
 THEN RAISE EXCEPTION 'F16 PERIOD WRITER DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;

-- Only a separate PRIVILEGED verifier process may ever invoke this operator
-- function after all external merchant, ownership, consent and reversals checks.
-- PostgreSQL cannot independently attest PayPal: no public RPC exposes it.
CREATE FUNCTION supporter_private.f16_mvp_record_verified_paid_period(
 p_sale text, p_subscription text, p_owner uuid, p_cycle text,
 p_event text, p_terms text, p_start timestamptz, p_end timestamptz,
 p_verified_at timestamptz
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE v supporter_private.f16_mvp_paid_period_proofs%ROWTYPE;
BEGIN
 IF current_user <> 'postgres' THEN
   RAISE EXCEPTION 'DBA only' USING ERRCODE='42501'; END IF;
 IF p_sale IS NULL OR p_sale !~ '^[A-Za-z0-9._-]{6,128}$'
 OR p_subscription IS NULL OR p_subscription !~ '^I-[A-Za-z0-9_-]{3,70}$'
 OR p_owner IS NULL
 OR p_cycle IS NULL OR p_cycle !~ '^[A-Za-z0-9_-]{6,100}$'
 OR p_event IS NULL OR p_event !~ '^[A-Za-z0-9._-]{6,128}$'
 OR p_terms IS NULL OR p_terms !~ '^[a-f0-9]{64}$'
 OR p_start IS NULL OR p_end IS NULL
 OR NOT (p_end > p_start AND p_end <= p_start + interval '32 days')
 OR p_verified_at IS NULL OR p_verified_at > pg_catalog.clock_timestamp()
 THEN RAISE EXCEPTION 'Verified inputs incomplete' USING ERRCODE='22023'; END IF;
 -- The owner row is a lock to serialize all private writes for one owner.
 PERFORM 1 FROM auth.users u WHERE u.id=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Owner binding unavailable' USING ERRCODE='42501'; END IF;

 SELECT * INTO v FROM supporter_private.f16_mvp_paid_period_proofs
 WHERE provider_sale_id=p_sale;
 IF FOUND THEN
  IF v.provider_subscription_id IS DISTINCT FROM p_subscription
   OR v.owner_id IS DISTINCT FROM p_owner
   OR v.cycle_key IS DISTINCT FROM p_cycle
   OR v.provider_event_id IS DISTINCT FROM p_event
   OR v.offer_terms_sha256 IS DISTINCT FROM p_terms
   OR v.service_start IS DISTINCT FROM p_start
   OR v.service_end IS DISTINCT FROM p_end
   OR v.merchant_verified_at IS DISTINCT FROM p_verified_at
   OR v.price_minor <> 299 OR v.currency <> 'USD'
   OR v.merchant_environment <> 'live'
  THEN RAISE EXCEPTION 'Conflicting merchant sale replay' USING ERRCODE='23505'; END IF;
  RETURN 'F16_MVP_PAID_PERIOD_IDEMPOTENT_REPLAY';
 END IF;

 IF EXISTS (
  SELECT 1 FROM supporter_private.f16_mvp_paid_period_proofs x
  WHERE x.owner_id=p_owner
   AND (x.cycle_key=p_cycle OR
    (x.service_start < p_end AND x.service_end > p_start))
 ) THEN RAISE EXCEPTION 'Duplicate or overlapping monthly coverage' USING ERRCODE='23505'; END IF;

 INSERT INTO supporter_private.f16_mvp_paid_period_proofs
  (provider_sale_id,provider_subscription_id,owner_id,cycle_key,
   provider_event_id,offer_terms_sha256,service_start,service_end,
   merchant_verified_at)
 VALUES (p_sale,p_subscription,p_owner,p_cycle,p_event,p_terms,
  p_start,p_end,p_verified_at);
 RETURN 'F16_MVP_PAID_PERIOD_RECORDED_PRIVATE_ONLY';
END;
$fn$;
ALTER FUNCTION supporter_private.f16_mvp_record_verified_paid_period(
 text,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz)
OWNER TO postgres;
REVOKE ALL ON FUNCTION supporter_private.f16_mvp_record_verified_paid_period(
 text,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz)
FROM PUBLIC,anon,authenticated,service_role;

-- Reversal/dispute holds are additive and cannot be cleared by this function.
-- Once a charge is under an unresolved hold, public benefits fail closed.
CREATE FUNCTION supporter_private.f16_mvp_record_merchant_hold(
 p_sale text, p_hold text, p_kind text, p_verified_at timestamptz
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE v supporter_private.f16_mvp_paid_period_holds%ROWTYPE;
BEGIN
 IF current_user <> 'postgres' THEN
   RAISE EXCEPTION 'DBA only' USING ERRCODE='42501'; END IF;
 IF p_sale IS NULL OR p_hold IS NULL
 OR p_hold !~ '^[A-Za-z0-9._-]{6,128}$'
 OR p_kind IS NULL
 OR p_kind NOT IN ('partially_refunded','refunded','reversed','dispute')
 OR p_verified_at IS NULL OR p_verified_at > pg_catalog.clock_timestamp()
 THEN RAISE EXCEPTION 'Merchant reversal inputs invalid' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM supporter_private.f16_mvp_paid_period_proofs
 WHERE provider_sale_id=p_sale FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sale has no recorded proof' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM supporter_private.f16_mvp_paid_period_holds
 WHERE provider_sale_id=p_sale AND hold_id=p_hold;
 IF FOUND THEN
  IF v.hold_kind IS DISTINCT FROM p_kind OR v.verified_at IS DISTINCT FROM p_verified_at
     OR v.hold_active IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Conflicting reversal replay' USING ERRCODE='23505'; END IF;
  RETURN 'F16_MVP_HOLD_IDEMPOTENT_REPLAY';
 END IF;
 INSERT INTO supporter_private.f16_mvp_paid_period_holds(
  provider_sale_id,hold_id,hold_kind,verified_at)
 VALUES(p_sale,p_hold,p_kind,p_verified_at);
 RETURN 'F16_MVP_MERCHANT_HOLD_RECORDED_PRIVATE_ONLY';
END;
$fn$;
ALTER FUNCTION supporter_private.f16_mvp_record_merchant_hold(
 text,text,text,timestamptz) OWNER TO postgres;
REVOKE ALL ON FUNCTION supporter_private.f16_mvp_record_merchant_hold(
 text,text,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
