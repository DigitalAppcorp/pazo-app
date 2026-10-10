-- F14: Minimal, user-owned account-deletion REQUEST intake.
-- NOT APPLIED. Requires separate PO approval after CI; not an account-delete executor.
-- This does not modify or delete auth.users, user data, files, communities or posts.
BEGIN;

CREATE SCHEMA IF NOT EXISTS account_requests_private;
REVOKE ALL ON SCHEMA account_requests_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA account_requests_private TO service_role;

CREATE TABLE IF NOT EXISTS account_requests_private.deletion_requests (
  subject_user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','cancelled','processing','completed')),
  requested_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  processed_at timestamptz NULL,
  CONSTRAINT processed_only_when_complete CHECK (
    status <> 'completed' OR processed_at IS NOT NULL
  )
);
ALTER TABLE account_requests_private.deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON account_requests_private.deletion_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON account_requests_private.deletion_requests TO service_role;

-- No arbitrary user_id parameter in any public RPC. The subject comes from
-- the signed JWT and must still exist in Auth at request time.
CREATE OR REPLACE FUNCTION public.pazo_deletion_request()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $request$
DECLARE
 v_uid uuid:=auth.uid();
 v_status text;
 v_requested_at timestamptz;
BEGIN
 IF v_uid IS NULL
    OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_uid)
 THEN
   RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
 END IF;
 INSERT INTO account_requests_private.deletion_requests(subject_user_id)
 VALUES(v_uid)
 ON CONFLICT(subject_user_id) DO UPDATE
   SET status='requested',requested_at=pg_catalog.clock_timestamp(),
       updated_at=pg_catalog.clock_timestamp(),processed_at=NULL
   WHERE account_requests_private.deletion_requests.status='cancelled';
 SELECT r.status,r.requested_at INTO v_status,v_requested_at
 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid;
 RETURN pg_catalog.jsonb_build_object('status',v_status,'requested_at',v_requested_at);
END;
$request$;

CREATE OR REPLACE FUNCTION public.pazo_deletion_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $status$
DECLARE
 v_uid uuid:=auth.uid();
 v_result jsonb;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_uid)
 THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'status',r.status,'requested_at',r.requested_at
 ) INTO v_result FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=v_uid;
 RETURN v_result; -- SQL NULL for absent request; never expose another owner's row
END;
$status$;

CREATE OR REPLACE FUNCTION public.pazo_deletion_cancel()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $cancel$
DECLARE v_uid uuid:=auth.uid(); v_count integer;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_uid)
 THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 UPDATE account_requests_private.deletion_requests
 SET status='cancelled',updated_at=pg_catalog.clock_timestamp()
 WHERE subject_user_id=v_uid AND status='requested';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$cancel$;

REVOKE ALL ON FUNCTION public.pazo_deletion_request() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_deletion_status() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pazo_deletion_cancel() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_deletion_request() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_deletion_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_deletion_cancel() TO authenticated;
COMMIT;
