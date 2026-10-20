-- PAZO F16 LIVE merchant-generation infrastructure: INERT STAGING.
-- PREPARED IN PR #44. DO NOT APPLY HOSTED UNTIL SPECIFIC PO AUTHORIZATION.
-- This migration adds no checkout route, payment webhook writer, or entitlement
-- grants. New LIVE checkout is impossible through hard SQL CHECK constraints.
-- Existing PayPal Sandbox checkout, webhook, legacy runtime remain untouched.
-- Data retention for consent, payments, and accounting requires PO/legal gate.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('admin_private.paypal_gateway_runtime') IS NULL
  OR to_regclass('admin_private.admin_grants') IS NULL
  OR to_regnamespace('supporter_private') IS NULL
  OR NOT EXISTS (
   SELECT 1 FROM admin_private.paypal_gateway_runtime
   WHERE singleton=true AND active_environment='sandbox'
    AND live_checkout_enabled=false
  )
 THEN RAISE EXCEPTION 'PAZO F16 safe staging preflight unavailable'
  USING ERRCODE='42501'; END IF;
END $preflight$;

 -- 7 INERT TABLES: GENERATIONS, CONSENT, INBOX, PERIODS, HOLDS, ADMIN SWITCH AND AUDIT
CREATE SCHEMA IF NOT EXISTS admin_private;
CREATE SCHEMA IF NOT EXISTS supporter_private;

