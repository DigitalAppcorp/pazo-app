-- PAZO F16 Live switch transaction rehearsal — DISPOSABLE PostgreSQL ONLY.
-- The live OFF CHECK constraints remain in the original schema.
-- This adds no hosted activation authority, and grants NO EXECUTE.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
  OR to_regclass('admin_private.pazo_paypal_new_checkout_switch') IS NULL
  OR to_regclass('admin_private.admin_grants') IS NULL
 THEN RAISE EXCEPTION 'F16 LIVE SWITCH DISPOSABLE ONLY'
  USING ERRCODE='42501'; END IF;
END $guard$;
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
COMMIT;
