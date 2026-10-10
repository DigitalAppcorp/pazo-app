-- PAZO F14 A3 — atomic review transition contract (DRAFT, NOT APPLIED).
-- Requires intake/deletion_jobs + deletion_events + recent_auth drafts.
-- Cannot activate until a separate PO-approved migration replaces
-- the always-false full write-freeze readiness gate with verified coverage.
BEGIN;
DO $a3_transition_not_applied$
BEGIN
  RAISE EXCEPTION 'A3 TRANSITION DRAFT ONLY: explicit PO migration gate required';
END
$a3_transition_not_applied$;

-- Intentionally ALWAYS false. The currently proposed 14-table write fence
-- cannot block every Storage, Edge, rescue, notification or legacy writer.
-- A separate reviewed migration must prove and replace this contract.
CREATE OR REPLACE FUNCTION account_private.f14_a3_full_write_fence_ready()
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $a3_freeze_gate$
  SELECT false;
$a3_freeze_gate$;
REVOKE ALL ON FUNCTION account_private.f14_a3_full_write_fence_ready()
  FROM PUBLIC, anon, authenticated;

-- This function coordinates exactly one requested->reviewing transition.
-- All data-changing guards must obtain the identical advisory transaction
-- lock for every affected owner (sorted by UUID), THEN inspect job status.
CREATE OR REPLACE FUNCTION public.f14_a3_service_begin_review(
  p_job_id uuid, p_user_id uuid, p_session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_begin_review$
DECLARE
  v_owner uuid;
  v_status text;
  v_verified timestamptz;
  v_expires timestamptz;
  v_consumed timestamptz;
  v_session uuid;
  v_now timestamptz;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Service access required' USING ERRCODE='42501';
  END IF;
  IF p_job_id IS NULL OR p_user_id IS NULL OR p_session_id IS NULL THEN
    RETURN false;
  END IF;

  -- The preliminary SELECT is deliberately NOT a row lock. Take the same
  -- per-owner advisory lock as the write fence before locking the job row.
  SELECT user_id INTO v_owner FROM account_private.deletion_jobs
    WHERE id=p_job_id;
  IF v_owner IS NULL OR v_owner <> p_user_id THEN RETURN false; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text,901426));

  SELECT user_id,status INTO v_owner,v_status
    FROM account_private.deletion_jobs
    WHERE id=p_job_id FOR UPDATE;
  IF v_owner IS DISTINCT FROM p_user_id OR v_status <> 'requested' THEN
    RETURN false;
  END IF;

  -- This gate is false in the initial draft BY DESIGN. A forged parameter
  -- cannot bypass it, nor can a service-level token alone authorize review.
  IF NOT account_private.f14_a3_full_write_fence_ready() THEN RETURN false; END IF;

  SELECT r.session_id,r.verified_at,r.expires_at,r.consumed_at
    INTO v_session,v_verified,v_expires,v_consumed
    FROM account_private.deletion_recent_auth r
    WHERE r.job_id=p_job_id AND r.user_id=p_user_id FOR UPDATE;

  v_now := pg_catalog.clock_timestamp();
  IF v_session IS DISTINCT FROM p_session_id
    OR v_verified IS NULL OR v_verified > v_now
    OR v_expires IS NULL OR v_expires <= v_now
    OR v_consumed IS NOT NULL THEN RETURN false; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id=p_session_id AND s.user_id=p_user_id
      AND (s.not_after IS NULL OR s.not_after > v_now)
  ) THEN RETURN false; END IF;

  UPDATE account_private.deletion_recent_auth
     SET consumed_at=v_now
   WHERE job_id=p_job_id AND user_id=p_user_id
     AND session_id=p_session_id AND consumed_at IS NULL
     AND verified_at<=v_now AND expires_at>v_now;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE account_private.deletion_jobs
     SET status='reviewing',updated_at=v_now
   WHERE id=p_job_id AND user_id=p_user_id AND status='requested';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Concurrent review transition denied' USING ERRCODE='40001';
  END IF;

  INSERT INTO account_private.deletion_events(job_id,action)
    VALUES(p_job_id,'reviewed');
  RETURN true;
END
$a3_begin_review$;

REVOKE ALL ON FUNCTION public.f14_a3_service_begin_review(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_service_begin_review(uuid,uuid,uuid)
  TO service_role;
COMMIT;

-- NEVER consume the proof with a separate RPC or grant a bypass via a caller
-- parameter. This draft neither freezes all app writes nor deletes anything.
