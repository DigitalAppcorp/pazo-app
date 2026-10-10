-- F14 A3: terminal lease handoff with exact owner/version and token rotation.
-- DRAFT ONLY. No Supabase DDL/DML, Auth, Storage or user-data deletion.
-- Depends on: intake deletion_jobs/events, worker leases, write freeze.
-- Existing review lease only handles status='reviewing'. This separate
-- handoff models deleting_data -> deleting_auth, never allows a review
-- lease to work directly as a terminal lease.
BEGIN;
DO $a3_terminal_handoff_not_applied$
BEGIN
 RAISE EXCEPTION 'A3 TERMINAL LEASE HANDOFF DRAFT ONLY — approval required';
END
$a3_terminal_handoff_not_applied$;

-- Must remain false until source-stage/foreign keys/media/session/UGC/
-- retention proofs are obtained from live server-side evidence and tested.
-- Checkpoints in previous invocations or booleans supplied by callers
-- are not accepted as proof.
CREATE OR REPLACE FUNCTION account_private.f14_a3_terminal_handoff_ready()
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $a3_terminal_handoff_gate$
 SELECT false;
$a3_terminal_handoff_gate$;
REVOKE ALL ON FUNCTION account_private.f14_a3_terminal_handoff_ready()
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.f14_a3_service_handoff_terminal_lease(
 p_job_id uuid,p_user_id uuid,p_old_token uuid,p_old_version bigint,
 p_seconds integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_handoff$
DECLARE
 v_owner uuid;
 v_status text;
 v_new_token uuid := pg_catalog.gen_random_uuid();
 v_now timestamptz;
 v_claim account_private.deletion_worker_leases%ROWTYPE;
BEGIN
 IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
  RAISE EXCEPTION 'Service access required' USING ERRCODE='42501';
 END IF;
 IF p_job_id IS NULL OR p_user_id IS NULL OR p_old_token IS NULL
   OR p_old_version IS NULL OR p_old_version < 1
   OR p_old_version = 9223372036854775807
   OR p_seconds IS NULL OR p_seconds < 5 OR p_seconds > 60 THEN
  RETURN NULL;
 END IF;
 -- Two independent safety gates: both deliberately false in current drafts.
 IF NOT account_private.f14_a3_full_write_fence_ready()
   OR NOT account_private.f14_a3_terminal_handoff_ready() THEN
  RETURN NULL;
 END IF;

 -- Lock A3 owner FIRST, then job row, then lease row, consistently with
 -- the proposed terminal profile scope procedure. Never accept an owner
 -- supplied by the caller without rechecking the private job.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_user_id::text,901426));

 SELECT user_id,status INTO v_owner,v_status
 FROM account_private.deletion_jobs WHERE id=p_job_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM p_user_id OR v_status <> 'deleting_data' THEN
  RETURN NULL;
 END IF;

 v_now := pg_catalog.clock_timestamp();
 PERFORM 1 FROM account_private.deletion_worker_leases l
 WHERE l.job_id=p_job_id AND l.lease_token=p_old_token
   AND l.lease_version=p_old_version
   AND l.expires_at>v_now FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;

 -- CAS and token rotation fence out old workers, including retries
 -- that replay the old token/version after a successful transition.
 UPDATE account_private.deletion_worker_leases
 SET lease_token=v_new_token,
     lease_version=lease_version+1,
     acquired_at=v_now,
     expires_at=v_now+pg_catalog.make_interval(secs=>p_seconds)
 WHERE job_id=p_job_id AND lease_token=p_old_token
   AND lease_version=p_old_version AND expires_at>v_now
 RETURNING * INTO v_claim;
 IF NOT FOUND THEN RETURN NULL; END IF;

 UPDATE account_private.deletion_jobs
 SET status='deleting_auth',updated_at=v_now
 WHERE id=p_job_id AND user_id=p_user_id AND status='deleting_data';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Concurrent terminal handoff denied' USING ERRCODE='40001';
 END IF;

 -- Transactional journal. Only the server-confirmed pre-auth data stage
 -- is noted; this is NOT evidence of Auth deletion or completion.
 INSERT INTO account_private.deletion_events(job_id,action)
 VALUES (p_job_id,'data_verified');

 RETURN pg_catalog.jsonb_build_object(
  'job_id',p_job_id,
  'token',v_claim.lease_token,
  'version',v_claim.lease_version,
  'expires_at',v_claim.expires_at);
END;
$a3_handoff$;

REVOKE ALL ON FUNCTION public.f14_a3_service_handoff_terminal_lease(uuid,uuid,uuid,bigint,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_service_handoff_terminal_lease(uuid,uuid,uuid,bigint,integer)
 TO service_role;
COMMIT;

-- OPEN GATES: No path from reviewing to deleting_data is implemented;
-- no mechanism to re-claim an expired deleting_auth lease, no actual
-- data/Storage/Auth cleanup, no grant to write-fence readiness. Tests
-- against real triggers/RLS and two live sessions require isolated DB.
