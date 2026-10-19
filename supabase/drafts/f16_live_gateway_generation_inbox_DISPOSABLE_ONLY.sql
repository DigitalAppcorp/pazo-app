-- PAZO F16 LIVE multi-merchant gateway database structure — DISPOSABLE ONLY.
-- Not a hosted migration. Cannot be applied to PAZO production/staging.
-- Reconciliation, writer RPCs, merchant ownership and retention still need
-- review and a separate PO-authorized, versioned hosted migration.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'F16 LIVE GATEWAY DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;
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
 merchant_generation bigint NOT NULL
  REFERENCES admin_private.pazo_paypal_merchant_generations(generation),
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
 merchant_generation bigint NOT NULL
  REFERENCES admin_private.pazo_paypal_merchant_generations(generation),
 provider_event_id text NOT NULL
  CHECK(provider_event_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 event_type text NOT NULL
  CHECK(event_type ~ '^[A-Z0-9._-]{3,128}$'),
 source_environment text NOT NULL DEFAULT 'live' CHECK(source_environment='live'),
 processing_state text NOT NULL DEFAULT 'pending'
  CHECK(processing_state IN('pending','processing','processed','held')),
 verified_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(merchant_generation,provider_event_id)
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
 cycle_key text NOT NULL CHECK(cycle_key ~ '^[A-Za-z0-9_-]{6,100}$'),
 amount_minor integer NOT NULL DEFAULT 299 CHECK(amount_minor=299),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 service_start timestamptz NOT NULL,
 service_end timestamptz NOT NULL,
 merchant_verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CONSTRAINT pazo_paypal_live_event_binding
  FOREIGN KEY(merchant_generation,provider_event_id)
  REFERENCES supporter_private.pazo_paypal_live_event_inbox
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
COMMIT;
