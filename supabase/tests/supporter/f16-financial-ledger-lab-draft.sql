-- PAZO F16: PostgreSQL 17 disposable LAB ONLY. NOT A DEPLOYABLE MIGRATION.
-- No live payment intake, no entitlement, no private financial retention chosen.
\set ON_ERROR_STOP on
BEGIN;

DO $lab$
BEGIN
 IF current_database() <> 'f14_synthetic'
    OR session_user <> 'f14_admin'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'F16 financial ledger test must run in disposable PostgreSQL 17 with inbox foundation';
 END IF;
END;
$lab$;

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
CREATE FUNCTION supporter_private.f16_lab_record_payment(
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

CREATE FUNCTION supporter_private.f16_lab_record_reversal(
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
REVOKE ALL ON FUNCTION supporter_private.f16_lab_record_payment(text,text,uuid,text,integer,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION supporter_private.f16_lab_record_reversal(text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
