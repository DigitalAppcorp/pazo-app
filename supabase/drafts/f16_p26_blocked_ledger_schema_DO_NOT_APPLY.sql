-- PAZO F16-P26-B: TRANSACTIONAL LEDGER DESIGN LAB ONLY.
-- This file is deliberately NOT a migration or a deployable payment writer.
-- Requires P25 schema in a disposable PG17 database, and an independent PO GO
-- before any hosted schema installation, PayPal read, ledger or entitlement.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin' OR current_user<>'postgres'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR pg_catalog.to_regclass('supporter_private.p25_first_obligation_reviews') IS NULL
 THEN RAISE EXCEPTION 'P26 disposable PostgreSQL P25 prerequisite only'
 USING ERRCODE='42501'; END IF;
END $guard$;

-- An immutable contract for design validation, not a real payment entry.
-- There is no procedure to populate this table, no service_role grants,
-- and NO period/paidThrough or entitlement writes.
CREATE TABLE supporter_private.p26_proposed_obligation_credits (
 intent_id text NOT NULL,
 obligation_ordinal smallint NOT NULL CHECK(obligation_ordinal=0),
 external_sale_id text NOT NULL UNIQUE
   CHECK(external_sale_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 owner_id uuid NOT NULL,
 source_review_state text NOT NULL DEFAULT 'review_required'
   CHECK(source_review_state='review_required'),
 credit_state text NOT NULL DEFAULT 'blocked'
   CHECK(credit_state='blocked'),
 retention_hold boolean NOT NULL DEFAULT true
   CHECK(retention_hold),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(intent_id,obligation_ordinal),
 FOREIGN KEY(intent_id,obligation_ordinal)
  REFERENCES supporter_private.p25_first_obligation_reviews(intent_id,obligation_ordinal)
);
ALTER TABLE supporter_private.p26_proposed_obligation_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p26_proposed_obligation_credits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p26_proposed_obligation_credits
 FROM PUBLIC,anon,authenticated,service_role;

-- Enforce provenance of the *reservation* in the local, disposable
-- proof-of-concept. This still cannot attest real merchant evidence.
CREATE FUNCTION supporter_private.p26_proposed_reservation_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard_trigger$
DECLARE v supporter_private.p25_first_obligation_reviews%ROWTYPE;
BEGIN
 SELECT * INTO v FROM supporter_private.p25_first_obligation_reviews
 WHERE intent_id=NEW.intent_id AND obligation_ordinal=NEW.obligation_ordinal
 FOR UPDATE;
 IF NOT FOUND OR v.external_sale_id IS DISTINCT FROM NEW.external_sale_id
 OR v.owner_id IS DISTINCT FROM NEW.owner_id
 OR v.review_state<>'review_required'
 OR v.retention_hold IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'P26 reservation lineage inconsistent' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $guard_trigger$;
CREATE TRIGGER p26_proposed_reservation_guard
 BEFORE INSERT ON supporter_private.p26_proposed_obligation_credits
 FOR EACH ROW EXECUTE FUNCTION supporter_private.p26_proposed_reservation_guard();
REVOKE ALL ON FUNCTION supporter_private.p26_proposed_reservation_guard()
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
