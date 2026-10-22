-- P24 fixture mimicking ONLY existing hosted P06 column contract.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres' THEN RAISE EXCEPTION 'P24 lab only'; END IF;
END
$guard$;
CREATE TABLE supporter_private.paypal_p06_offers (
 version text NOT NULL,locale text NOT NULL,
 sha256 text NOT NULL,plan_id text NOT NULL,
 price_minor integer NOT NULL,currency text NOT NULL,
 cadence text NOT NULL,published_at timestamptz,
 PRIMARY KEY(version,locale)
);
CREATE TABLE supporter_private.paypal_p06_checkout_attempts (
 owner_id uuid NOT NULL,
 request_key uuid NOT NULL,
 intent_id text NOT NULL UNIQUE,
 locale text NOT NULL,
 terms_version text NOT NULL,
 terms_sha256 text NOT NULL,
 consented_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL,
 provider_create_claimed_at timestamptz,
 retention_hold boolean NOT NULL DEFAULT true,
 PRIMARY KEY(owner_id,request_key),
 FOREIGN KEY(terms_version,locale) REFERENCES supporter_private.paypal_p06_offers(version,locale)
);
ALTER TABLE supporter_private.paypal_p06_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_p06_offers FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_p06_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_p06_checkout_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_p06_offers,
 supporter_private.paypal_p06_checkout_attempts
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
