-- PAZO F16-P10 — recovered pending subscription binding, disposable ONLY.
-- Strictly draft; DB CANNOT verify PayPal responses or operator approvals.
-- Must NEVER be applied to hosted Supabase without separate explicit PO GO.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P10 recovery bind: disposable only' USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NULL
 OR to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 THEN RAISE EXCEPTION 'P10 missing private schema'; END IF;
END
$guard$;

CREATE FUNCTION public.f16_p10_bind_recovered_checkout(
 p_owner_id uuid,p_request_key uuid,p_intent_id text,p_subscription_id text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $bind$
DECLARE
 a supporter_private.paypal_p06_checkout_attempts%ROWTYPE;
 i supporter_private.paypal_subscription_intents%ROWTYPE;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL OR
    p_intent_id IS NULL OR
    p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR p_subscription_id IS NULL OR
    p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RAISE EXCEPTION 'Invalid private recovered binding' USING ERRCODE='22023';
 END IF;

 -- Serialize every prospective checkout and recovery per owner.
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text,0));
 SELECT * INTO a
 FROM supporter_private.paypal_p06_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND OR a.intent_id IS DISTINCT FROM p_intent_id
 OR a.provider_create_claimed_at IS NULL OR
 a.provider_create_claimed_at > pg_catalog.clock_timestamp() + interval '1 minute'
 THEN RAISE EXCEPTION 'Recovery claim absent or inconsistent'
  USING ERRCODE='22023'; END IF;

 SELECT * INTO i FROM supporter_private.paypal_subscription_intents
 WHERE intent_id=p_intent_id AND owner_id=p_owner_id FOR UPDATE;
 IF NOT FOUND OR i.provider<>'paypal' OR
    i.plan_id<>'P-14V25407JP6850922NLHMDKI'
 THEN RAISE EXCEPTION 'Recovery owner/plan mismatch' USING ERRCODE='22023'; END IF;
 IF i.state='bound' THEN
  IF i.external_subscription_id IS DISTINCT FROM p_subscription_id
  THEN RAISE EXCEPTION 'Recovery already bound to another subscription'
    USING ERRCODE='22023'; END IF;
  RETURN 'already_bound';
 END IF;
 IF i.state<>'pending' OR i.external_subscription_id IS NOT NULL
 THEN RAISE EXCEPTION 'Recovery intent not pending' USING ERRCODE='22023'; END IF;
 -- Uniqueness on external_subscription_id in both disposable fixture and
 -- hosted schema prevents cross-intent duplicate assignment, including races.
 BEGIN
  UPDATE supporter_private.paypal_subscription_intents
  SET state='bound', external_subscription_id=p_subscription_id,
      bound_at=pg_catalog.clock_timestamp()
  WHERE intent_id=p_intent_id AND owner_id=p_owner_id AND state='pending';
 EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Recovery subscription already claimed' USING ERRCODE='22023';
 END;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Concurrent recovery state conflict' USING ERRCODE='22023';
 END IF;
 -- Binding is identity correlation ONLY, not sale, entitlement or paid period.
 RETURN 'new_binding';
END
$bind$;
REVOKE ALL ON FUNCTION public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)
 TO service_role;
COMMIT;
