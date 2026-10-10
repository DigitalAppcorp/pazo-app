-- F14 A3: server-only legacy readiness, NOT APPLIED.
-- This does not approve deletion, archive evidence, Storage or Auth.
BEGIN;
DO $a3_legacy_guard$
BEGIN
 RAISE EXCEPTION 'A3 LEGACY READINESS DRAFT ONLY: separate PO migration gate required';
END
$a3_legacy_guard$;

CREATE OR REPLACE FUNCTION public.f14_a3_worker_legacy_clear(p_job_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_legacy$
DECLARE v_uid uuid; v_state text;
BEGIN
 IF COALESCE(current_setting('request.jwt.claim.role',true),'')<>'service_role' THEN
   RAISE EXCEPTION 'Worker access required' USING ERRCODE='42501';
 END IF;
 SELECT user_id,status INTO v_uid,v_state
 FROM account_private.deletion_jobs WHERE id=p_job_id;
 IF v_uid IS NULL OR v_state<>'reviewing' THEN
   RAISE EXCEPTION 'Review job unavailable' USING ERRCODE='42501';
 END IF;
 -- A JSON object/string/nonempty array must be reconciled; cannot invent authors.
 RETURN NOT EXISTS(
   SELECT 1 FROM public.posts p WHERE p.user_id=v_uid
   AND NOT (p.comments IS NULL OR p.comments='null'::jsonb
     OR p.comments='[]'::jsonb)
 );
END
$a3_legacy$;
REVOKE ALL ON FUNCTION public.f14_a3_worker_legacy_clear(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_worker_legacy_clear(uuid) TO service_role;
COMMIT;
