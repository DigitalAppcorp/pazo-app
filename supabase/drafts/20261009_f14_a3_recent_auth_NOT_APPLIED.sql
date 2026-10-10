-- F14 A3 server-only reauthentication receipt. DRAFT / NOT APPLIED.
BEGIN;
DO $a3_guard$
BEGIN
 RAISE EXCEPTION 'A3 RECENT AUTH DRAFT ONLY: separate PO migration authorization required';
END
$a3_guard$;

CREATE TABLE account_private.deletion_recent_auth (
 job_id uuid PRIMARY KEY REFERENCES account_private.deletion_jobs(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 CHECK (expires_at > verified_at),
 CHECK (consumed_at IS NULL OR consumed_at >= verified_at)
);
ALTER TABLE account_private.deletion_recent_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_private.deletion_recent_auth FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.f14_a3_service_job_owner(p_job_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_owner$
DECLARE v_owner uuid;
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Service required' USING ERRCODE='42501';
 END IF;
 SELECT user_id INTO v_owner FROM account_private.deletion_jobs
 WHERE id=p_job_id AND status='requested';
 RETURN v_owner;
END
$a3_owner$;

-- Called by trusted server only AFTER Auth.getUser(jwt), verified JWT claims,
-- fresh signInWithPassword via a separate Auth client, and matching identities.
CREATE OR REPLACE FUNCTION public.f14_a3_service_record_reauth(
 p_job_id uuid,p_user_id uuid,p_session_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_record$
DECLARE v_owner uuid; v_now timestamptz := clock_timestamp();
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Service required' USING ERRCODE='42501';
 END IF;
 SELECT user_id INTO v_owner FROM account_private.deletion_jobs
 WHERE id=p_job_id AND status='requested' FOR UPDATE;
 IF v_owner IS NULL OR v_owner<>p_user_id THEN RETURN false; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM auth.sessions s WHERE s.id=p_session_id
    AND s.user_id=p_user_id AND (s.not_after IS NULL OR s.not_after>v_now)
 ) THEN RETURN false; END IF;
 INSERT INTO account_private.deletion_recent_auth
  (job_id,user_id,session_id,verified_at,expires_at,consumed_at)
 VALUES(p_job_id,p_user_id,p_session_id,v_now,v_now+INTERVAL '5 minutes',NULL)
 ON CONFLICT(job_id) DO UPDATE SET
  user_id=EXCLUDED.user_id,session_id=EXCLUDED.session_id,
  verified_at=EXCLUDED.verified_at,expires_at=EXCLUDED.expires_at,
  consumed_at=NULL;
 RETURN true;
END
$a3_record$;

-- Cannot pass until another approved migration consumes the receipt
-- atomically with the write-freeze transition (NOT IMPLEMENTED).
CREATE OR REPLACE FUNCTION public.f14_a3_worker_reauth_recent(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_recent$
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Service required' USING ERRCODE='42501';
 END IF;
 RETURN EXISTS(
  SELECT 1 FROM account_private.deletion_recent_auth r
  JOIN account_private.deletion_jobs j ON j.id=r.job_id
  JOIN auth.sessions s ON s.id=r.session_id AND s.user_id=r.user_id
  WHERE r.job_id=p_job_id AND j.user_id=r.user_id AND j.status='reviewing'
    AND r.consumed_at IS NOT NULL AND r.consumed_at >= r.verified_at
    AND r.consumed_at < r.expires_at AND r.expires_at>clock_timestamp()
    AND (s.not_after IS NULL OR s.not_after>clock_timestamp())
 );
END
$a3_recent$;

REVOKE ALL ON FUNCTION public.f14_a3_service_job_owner(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_service_record_reauth(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.f14_a3_worker_reauth_recent(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_service_job_owner(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_service_record_reauth(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_reauth_recent(uuid) TO service_role;
COMMIT;
-- No account deletion, worker activation, write-freeze or session revocation.
