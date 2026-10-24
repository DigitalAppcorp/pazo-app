-- PAZO F14 A2 — STAGED SECURITY MIGRATION, NOT YET APPLIED.
-- The old function set media_status='purged' without any object/claim/version
-- evidence. Disable that legacy entry point instead of trusting service_role.
-- No Storage API action, moderation status mutation, or data cleanup occurs.
-- A NEW separately reviewed claim/object/version-bound confirmation protocol
-- must be implemented if media deletion is later made safe.
BEGIN;
CREATE OR REPLACE FUNCTION public.f14_confirm_media_cleanup(p_kind text,p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $f14_disable$
BEGIN
 RAISE EXCEPTION 'Legacy media cleanup confirmation disabled: exact-object verification required'
 USING ERRCODE='42501';
END;
$f14_disable$;
REVOKE ALL ON FUNCTION public.f14_confirm_media_cleanup(text,uuid)
FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
