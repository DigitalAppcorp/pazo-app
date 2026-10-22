-- Sandbox V2 only: Auth owner eligibility, private list, no payment mutation.
BEGIN;
DO $guard$
BEGIN
 IF current_database() NOT IN ('f14_synthetic','postgres')
 OR to_regclass('supporter_private.f16_sandbox_qa_owners') IS NULL
 OR to_regprocedure('public.f16_qa_v2_owner_can_checkout(uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'V2 owner eligibility baseline drift' USING ERRCODE='55000'; END IF;
END $guard$;
CREATE FUNCTION public.f16_qa_v2_owner_can_checkout(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS(
 SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
 JOIN auth.users u ON u.id=q.owner_id
 WHERE q.owner_id=p_owner_id AND q.status='enabled'
 AND q.expires_at>pg_catalog.clock_timestamp()
 AND EXISTS(SELECT 1 FROM supporter_private.paypal_p06_checkout_attempts old
   WHERE old.owner_id=q.owner_id
    AND old.terms_version='pazo-supporter-sandbox.qa20261016-v1')
 )
$fn$;
ALTER FUNCTION public.f16_qa_v2_owner_can_checkout(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_owner_can_checkout(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_owner_can_checkout(uuid) TO service_role;
DO $post$
BEGIN
 IF has_function_privilege('anon','public.f16_qa_v2_owner_can_checkout(uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_qa_v2_owner_can_checkout(uuid)','EXECUTE')
 OR public.f16_qa_v2_owner_can_checkout('11111111-1111-4111-8111-111111111111'::uuid)
 THEN RAISE EXCEPTION 'V2 QA owner gate ACL or unauthorized account leak'
 USING ERRCODE='42501'; END IF;
END $post$;
COMMIT;