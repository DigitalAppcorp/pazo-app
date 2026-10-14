-- PAZO F16: subscription intent ownership BINDING in disposable PG17 ONLY.
-- NOT a migration or a hosted database change. No entitlement or Live payments.
\set ON_ERROR_STOP on
BEGIN;
DO $lab$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'F16 intent lab requires disposable PostgreSQL 17'; END IF;
END $lab$;

-- An Auth-verified server-side owner must be the origin of this record.
-- Client-supplied owner_id, custom_id, plan or subscription IDs are NOT trusted.
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
CREATE FUNCTION supporter_private.f16_lab_bind_subscription(
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
REVOKE ALL ON FUNCTION supporter_private.f16_lab_bind_subscription(text,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
