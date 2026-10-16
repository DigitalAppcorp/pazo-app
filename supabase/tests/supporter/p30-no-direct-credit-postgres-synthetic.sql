-- Additional P30 invariant test. Disposable PG17 only; no financial credit.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE rejected boolean:=false;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN RAISE EXCEPTION 'P30 disposable only'; END IF;
 IF to_regclass('supporter_private.p26_proposed_obligation_credits') IS NULL
 THEN RAISE EXCEPTION 'P26 laboratory schema missing'; END IF;
 IF has_table_privilege('service_role','supporter_private.p26_proposed_obligation_credits','UPDATE')
 OR has_table_privilege('authenticated','supporter_private.p26_proposed_obligation_credits','UPDATE')
 THEN RAISE EXCEPTION 'P30 direct update privilege exposed'; END IF;
 BEGIN
  UPDATE supporter_private.p26_proposed_obligation_credits SET credit_state='credited';
 EXCEPTION WHEN check_violation THEN rejected:=true;
 END;
 -- No rows could be credited even if the UPDATE affected no rows.
 IF EXISTS (SELECT 1 FROM supporter_private.p26_proposed_obligation_credits
            WHERE credit_state <> 'blocked')
 OR EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries)
 THEN RAISE EXCEPTION 'P30 unauthorized payment appeared'; END IF;
END $$;
ROLLBACK;