-- Each credential/merchant generation is an immutable contract for all
-- subscriptions originally created by that generation, even after switching.
-- Vault references contain no plaintext provider secrets.
CREATE TABLE admin_private.pazo_paypal_merchant_generations (
 generation bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 environment text NOT NULL CHECK(environment IN ('sandbox','live')),
 merchant_fingerprint_sha256 text NOT NULL
   CHECK(merchant_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
 plan_id text NOT NULL CHECK(plan_id ~ '^P-[A-Z0-9]{12,40}$'),
 webhook_id text NOT NULL CHECK(webhook_id ~ '^[A-Za-z0-9_-]{8,100}$'),
 client_id_vault uuid NOT NULL,
 client_secret_vault uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 retired_at timestamptz,
 CONSTRAINT pazo_paypal_generation_natural_key UNIQUE
  (environment,merchant_fingerprint_sha256,plan_id,webhook_id),
 CONSTRAINT pazo_paypal_generation_environment_key UNIQUE(environment,generation),
 CONSTRAINT pazo_paypal_retirement_order
  CHECK(retired_at IS NULL OR retired_at>=created_at)
);
CREATE INDEX pazo_paypal_generation_by_environment
 ON admin_private.pazo_paypal_merchant_generations(environment,generation);
ALTER TABLE admin_private.pazo_paypal_merchant_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_paypal_merchant_generations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_paypal_merchant_generations
 FROM PUBLIC,anon,authenticated,service_role;

-- New checkouts always start OFF. Explicit change of this CHECK requires a
-- separate reviewed release. No user or admin can flip LIVE in this draft.
CREATE TABLE admin_private.pazo_paypal_new_checkout_switch (
 singleton bool PRIMARY KEY DEFAULT true CHECK(singleton),
 environment text NOT NULL DEFAULT 'sandbox' CHECK(environment='sandbox'),
 live_enabled bool NOT NULL DEFAULT false CHECK(live_enabled=false),
 kill_switch bool NOT NULL DEFAULT true CHECK(kill_switch=true),
 active_generation bigint,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 updated_by uuid,
 updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CONSTRAINT pazo_paypal_off_switch_generation
  CHECK(active_generation IS NULL)
);
INSERT INTO admin_private.pazo_paypal_new_checkout_switch(singleton) VALUES(true);
ALTER TABLE admin_private.pazo_paypal_new_checkout_switch ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_paypal_new_checkout_switch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_paypal_new_checkout_switch
 FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE admin_private.pazo_paypal_switch_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL,
 from_revision bigint NOT NULL,
 to_revision bigint NOT NULL CHECK(to_revision>from_revision),
 attempted_mode text NOT NULL CHECK(attempted_mode IN('sandbox','live','stop')),
 outcome text NOT NULL CHECK(outcome IN('blocked','approved','rolled_back')),
 evidence_hash text NOT NULL CHECK(evidence_hash ~ '^[a-f0-9]{64}$'),
 happened_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE admin_private.pazo_paypal_switch_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_paypal_switch_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_paypal_switch_audit
 FROM PUBLIC,anon,authenticated,service_role;

-- Consent is affirmative, versioned, owned, and unique by owner/requestKey.
-- No browser-supplied subscription ID or claimed paidThrough grants coverage.
CREATE TABLE supporter_private.pazo_paypal_live_checkout_intents (
 intent_id text PRIMARY KEY
  CHECK(intent_id ~ '^intent-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'),
 owner_id uuid NOT NULL,
 request_key uuid NOT NULL,
 merchant_generation bigint NOT NULL,
 source_environment text NOT NULL DEFAULT 'live' CHECK(source_environment='live'),
 plan_id text NOT NULL CHECK(plan_id ~ '^P-[A-Z0-9]{12,40}$'),
 locale text NOT NULL CHECK(locale IN ('es','en')),
 terms_version text NOT NULL CHECK(terms_version ~ '^pazo-supporter-live[.][a-z0-9.-]{3,40}$'),
 terms_digest text NOT NULL CHECK(terms_digest ~ '^[a-f0-9]{64}$'),
 affirmative_consent bool NOT NULL CHECK(affirmative_consent=true),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 provider_create_claimed_at timestamptz,
 provider_subscription_id text UNIQUE
  CHECK(provider_subscription_id IS NULL OR
   provider_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','bound')),
 CONSTRAINT pazo_paypal_live_intent_unique_request UNIQUE(owner_id,request_key),
 CONSTRAINT pazo_paypal_live_intent_environment_generation FOREIGN KEY
  (source_environment,merchant_generation)
  REFERENCES admin_private.pazo_paypal_merchant_generations(environment,generation),
 CONSTRAINT pazo_paypal_live_intent_generation_key UNIQUE(intent_id,merchant_generation),
 CONSTRAINT pazo_paypal_live_intent_binding_state CHECK(
  (state='pending' AND provider_subscription_id IS NULL) OR
  (state='bound' AND provider_subscription_id IS NOT NULL
   AND provider_create_claimed_at IS NOT NULL)),
 CONSTRAINT pazo_paypal_live_claim_after_creation CHECK(
  provider_create_claimed_at IS NULL OR provider_create_claimed_at>=created_at)
);
CREATE INDEX pazo_paypal_live_intents_owner
 ON supporter_private.pazo_paypal_live_checkout_intents(owner_id,created_at DESC);
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_checkout_intents
 FROM PUBLIC,anon,authenticated,service_role;

-- After verified LIVE signature AND independent PAZO merchant/owner proof,
-- only provider event reference/type is stored. No raw PayPal payload.
CREATE TABLE supporter_private.pazo_paypal_live_event_inbox (
 merchant_generation bigint NOT NULL,
 provider_event_id text NOT NULL
  CHECK(provider_event_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 event_type text NOT NULL
  CHECK(event_type ~ '^[A-Z0-9._-]{3,128}$'),
 source_environment text NOT NULL DEFAULT 'live' CHECK(source_environment='live'),
 processing_state text NOT NULL DEFAULT 'pending'
  CHECK(processing_state IN('pending','processing','processed','held')),
 verified_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(merchant_generation,provider_event_id),
 CONSTRAINT pazo_paypal_live_inbox_event_type_key UNIQUE
  (merchant_generation,provider_event_id,event_type),
 CONSTRAINT pazo_paypal_live_inbox_environment_generation
  FOREIGN KEY(source_environment,merchant_generation)
  REFERENCES admin_private.pazo_paypal_merchant_generations(environment,generation)
);
CREATE INDEX pazo_paypal_live_inbox_pending
 ON supporter_private.pazo_paypal_live_event_inbox(processing_state,verified_at);
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_event_inbox
 FROM PUBLIC,anon,authenticated,service_role;

-- A period requires a pre-existing owner consent/binding, signed event and
-- independently authenticated completed merchant sale. No auto-grant trigger.
CREATE TABLE supporter_private.pazo_paypal_live_paid_periods (
 sale_id text PRIMARY KEY CHECK(sale_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 intent_id text NOT NULL
  REFERENCES supporter_private.pazo_paypal_live_checkout_intents(intent_id),
 merchant_generation bigint NOT NULL,
 provider_event_id text NOT NULL,
 verified_event_type text NOT NULL DEFAULT 'PAYMENT.SALE.COMPLETED'
  CHECK(verified_event_type='PAYMENT.SALE.COMPLETED'),
 cycle_key text NOT NULL CHECK(cycle_key ~ '^[A-Za-z0-9_-]{6,100}$'),
 amount_minor integer NOT NULL DEFAULT 299 CHECK(amount_minor=299),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 service_start timestamptz NOT NULL,
 service_end timestamptz NOT NULL,
 merchant_verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CONSTRAINT pazo_paypal_live_paid_owner_generation
  FOREIGN KEY(intent_id,merchant_generation)
  REFERENCES supporter_private.pazo_paypal_live_checkout_intents
   (intent_id,merchant_generation),
 CONSTRAINT pazo_paypal_live_event_binding
  FOREIGN KEY(merchant_generation,provider_event_id,verified_event_type)
  REFERENCES supporter_private.pazo_paypal_live_event_inbox
   (merchant_generation,provider_event_id,event_type),
 CONSTRAINT pazo_paypal_live_single_sale_per_event UNIQUE
  (merchant_generation,provider_event_id),
 CONSTRAINT pazo_paypal_live_period_duration CHECK(
  service_end>service_start AND
  service_end<=service_start+interval '32 days'),
 CONSTRAINT pazo_paypal_live_unique_cycle UNIQUE(intent_id,cycle_key)
);
CREATE INDEX pazo_paypal_live_period_by_intent
 ON supporter_private.pazo_paypal_live_paid_periods(intent_id,service_end);
ALTER TABLE supporter_private.pazo_paypal_live_paid_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_paid_periods FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_paid_periods
 FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE supporter_private.pazo_paypal_live_period_holds (
 sale_id text NOT NULL
  REFERENCES supporter_private.pazo_paypal_live_paid_periods(sale_id),
 hold_id text NOT NULL CHECK(hold_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 kind text NOT NULL CHECK(kind IN('refunded','partially_refunded','reversed','dispute')),
 verified_at timestamptz NOT NULL,
 released_at timestamptz,
 PRIMARY KEY(sale_id,hold_id),
 CONSTRAINT pazo_paypal_live_hold_order
  CHECK(released_at IS NULL OR released_at>=verified_at)
);
ALTER TABLE supporter_private.pazo_paypal_live_period_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_period_holds FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_period_holds
 FROM PUBLIC,anon,authenticated,service_role;

-- No functions, no service_role writes, no webhook ingestion, no activation.

-- OWNER CANCELLATION CLAIM (UNGRANTED)
CREATE TABLE supporter_private.pazo_paypal_live_cancel_claims(
 intent_id text PRIMARY KEY,
 merchant_generation bigint NOT NULL,
 requested_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 provider_confirmed_at timestamptz,
 state text NOT NULL DEFAULT 'claimed'
  CHECK(state IN ('claimed','confirmed','review_required')),
 CONSTRAINT pazo_live_cancel_origin_fk
  FOREIGN KEY(intent_id,merchant_generation)
  REFERENCES supporter_private.pazo_paypal_live_checkout_intents
   (intent_id,merchant_generation),
 CONSTRAINT pazo_live_cancel_confirm_state CHECK(
  (provider_confirmed_at IS NULL AND state<>'confirmed') OR
  (provider_confirmed_at IS NOT NULL AND state='confirmed'))
);
ALTER TABLE supporter_private.pazo_paypal_live_cancel_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_cancel_claims FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_cancel_claims
 FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION supporter_private.pazo_live_claim_cancel_once(
 p_owner_id uuid,p_intent_id text,p_merchant_generation bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE claimed boolean:=false;
BEGIN
 IF p_owner_id IS NULL OR p_intent_id IS NULL OR
  p_merchant_generation IS NULL OR p_merchant_generation<1
 THEN RETURN false; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_cancel_claims(
  intent_id,merchant_generation
 )
 SELECT i.intent_id,i.merchant_generation
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.owner_id=p_owner_id AND i.intent_id=p_intent_id
  AND i.merchant_generation=p_merchant_generation
  AND i.source_environment='live'
  AND i.state='bound' AND i.provider_subscription_id IS NOT NULL
 ON CONFLICT (intent_id) DO NOTHING;
 GET DIAGNOSTICS claimed = ROW_COUNT;
 RETURN claimed;
END $function$;
ALTER FUNCTION supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)
 OWNER TO postgres;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)
 FROM PUBLIC,anon,authenticated,service_role;

-- PRIVATE ENTITLEMENT PROJECTION (UNGRANTED)
CREATE OR REPLACE FUNCTION supporter_private.pazo_live_project_paid_periods(
 p_owner uuid,p_as_of timestamptz
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $f$
WITH eligible AS (
 SELECT p.service_start,p.service_end
 FROM supporter_private.pazo_paypal_live_paid_periods p
 JOIN supporter_private.pazo_paypal_live_checkout_intents i
  ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
 WHERE i.owner_id=p_owner AND p.service_start<=p_as_of
 AND NOT EXISTS (
  SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
  WHERE h.sale_id=p.sale_id AND h.released_at IS NULL
 )
), ordered AS (
 SELECT service_start,service_end,
  lag(service_end) OVER(ORDER BY service_start,service_end) AS prior_end
 FROM eligible
), safety AS (
 SELECT COALESCE(bool_and(prior_end IS NULL OR prior_end<=service_start),true)
  AS nonoverlapping FROM ordered
), aggregated AS (
 SELECT count(*) FILTER(WHERE service_end<=p_as_of)::integer AS completed,
  max(service_end) FILTER(
   WHERE service_start<=p_as_of AND service_end>p_as_of
  ) AS paid_through
 FROM eligible
)
SELECT pg_catalog.jsonb_build_object(
 'active',s.nonoverlapping AND a.paid_through IS NOT NULL,
 'paidThrough',CASE WHEN s.nonoverlapping THEN a.paid_through ELSE NULL END,
 'completedCycles',CASE WHEN s.nonoverlapping THEN a.completed ELSE 0 END,
 'medalMonths',CASE
  WHEN NOT s.nonoverlapping THEN 0
  WHEN a.completed>=12 THEN 12
  WHEN a.completed>=6 THEN 6
  WHEN a.completed>=3 THEN 3
  ELSE 0 END,
 'sourceEnvironment','live'
)
FROM aggregated a CROSS JOIN safety s;
$f$;
ALTER FUNCTION supporter_private.pazo_live_project_paid_periods(uuid,timestamptz)
 OWNER TO postgres;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_project_paid_periods(uuid,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;

-- EMERGENCY STOP AND FUTURE CAS (UNGRANTED, LIVE OFF CHECKS)
CREATE TABLE admin_private.pazo_paypal_release_evidence(
 proof_id uuid PRIMARY KEY,
 actor_id uuid NOT NULL,
 merchant_generation bigint NOT NULL
  REFERENCES admin_private.pazo_paypal_merchant_generations(generation),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256 ~ '^[a-f0-9]{64}$'),
 all_checks_verified boolean NOT NULL DEFAULT false,
 checked_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 CONSTRAINT pazo_paypal_evidence_short_window CHECK(
  expires_at>checked_at AND expires_at<=checked_at+interval '5 minutes')
);
ALTER TABLE admin_private.pazo_paypal_release_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_private.pazo_paypal_release_evidence FORCE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.pazo_paypal_release_evidence
 FROM PUBLIC,anon,authenticated,service_role;

-- Must execute as a single database transaction, never in two HTTP calls.
-- Admin identity MUST originate from a GoTrue JWT-verified server wrapper.
-- All checks are rechecked in SQL; release evidence cannot be browser input.
CREATE OR REPLACE FUNCTION admin_private.pazo_paypal_switch_live_atomically(
 p_actor uuid,p_expected_revision bigint,p_generation bigint,
 p_proof_id uuid,p_evidence_sha256 text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_revision bigint; v_claimed uuid;
BEGIN
 IF p_actor IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
  OR p_generation IS NULL OR p_generation<1 OR p_proof_id IS NULL
  OR p_evidence_sha256 IS NULL OR
  p_evidence_sha256 !~ '^[a-f0-9]{64}$'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants
     WHERE user_id=p_actor)
 THEN RETURN 'unauthorized_or_invalid'; END IF;
 -- Lock the exact unconsumed server proof; no reuse of approved events.
 SELECT e.proof_id INTO v_claimed
 FROM admin_private.pazo_paypal_release_evidence e
 JOIN admin_private.pazo_paypal_merchant_generations g
  ON g.generation=e.merchant_generation
 WHERE e.proof_id=p_proof_id AND e.actor_id=p_actor
  AND e.merchant_generation=p_generation
  AND g.environment='live' AND g.retired_at IS NULL
  AND e.evidence_sha256=p_evidence_sha256
  AND e.all_checks_verified
  AND e.consumed_at IS NULL
  AND e.checked_at<=pg_catalog.clock_timestamp()
  AND e.expires_at>=pg_catalog.clock_timestamp()
 FOR UPDATE OF e;
 IF v_claimed IS NULL THEN RETURN 'proof_unavailable'; END IF;
 -- Compare and swap runtime + audit must commit together. Unreleased
 -- constraints guarantee this UPDATE fails while the beta switch is OFF.
 BEGIN
  UPDATE admin_private.pazo_paypal_new_checkout_switch
  SET environment='live',live_enabled=true,kill_switch=false,
   active_generation=p_generation,revision=revision+1,
   updated_by=p_actor,updated_at=pg_catalog.clock_timestamp()
  WHERE singleton AND revision=p_expected_revision AND
   environment='sandbox' AND live_enabled=false AND
   kill_switch=true AND active_generation IS NULL
  RETURNING revision INTO v_revision;
 EXCEPTION WHEN check_violation THEN
  RETURN 'blocked_schema_latch';
 END;
 IF v_revision IS NULL THEN RETURN 'stale_runtime_revision'; END IF;
 UPDATE admin_private.pazo_paypal_release_evidence
 SET consumed_at=pg_catalog.clock_timestamp()
 WHERE proof_id=p_proof_id;
 INSERT INTO admin_private.pazo_paypal_switch_audit(
  actor_id,from_revision,to_revision,attempted_mode,outcome,evidence_hash
 ) VALUES(p_actor,p_expected_revision,v_revision,'live','approved',p_evidence_sha256);
 RETURN 'switched';
END $fn$;
ALTER FUNCTION admin_private.pazo_paypal_switch_live_atomically(
 uuid,bigint,bigint,uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION admin_private.pazo_paypal_switch_live_atomically(
 uuid,bigint,bigint,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

-- Emergency stop affects NEW purchases only, keeping the original merchant
-- binding for historical Live account reads and cancellations.
CREATE OR REPLACE FUNCTION admin_private.pazo_paypal_stop_new_checkout_atomically(
 p_actor uuid,p_expected_revision bigint,p_evidence_sha256 text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_revision bigint;
BEGIN
 IF p_actor IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
  OR p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[a-f0-9]{64}$'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants
   WHERE user_id=p_actor)
 THEN RETURN 'unauthorized_or_invalid'; END IF;
 BEGIN
  UPDATE admin_private.pazo_paypal_new_checkout_switch
  SET live_enabled=false,kill_switch=true,revision=revision+1,
   updated_by=p_actor,updated_at=pg_catalog.clock_timestamp()
  WHERE singleton AND revision=p_expected_revision AND
   environment='live' AND live_enabled=true AND kill_switch=false
  RETURNING revision INTO v_revision;
 EXCEPTION WHEN check_violation THEN RETURN 'blocked_schema_latch';
 END;
 IF v_revision IS NULL THEN RETURN 'stale_runtime_revision'; END IF;
 INSERT INTO admin_private.pazo_paypal_switch_audit(
  actor_id,from_revision,to_revision,attempted_mode,outcome,evidence_hash
 ) VALUES(p_actor,p_expected_revision,v_revision,'stop','rolled_back',p_evidence_sha256);
 RETURN 'stopped';
END $fn$;
ALTER FUNCTION admin_private.pazo_paypal_stop_new_checkout_atomically(
 uuid,bigint,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION admin_private.pazo_paypal_stop_new_checkout_atomically(
 uuid,bigint,text) FROM PUBLIC,anon,authenticated,service_role;

-- Atomic safe staging postflight: failure rolls back the whole migration.
DO $postflight$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM admin_private.pazo_paypal_new_checkout_switch
 WHERE singleton AND environment='sandbox' AND live_enabled=false
   AND kill_switch=true AND active_generation IS NULL AND revision=0;
 IF n<>1 THEN RAISE EXCEPTION 'PAZO F16 unexpected Live staging status'; END IF;
 IF EXISTS (
  SELECT 1 FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace
  WHERE c.relname LIKE 'pazo_paypal_%'
   AND s.nspname IN('admin_private','supporter_private')
   AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)
 ) THEN RAISE EXCEPTION 'PAZO F16 missing FORCE RLS'; END IF;
END $postflight$;
COMMIT;
