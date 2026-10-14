-- PAZO F16: PREPARED, NOT APPLIED. Supabase CLI 2.120.0 generated
-- filename 20261014040722_f16_private_intents_financial_ledger.sql
-- Proof: GitHub Actions run 38509751679, migration new. PR #44 DRAFT.
-- No PayPal changes, no paid access, no public data, no scheduled retention.
-- Retention of financial records/intents and deletion-account behavior
-- REQUIRE product/legal gate before hosted deployment.
-- This SQL is for isolated migration QA only until explicit PO authorization.
BEGIN;

CREATE TABLE supporter_private.paypal_subscription_intents (
 intent_id text PRIMARY KEY CHECK (intent_id ~ '^intent-[A-Za-z0-9_-]{12,90}$'),
 owner_id uuid NOT NULL,
 provider text NOT NULL DEFAULT 'paypal' CHECK (provider='paypal'),
 plan_id text NOT NULL CHECK (plan_id='P-14V25407JP6850922NLHMDKI'),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','bound')),
 external_subscription_id text UNIQUE
   CHECK (external_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 bound_at timestamptz,
 CONSTRAINT f16_intent_binding_atomic CHECK (
   (state='pending' AND external_subscription_id IS NULL AND bound_at IS NULL)
   OR (state='bound' AND external_subscription_id IS NOT NULL AND bound_at IS NOT NULL)
 )
);
ALTER TABLE supporter_private.paypal_subscription_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_subscription_intents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_subscription_intents
  FROM PUBLIC,anon,authenticated,service_role;

-- Invoker-only LAB function, unavailable to browser, service_role or Data API.
-- Call ONLY after an authenticated PAZO session created the private intent AND
-- a SERVER-SIDE PayPal Sandbox GET confirmed subscription id, plan, custom_id.
CREATE FUNCTION supporter_private.f16_private_bind_subscription(
 p_intent text,p_server_verified_owner uuid,p_paypal_subscription text,
 p_paypal_plan text,p_paypal_custom_id text
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $body$
DECLARE v_intent supporter_private.paypal_subscription_intents%ROWTYPE;
BEGIN
 IF p_intent IS NULL OR p_server_verified_owner IS NULL OR
    p_paypal_custom_id IS DISTINCT FROM p_intent OR
    p_paypal_plan IS DISTINCT FROM 'P-14V25407JP6850922NLHMDKI' OR
    p_paypal_subscription IS NULL OR
    p_paypal_subscription !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RAISE EXCEPTION 'Unverified subscription correlation'
     USING ERRCODE='22023'; END IF;

 -- The intent row lock serializes claims for the same intent.
 SELECT * INTO v_intent FROM supporter_private.paypal_subscription_intents
 WHERE intent_id=p_intent FOR UPDATE;
 IF NOT FOUND OR v_intent.owner_id IS DISTINCT FROM p_server_verified_owner OR
    v_intent.plan_id IS DISTINCT FROM p_paypal_plan OR v_intent.provider <> 'paypal'
 THEN RAISE EXCEPTION 'Intent is not bound to this authenticated owner'
     USING ERRCODE='22023'; END IF;
 IF v_intent.state='bound' THEN
   IF v_intent.external_subscription_id IS DISTINCT FROM p_paypal_subscription
   THEN RAISE EXCEPTION 'Intent already bound to another subscription'
       USING ERRCODE='22023'; END IF;
   RETURN 'already_bound';
 END IF;

 -- UNIQUE(external_subscription_id) prevents different intents/users from
 -- claiming the same PayPal subscription, including parallel attempts.
 BEGIN
  UPDATE supporter_private.paypal_subscription_intents
    SET state='bound',external_subscription_id=p_paypal_subscription,
        bound_at=clock_timestamp()
  WHERE intent_id=p_intent;
 EXCEPTION WHEN unique_violation THEN
   RAISE EXCEPTION 'Subscription already claimed' USING ERRCODE='22023';
 END;
 RETURN 'new_binding';
END;
$body$;
REVOKE ALL ON FUNCTION supporter_private.f16_private_bind_subscription(text,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;

-- Prototype ONLY: backend service_role RPC gateway for server-verified owner.
-- These functions are in PUBLIC because PostgREST exposes RPC from public,
-- but EXECUTE is REVOKED from PUBLIC, anon and authenticated atomically.
CREATE FUNCTION public.f16_paypal_create_private_intent(
 p_owner_id uuid,p_intent_id text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE inserted boolean;
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL OR
    p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 THEN RAISE EXCEPTION 'Invalid server intent reference' USING ERRCODE='22023'; END IF;
 INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,plan_id)
 VALUES (p_intent_id,p_owner_id,'P-14V25407JP6850922NLHMDKI')
 ON CONFLICT (intent_id) DO NOTHING RETURNING true INTO inserted;
 RETURN inserted IS TRUE;
END;
$body$;
ALTER FUNCTION public.f16_paypal_create_private_intent(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_create_private_intent(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_create_private_intent(uuid,text) TO service_role;

CREATE FUNCTION public.f16_paypal_read_private_intent(
 p_intent_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_subscription_intents%ROWTYPE;
BEGIN
 IF p_intent_id IS NULL OR
    p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 THEN RAISE EXCEPTION 'Invalid intent reference' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM supporter_private.paypal_subscription_intents
 WHERE intent_id=p_intent_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object(
 'id',v.intent_id,'owner_id',v.owner_id,'plan_id',v.plan_id,
 'state',v.state,'external_subscription_id',v.external_subscription_id);
END;
$body$;
ALTER FUNCTION public.f16_paypal_read_private_intent(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_read_private_intent(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_read_private_intent(text) TO service_role;

CREATE FUNCTION public.f16_paypal_bind_private_intent(
 p_intent_id text,p_owner_id uuid,p_subscription_id text,p_plan_id text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
BEGIN
 IF p_intent_id IS NULL OR
    p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 THEN RAISE EXCEPTION 'Invalid intent reference' USING ERRCODE='22023'; END IF;
 RETURN supporter_private.f16_private_bind_subscription(
 p_intent_id,p_owner_id,p_subscription_id,p_plan_id,p_intent_id);
END;
$body$;
ALTER FUNCTION public.f16_paypal_bind_private_intent(text,uuid,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_bind_private_intent(text,uuid,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_bind_private_intent(text,uuid,text,text) TO service_role;

CREATE TABLE supporter_private.paypal_payment_entries (
 external_payment_id text PRIMARY KEY
   CHECK (external_payment_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 external_subscription_id text NOT NULL
   CHECK (external_subscription_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 owner_id uuid NOT NULL,
 plan_id text NOT NULL
   CHECK (plan_id = 'P-14V25407JP6850922NLHMDKI'),
 gross_minor_units integer NOT NULL CHECK (gross_minor_units = 299),
 currency text NOT NULL CHECK (currency = 'USD'),
 completed_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 entry_state text NOT NULL DEFAULT 'uncredited'
   CHECK (entry_state IN ('uncredited','blocked_reversal')),
 -- This design intentionally has NO coverage period or entitlement fields.
 CHECK (completed_at <= recorded_at + interval '5 minutes')
);

CREATE TABLE supporter_private.paypal_payment_reversals (
 external_payment_id text PRIMARY KEY
   CHECK (external_payment_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 reversal_kind text NOT NULL
   CHECK (reversal_kind IN ('refunded','reversed','partially_refunded')),
 provider_verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (provider_verified_at <= recorded_at + interval '5 minutes')
);

ALTER TABLE supporter_private.paypal_payment_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_payment_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_payment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_payment_reversals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.paypal_payment_entries FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE supporter_private.paypal_payment_reversals FROM PUBLIC,anon,authenticated,service_role;

-- Private, invoker-only lab functions. No Data API grants.
-- The future worker must independently establish PayPal authenticity and owner
-- binding BEFORE calling any ledger write function. No user-supplied values.
CREATE FUNCTION supporter_private.f16_private_record_payment(
 p_payment text,p_subscription text,p_owner uuid,p_plan text,
 p_minor integer,p_currency text,p_completed timestamptz
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $body$
DECLARE v_existing supporter_private.paypal_payment_entries%ROWTYPE;
        v_blocked boolean;
        v_new boolean;
BEGIN
 IF p_payment IS NULL OR p_payment !~ '^[A-Za-z0-9._-]{3,128}$'
    OR p_subscription IS NULL OR p_subscription !~ '^[A-Za-z0-9._-]{3,128}$'
    OR p_owner IS NULL OR p_plan IS DISTINCT FROM 'P-14V25407JP6850922NLHMDKI'
    OR p_minor IS DISTINCT FROM 299 OR p_currency IS DISTINCT FROM 'USD'
    OR p_completed IS NULL OR p_completed > clock_timestamp() + interval '5 minutes'
 THEN RAISE EXCEPTION 'Unverified payment attributes' USING ERRCODE='22023'; END IF;
 -- Serialize payment and reversal writes, including reversal-before-payment.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payment,20261013));
 SELECT EXISTS (SELECT 1 FROM supporter_private.paypal_payment_reversals
               WHERE external_payment_id=p_payment) INTO v_blocked;
 INSERT INTO supporter_private.paypal_payment_entries
  (external_payment_id,external_subscription_id,owner_id,plan_id,
   gross_minor_units,currency,completed_at,entry_state)
 VALUES (p_payment,p_subscription,p_owner,p_plan,p_minor,p_currency,p_completed,
         CASE WHEN v_blocked THEN 'blocked_reversal' ELSE 'uncredited' END)
 ON CONFLICT (external_payment_id) DO NOTHING
 RETURNING TRUE INTO v_new;
 IF v_new IS TRUE THEN
   RETURN CASE WHEN v_blocked THEN 'inserted_blocked' ELSE 'inserted_uncredited' END;
 END IF;
 SELECT * INTO v_existing FROM supporter_private.paypal_payment_entries
  WHERE external_payment_id=p_payment;
 IF v_existing.external_subscription_id IS DISTINCT FROM p_subscription
    OR v_existing.owner_id IS DISTINCT FROM p_owner
    OR v_existing.plan_id IS DISTINCT FROM p_plan
    OR v_existing.gross_minor_units IS DISTINCT FROM p_minor
    OR v_existing.currency IS DISTINCT FROM p_currency
    OR v_existing.completed_at IS DISTINCT FROM p_completed
 THEN RAISE EXCEPTION 'Conflicting payment identity' USING ERRCODE='22023'; END IF;
 IF v_blocked AND v_existing.entry_state <> 'blocked_reversal' THEN
   UPDATE supporter_private.paypal_payment_entries
     SET entry_state='blocked_reversal' WHERE external_payment_id=p_payment;
 END IF;
 RETURN CASE WHEN v_blocked THEN 'duplicate_blocked' ELSE 'duplicate_uncredited' END;
END;
$body$;

CREATE FUNCTION supporter_private.f16_private_record_reversal(
 p_payment text,p_kind text,p_verified timestamptz
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $body$
DECLARE v_kind text; v_time timestamptz; v_new boolean;
BEGIN
 IF p_payment IS NULL OR p_payment !~ '^[A-Za-z0-9._-]{3,128}$'
    OR p_kind NOT IN ('refunded','reversed','partially_refunded')
    OR p_kind IS NULL OR p_verified IS NULL
    OR p_verified > clock_timestamp()+interval '5 minutes'
 THEN RAISE EXCEPTION 'Unverified reversal attributes' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_payment,20261013));
 INSERT INTO supporter_private.paypal_payment_reversals
   (external_payment_id,reversal_kind,provider_verified_at)
 VALUES (p_payment,p_kind,p_verified)
 ON CONFLICT (external_payment_id) DO NOTHING RETURNING TRUE INTO v_new;
 IF v_new IS DISTINCT FROM TRUE THEN
   SELECT reversal_kind,provider_verified_at INTO v_kind,v_time
     FROM supporter_private.paypal_payment_reversals
     WHERE external_payment_id=p_payment;
   IF v_kind IS DISTINCT FROM p_kind OR v_time IS DISTINCT FROM p_verified THEN
      RAISE EXCEPTION 'Conflicting reversal evidence' USING ERRCODE='22023';
   END IF;
 END IF;
 UPDATE supporter_private.paypal_payment_entries SET entry_state='blocked_reversal'
 WHERE external_payment_id=p_payment AND entry_state<>'blocked_reversal';
 RETURN CASE WHEN v_new IS TRUE THEN 'reversal_recorded' ELSE 'reversal_duplicate' END;
END;
$body$;
REVOKE ALL ON FUNCTION supporter_private.f16_private_record_payment(text,text,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION supporter_private.f16_private_record_reversal(text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
