-- PAZO F14 A3: expired terminal worker quarantine only (NOT APPLIED).
-- No retry, Auth/Storage mutation, profile deletion or authorization bypass.
-- Fail closed: independent PO migration gate required before any DDL.
BEGIN;
DO $a3_terminal_quarantine_not_applied$
BEGIN
 RAISE EXCEPTION 'A3 TERMINAL QUARANTINE DRAFT ONLY — explicit PO gate required';
END
$a3_terminal_quarantine_not_applied$;

-- IMPORTANT: no automatic resume of an expired terminal worker.
-- An external Auth/Storage operation could still be in flight even after
-- a DB lease expires. Quarantine first; reconcile external outcome manually
-- before any separately reviewed retry transition.
CREATE OR REPLACE FUNCTION account_private.f14_a3_terminal_quarantine_ready()
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $a3_quarantine_gate$
 SELECT false;
$a3_quarantine_gate$;
REVOKE ALL ON FUNCTION account_private.f14_a3_terminal_quarantine_ready()
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.f14_a3_service_quarantine_expired_terminal_lease(
 p_job_id uuid,p_user_id uuid,p_old_token uuid,p_old_version bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_quarantine$
DECLARE
 v_owner uuid;
 v_status text;
 v_now timestamptz;
 v_count integer;
BEGIN
 IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
  RAISE EXCEPTION 'Service access required' USING ERRCODE='42501';
 END IF;
 IF p_job_id IS NULL OR p_user_id IS NULL OR p_old_token IS NULL
   OR p_old_version IS NULL OR p_old_version < 1
   OR p_old_version = 9223372036854775807 THEN RETURN false; END IF;
 -- BOTH independent readiness gates are permanently FALSE in draft.
 IF NOT account_private.f14_a3_full_write_fence_ready()
    OR NOT account_private.f14_a3_terminal_quarantine_ready() THEN
  RETURN false;
 END IF;
 -- Same cross-writer order: owner advisory -> job FOR UPDATE -> lease FOR UPDATE.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_user_id::text,901426));
 SELECT user_id,status INTO v_owner,v_status
 FROM account_private.deletion_jobs WHERE id=p_job_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM p_user_id OR v_status <> 'deleting_auth' THEN
  RETURN false;
 END IF;
 PERFORM 1 FROM account_private.deletion_worker_leases l
 WHERE l.job_id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 v_now:=pg_catalog.clock_timestamp();

 -- Only matching expired version can be invalidated. Live leases stay live.
 -- Rotation fences out every stale worker holding the prior token.
 UPDATE account_private.deletion_worker_leases
 SET lease_token=pg_catalog.gen_random_uuid(),
     lease_version=lease_version+1
 WHERE job_id=p_job_id AND lease_token=p_old_token
   AND lease_version=p_old_version
   AND lease_version<9223372036854775807
   AND expires_at<=v_now;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>1 THEN RETURN false; END IF;
 UPDATE account_private.deletion_jobs
 SET status='blocked',updated_at=v_now
 WHERE id=p_job_id AND user_id=p_user_id AND status='deleting_auth';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Concurrent terminal quarantine denied' USING ERRCODE='40001';
 END IF;
 INSERT INTO account_private.deletion_events(job_id,action)
 VALUES (p_job_id,'blocked');
 RETURN true;
END;
$a3_quarantine$;
REVOKE ALL ON FUNCTION public.f14_a3_service_quarantine_expired_terminal_lease(uuid,uuid,uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_service_quarantine_expired_terminal_lease(uuid,uuid,uuid,bigint)
 TO service_role;
COMMIT;

-- An expired DB lease does NOT prove that an Auth/Storage API request stopped.
-- This route marks the job blocked; it NEVER acquires a replacement lease,
-- issues a retry, marks completed, unlocks writers or deletes content.
-- Reactivation requires independent outcome reconciliation, not a flag.
