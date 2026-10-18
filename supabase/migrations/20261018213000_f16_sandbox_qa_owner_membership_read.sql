-- PAZO F16 — Read-only, owner-scoped Sandbox account membership status.
-- A member can subscribe/manage without owning a pet; actual pet cosmetics
-- remain protected by existing per-pet RPCs. No financial DML or Live grants.
-- PREPARED ONLY: do NOT apply to hosted Supabase without separate PO gate.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regprocedure('supporter_private.f16_sandbox_qa_projection(uuid,timestamptz)') IS NULL
 OR pg_catalog.to_regprocedure('public.pazo_supporter_public_pet_benefits(uuid)') IS NULL
 OR pg_catalog.to_regprocedure('public.pazo_supporter_my_account_status()') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 Sandbox owner-status baseline mismatch'
   USING ERRCODE='55000'; END IF;
END $guard$;

CREATE FUNCTION public.pazo_supporter_my_account_status()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=''
AS $fn$
DECLARE
 v_owner uuid := auth.uid();
 v_evidence jsonb;
 v_months int;
 v_active boolean;
BEGIN
 -- auth.uid() is determined by Supabase JWT in PostgREST, not request body.
 -- Do not accept an owner/pet/subscription identifier from a browser.
 IF v_owner IS NULL OR NOT EXISTS (
   SELECT 1 FROM auth.users u WHERE u.id=v_owner
   AND u.email_confirmed_at IS NOT NULL
   AND u.is_anonymous IS DISTINCT FROM true
 ) THEN
   RAISE EXCEPTION 'Confirmed authentication required' USING ERRCODE='42501';
 END IF;
 v_evidence:=supporter_private.f16_sandbox_qa_projection(
   v_owner,pg_catalog.clock_timestamp());
 v_active:=COALESCE((v_evidence->>'active')::boolean,false);
 v_months:=COALESCE((v_evidence->>'completedCycles')::int,0);
 RETURN pg_catalog.jsonb_build_object(
   'active',v_active,
   'milestone',CASE
     WHEN NOT v_active THEN 0
     WHEN v_months>=12 THEN 12
     WHEN v_months>=6 THEN 6
     WHEN v_months>=3 THEN 3
     ELSE 0 END);
END
$fn$;
ALTER FUNCTION public.pazo_supporter_my_account_status() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_supporter_my_account_status()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_my_account_status()
 TO authenticated;

DO $post$
BEGIN
 IF pg_catalog.has_function_privilege(
      'anon','public.pazo_supporter_my_account_status()','EXECUTE')
 OR NOT pg_catalog.has_function_privilege(
      'authenticated','public.pazo_supporter_my_account_status()','EXECUTE')
 OR pg_catalog.has_function_privilege(
      'service_role','public.pazo_supporter_my_account_status()','EXECUTE')
 THEN
   RAISE EXCEPTION 'F16 Sandbox account-status privilege drift'
     USING ERRCODE='42501';
 END IF;
END $post$;
COMMIT;
