-- F16-P40 — SCHEMA CANDIDATE FOR REVIEW. DO NOT APPLY IN HOSTED.
-- This SQL is a nonfinancial storage proposal only. The Product Owner approved
-- the limited data category AND a provisional active+3-calendar-years-after-close
-- retention criterion (subject to legal/backup review); NOT hosted installation,
-- any writer, retention deletion, or grant of service benefits.
-- CAUTION: This schema intentionally has NO trusted termination/hold source,
-- no retention sweeper and an immutable FK; it cannot yet execute the approved
-- retention policy. The lifecycle/deletion gate must close before hosted use.
-- No write RPC, client grant, paidThrough, account benefit or financial ledger.
BEGIN;
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
 IF current_user <> 'postgres' OR NOT (
   (pg_catalog.current_database()='f14_synthetic' AND session_user='f14_admin')
   OR
   (pg_catalog.current_database()='postgres' AND
    pg_catalog.current_setting('pazo.f16_p40_hosted_schema_go',true)='po_approved_separate_schema_go')
 ) THEN
  RAISE EXCEPTION 'F16-P40 not authorized for this database' USING ERRCODE='42501';
 END IF;
 IF pg_catalog.to_regclass('supporter_private.paypal_verified_activation_bindings') IS NOT NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p05_inbox_worker_gate') IS NULL
 THEN RAISE EXCEPTION 'P40 schema conflict or prerequisite missing' USING ERRCODE='55000'; END IF;
 IF (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P40 requires payments/worker OFF' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_class c
  WHERE c.oid='supporter_private.paypal_verified_event_inbox'::pg_catalog.regclass
  AND c.relrowsecurity AND c.relforcerowsecurity
 ) THEN RAISE EXCEPTION 'P40 missing forced inbox RLS'; END IF;
END $preflight$;

CREATE TABLE supporter_private.paypal_verified_activation_bindings(
 provider_event_id text PRIMARY KEY
   REFERENCES supporter_private.paypal_verified_event_inbox(provider_event_id)
   ON UPDATE RESTRICT ON DELETE RESTRICT,
 subscription_id text NOT NULL CHECK (subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 owner_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE supporter_private.paypal_verified_activation_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_verified_activation_bindings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_verified_activation_bindings
 FROM PUBLIC,anon,authenticated,service_role;

-- This trigger checks immutable attribution to an existing PAZO-owned intent.
-- Provider signature attestation MUST happen in a separate trusted ingress
-- before any future INSERT authorization; the trigger is not a signature verifier.
CREATE FUNCTION supporter_private.f16_p40_verify_activation_binding_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $trigger$
BEGIN
 IF TG_OP <> 'INSERT' THEN
  RAISE EXCEPTION 'P40 activation binding immutable pending retention approval'
   USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM supporter_private.paypal_verified_event_inbox e
 WHERE e.provider_event_id=NEW.provider_event_id
 AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
 AND e.verified_at IS NOT NULL AND e.retention_hold=true
 FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P40 verified activation missing' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM supporter_private.paypal_subscription_intents i
 WHERE i.external_subscription_id=NEW.subscription_id
 AND i.owner_id=NEW.owner_id
 AND i.provider='paypal' AND i.state='bound'
 AND i.plan_id='P-14V25407JP6850922NLHMDKI'
 FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'P40 bound owner/subscription missing'
   USING ERRCODE='22023'; END IF;
 NEW.created_at:=pg_catalog.clock_timestamp();
 RETURN NEW;
END $trigger$;
REVOKE ALL ON FUNCTION supporter_private.f16_p40_verify_activation_binding_immutable()
 FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER f16_p40_verify_activation_binding_immutable
BEFORE INSERT OR UPDATE OR DELETE ON supporter_private.paypal_verified_activation_bindings
FOR EACH ROW EXECUTE FUNCTION supporter_private.f16_p40_verify_activation_binding_immutable();

-- No INSERT/SELECT/UPDATE/DELETE RPC. Grant no privileges to API roles.
-- Deletion / backup retention / consent are unresolved and require a separate GO.
COMMIT;
