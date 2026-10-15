-- F16-P05 synthetic only. Recreates ONLY minimum columns/constraints
-- already present in hosted supporter_private tables, not hosted data.
\set ON_ERROR_STOP on
BEGIN;
DO $g$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'Disposable PostgreSQL only'; END IF;
 IF to_regclass('supporter_private.wall_consents') IS NULL
 THEN RAISE EXCEPTION 'Existing F16 consent baseline must be loaded first'; END IF;
END;
$g$;

CREATE TABLE supporter_private.paypal_subscription_intents (
 intent_id text PRIMARY KEY,
 owner_id uuid NOT NULL,
 plan_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('pending','bound')),
 external_subscription_id text UNIQUE
);
CREATE TABLE supporter_private.paypal_verified_event_inbox (
 provider_event_id text PRIMARY KEY,
 event_type text NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 processing_state text NOT NULL DEFAULT 'pending'
);
CREATE TABLE supporter_private.paypal_payment_entries (
 external_payment_id text PRIMARY KEY,
 external_subscription_id text NOT NULL,
 entry_state text NOT NULL DEFAULT 'uncredited'
  CHECK (entry_state IN ('uncredited','blocked_reversal'))
);

ALTER TABLE supporter_private.paypal_subscription_intents
 ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_subscription_intents
 FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_verified_event_inbox
 ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_verified_event_inbox
 FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_payment_entries
 ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_payment_entries
 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE
 supporter_private.paypal_subscription_intents,
 supporter_private.paypal_verified_event_inbox,
 supporter_private.paypal_payment_entries
 FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
