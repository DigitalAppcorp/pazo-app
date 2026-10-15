-- PAZO F16-P21: recreate ONLY existing hosted inbox fields in disposable lab.
-- Legacy P05 fixture deliberately contains four columns only.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P21 fixture disposable only'; END IF;
 IF to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'P21 requires baseline'; END IF;
END
$guard$;
ALTER TABLE supporter_private.paypal_verified_event_inbox
 ADD COLUMN attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count>=0),
 ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 ADD COLUMN processed_at timestamptz,
 ADD COLUMN retention_hold boolean NOT NULL DEFAULT true,
 ADD COLUMN retention_released_at timestamptz,
 ADD COLUMN reconciled_payment_id text,
 ADD COLUMN last_error_code text
 CHECK (last_error_code IS NULL OR last_error_code ~ '^[a-z_]{1,48}$');
-- A legacy test asserts this isolated table remains empty. It is NOT an
-- assertion that this review table exists in hosted Supabase.
CREATE TABLE supporter_private.paypal_first_period_reviews (
 assertion_id text PRIMARY KEY
);
ALTER TABLE supporter_private.paypal_first_period_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_first_period_reviews FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_first_period_reviews
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
