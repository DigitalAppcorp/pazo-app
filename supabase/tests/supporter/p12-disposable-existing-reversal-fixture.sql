-- F16-P12 CI ONLY: reproduce the existing hosted reversal table prerequisite.
-- The older P05 fixture intentionally did not include this already-hosted table.
-- NEVER execute against a hosted Supabase project.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic'
  OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P12 fixture disposable-only' USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_payment_reversals') IS NOT NULL
 THEN RAISE EXCEPTION 'P12 duplicate reversal fixture'; END IF;
END
$guard$;
CREATE TABLE supporter_private.paypal_payment_reversals (
 external_payment_id text PRIMARY KEY
  CHECK (external_payment_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 reversal_kind text NOT NULL CHECK (reversal_kind IN
  ('refunded','reversed','partially_refunded')),
 provider_verified_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.paypal_payment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_payment_reversals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_payment_reversals
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
