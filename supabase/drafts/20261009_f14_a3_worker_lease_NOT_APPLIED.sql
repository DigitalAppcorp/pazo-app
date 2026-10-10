-- PAZO F14 A3 — service-only lease coordination proposal (NOT APPLIED).
-- Needs prior A3 intake draft, server reauthentication and write-freeze.
-- No actions on Auth, Storage or user content. Current proposal is inert.
BEGIN;
DO $a3_lease_guard$
BEGIN
  RAISE EXCEPTION 'A3 LEASE DRAFT ONLY: requires approved migration and gate';
END
$a3_lease_guard$;

CREATE TABLE account_private.deletion_worker_leases (
  job_id uuid PRIMARY KEY REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
  lease_token uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_version bigint NOT NULL DEFAULT 1 CHECK (lease_version > 0),
  acquired_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > acquired_at)
);
ALTER TABLE account_private.deletion_worker_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_private.deletion_worker_leases FROM PUBLIC, anon, authenticated;

-- This claim does not change the job to an executable state.
-- Human/server-verified reauthentication and write-freeze happen separately.
CREATE OR REPLACE FUNCTION public.f14_a3_worker_acquire_lease(
  p_job_id uuid, p_seconds integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_claim$
DECLARE
  v_status text;
  v_lease account_private.deletion_worker_leases%ROWTYPE;
  v_token uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
  END IF;
  IF p_seconds IS NULL OR p_seconds < 5 OR p_seconds > 60 THEN
    RAISE EXCEPTION 'Invalid bounded lease duration' USING ERRCODE='22023';
  END IF;
  -- Serialize claims with the job row as well as the unique lease key.
  SELECT status INTO v_status
    FROM account_private.deletion_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_status <> 'reviewing' THEN
    RAISE EXCEPTION 'Job is not authorized for worker review'
      USING ERRCODE='42501';
  END IF;

  INSERT INTO account_private.deletion_worker_leases
    (job_id, lease_token, lease_version, acquired_at, expires_at)
  VALUES (p_job_id,v_token,1,v_now,v_now+make_interval(secs=>p_seconds))
  ON CONFLICT (job_id) DO UPDATE
    SET lease_token = EXCLUDED.lease_token,
        lease_version = account_private.deletion_worker_leases.lease_version+1,
        acquired_at = EXCLUDED.acquired_at,
        expires_at = EXCLUDED.expires_at
    WHERE account_private.deletion_worker_leases.expires_at <= v_now
  RETURNING * INTO v_lease;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job is already leased' USING ERRCODE='55P03';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'token',v_lease.lease_token,'version',v_lease.lease_version,
    'expires_at',v_lease.expires_at,'job_id',v_lease.job_id);
END;
$a3_claim$;

-- Read-only lease assertion: a token MUST never by itself grant permission
-- to delete content, Auth users or Storage objects.
CREATE OR REPLACE FUNCTION public.f14_a3_worker_validate_lease(
  p_job_id uuid, p_token uuid, p_version bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_validate$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM account_private.deletion_worker_leases l
    JOIN account_private.deletion_jobs j ON j.id=l.job_id
    WHERE l.job_id=p_job_id AND l.lease_token=p_token
      AND l.lease_version=p_version
      AND l.expires_at > clock_timestamp()
      AND j.status = 'reviewing'
  );
END;
$a3_validate$;

-- Release is CAS-bound: a stale worker cannot invalidate a renewed lease.
CREATE OR REPLACE FUNCTION public.f14_a3_worker_release_lease(
  p_job_id uuid, p_token uuid, p_version bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_release$
DECLARE v_count integer;
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
    RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
  END IF;
  UPDATE account_private.deletion_worker_leases
     SET expires_at=clock_timestamp(),lease_version=lease_version+1
   WHERE job_id=p_job_id AND lease_token=p_token
     AND lease_version=p_version AND expires_at>clock_timestamp();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count=1;
END;
$a3_release$;

REVOKE ALL ON FUNCTION public.f14_a3_worker_acquire_lease(uuid,integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_worker_validate_lease(uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_worker_release_lease(uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_acquire_lease(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_validate_lease(uuid,uuid,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_release_lease(uuid,uuid,bigint) TO service_role;
COMMIT;

-- This draft neither freezes PostgREST writers nor implements deletion.
-- A surviving lease does NOT prove Storage identity, media cleanup, sessions,
-- ownership, archive completeness or a right to call auth.admin.deleteUser.
