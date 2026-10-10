-- F14 A3: transaction-bound, single-profile terminal cleanup capability.
-- DRAFT ONLY. This cannot execute on PAZO: guard aborts BEFORE any DDL.
-- Depends on A3 intake/job, worker lease, write fence and freeze transition.
-- This is NOT a general bypass, worker executor or permission to delete Auth.
BEGIN;
DO $a3_terminal_scope_not_applied$
BEGIN
 RAISE EXCEPTION 'A3 TERMINAL PROFILE SCOPE DRAFT ONLY — approval required';
END
$a3_terminal_scope_not_applied$;

CREATE TABLE account_private.deletion_terminal_scopes (
 job_id uuid NOT NULL REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL,
 scope text NOT NULL CHECK (scope='profile_delete'),
 backend_pid integer NOT NULL,
 transaction_id xid8 NOT NULL,
 lease_token uuid NOT NULL,
 lease_version bigint NOT NULL CHECK (lease_version>0),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY (job_id,backend_pid,transaction_id,scope)
);
ALTER TABLE account_private.deletion_terminal_scopes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_private.deletion_terminal_scopes
 FROM PUBLIC,anon,authenticated,service_role;

-- DELIBERATELY FALSE; a separate approved and E2E-verified migration
-- would be required even after the top DDL guard is intentionally removed.
CREATE OR REPLACE FUNCTION account_private.f14_a3_terminal_profile_cleanup_ready()
RETURNS boolean LANGUAGE sql STABLE SET search_path=''
AS $a3_terminal_gate$
 SELECT false;
$a3_terminal_gate$;
REVOKE ALL ON FUNCTION account_private.f14_a3_terminal_profile_cleanup_ready()
 FROM PUBLIC,anon,authenticated,service_role;

-- Only consumed by the A3 BEFORE DELETE trigger when OLD.id matches.
-- No session GUC, caller boolean, role-wide exception or reusable bearer.
-- Requires a scope row inserted by the same transaction/back-end, and a
-- matching current lease and exact deleting_auth state.
CREATE OR REPLACE FUNCTION account_private.f14_a3_terminal_profile_scope_valid(
 p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $a3_scope_valid$
 SELECT p_user_id IS NOT NULL AND EXISTS(
  SELECT 1 FROM account_private.deletion_terminal_scopes s
  JOIN account_private.deletion_jobs j
    ON j.id=s.job_id AND j.user_id=s.user_id
  JOIN account_private.deletion_worker_leases l
    ON l.job_id=j.id
  WHERE s.user_id=p_user_id AND s.scope='profile_delete'
    AND s.backend_pid=pg_catalog.pg_backend_pid()
    AND s.transaction_id=pg_catalog.pg_current_xact_id_if_assigned()
    AND j.status='deleting_auth'
    AND l.lease_token=s.lease_token AND l.lease_version=s.lease_version
    AND l.expires_at > pg_catalog.clock_timestamp()
 );
$a3_scope_valid$;
REVOKE ALL ON FUNCTION account_private.f14_a3_terminal_profile_scope_valid(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- Future service operation, with ALL safety gates closed in this draft.
-- Takes A3 owner advisory lock before job/lease row locks; locks are held
-- while the narrow profile DELETE triggers check the scoped capability.
-- The function cannot delete the auth user, posts, pets or Storage.
CREATE OR REPLACE FUNCTION public.f14_a3_service_terminal_delete_profile(
 p_job_id uuid,p_user_id uuid,p_lease_token uuid,p_lease_version bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_service_terminal_profile$
DECLARE
 v_owner uuid;
 v_status text;
 v_deleted integer;
BEGIN
 IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
  RAISE EXCEPTION 'Service access required' USING ERRCODE='42501';
 END IF;
 IF p_job_id IS NULL OR p_user_id IS NULL OR p_lease_token IS NULL
   OR p_lease_version IS NULL OR p_lease_version<1 THEN
  RETURN false;
 END IF;
 -- Both gates return false in the current drafts; neither permits cleanup.
 IF NOT account_private.f14_a3_full_write_fence_ready()
   OR NOT account_private.f14_a3_terminal_profile_cleanup_ready() THEN
  RETURN false;
 END IF;

 -- SAME lock hash/order as A3 write fence, before any job/lease row lock.
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_user_id::text,901426));
 SELECT j.user_id,j.status INTO v_owner,v_status
   FROM account_private.deletion_jobs j
  WHERE j.id=p_job_id FOR UPDATE;
 IF v_owner IS DISTINCT FROM p_user_id OR v_status <> 'deleting_auth' THEN
  RETURN false;
 END IF;
 PERFORM 1 FROM account_private.deletion_worker_leases l
  WHERE l.job_id=p_job_id AND l.lease_token=p_lease_token
    AND l.lease_version=p_lease_version
    AND l.expires_at>pg_catalog.clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;

 INSERT INTO account_private.deletion_terminal_scopes
  (job_id,user_id,scope,backend_pid,transaction_id,lease_token,lease_version)
 VALUES (p_job_id,p_user_id,'profile_delete',pg_catalog.pg_backend_pid(),
   pg_catalog.pg_current_xact_id(),p_lease_token,p_lease_version);

 -- The only user-data mutation in this procedure. The A3 trigger
 -- authorizes OLD.id for the exact current transaction + lease.
 DELETE FROM public.profiles WHERE id=p_user_id;
 GET DIAGNOSTICS v_deleted=ROW_COUNT;

 DELETE FROM account_private.deletion_terminal_scopes
  WHERE job_id=p_job_id AND user_id=p_user_id
   AND backend_pid=pg_catalog.pg_backend_pid()
   AND transaction_id=pg_catalog.pg_current_xact_id_if_assigned()
   AND scope='profile_delete';
 RETURN v_deleted=1;
END;
$a3_service_terminal_profile$;
REVOKE ALL ON FUNCTION public.f14_a3_service_terminal_delete_profile(uuid,uuid,uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_service_terminal_delete_profile(uuid,uuid,uuid,bigint)
 TO service_role;
COMMIT;

-- INCOMPLETE: profile cleanup is not an Auth deletion strategy.
-- Job FK RESTRICT, other Auth cascades, privacy/UGC, Storage/CDN, final
-- sessions/JWT and lease state transition remain unresolved.
-- Never flip either readiness gate without separate authorization + DB E2E.
