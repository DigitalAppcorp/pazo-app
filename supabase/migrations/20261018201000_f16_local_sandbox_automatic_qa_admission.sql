-- F16 local-only Sandbox QA automatic Auth-owner admission.
-- Service-role-only, invoked by the isolated Sandbox Edge route AFTER
-- the verified Auth user has explicitly accepted published QA checkout terms.
-- This never initiates PayPal, grants entitlements, reconciles orphaned
-- subscriptions, or overwrites previously disabled/historical QA owners.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_owners') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_owner_can_checkout(uuid)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'Local Sandbox auto-admission baseline mismatch'
  USING ERRCODE='55000'; END IF;
END $guard$;

CREATE FUNCTION public.f16_qa_v2_auto_admit_local_sandbox_owner(p_owner_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
BEGIN
 IF p_owner_id IS NULL THEN RETURN false; END IF;
 -- Not a substitute for Edge getUser(): this secondary check ensures an
 -- existing confirmed and non-anonymous Supabase Auth owner.
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_owner_id
  AND u.email_confirmed_at IS NOT NULL AND u.is_anonymous IS DISTINCT FROM true)
 THEN RETURN false; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text,0));
 -- Intentionally never unlock/re-enable/extend an explicitly disabled or
 -- historical QA owner's entry. A banned/expired entry stays closed.
 INSERT INTO supporter_private.f16_sandbox_qa_owners(
  owner_id,authorized_at,expires_at,status,test_purpose)
 VALUES(p_owner_id,pg_catalog.clock_timestamp(),'infinity'::timestamptz,
  'enabled','f16_four_benefits_sandbox')
 ON CONFLICT (owner_id) DO NOTHING;

 RETURN public.f16_qa_v2_owner_can_checkout(p_owner_id);
END $fn$;
ALTER FUNCTION public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)
 TO service_role;
DO $post$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
  'public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
  'public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
  'public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)','EXECUTE')
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_retry_grants') IS NULL
 THEN RAISE EXCEPTION 'Local Sandbox QA auto-admit ACL drift' USING ERRCODE='55000'; END IF;
END $post$;
COMMIT;
