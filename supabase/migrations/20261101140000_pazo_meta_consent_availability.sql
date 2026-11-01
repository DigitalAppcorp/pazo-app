-- #169 The consent screen asks this first, so a suspended Meta release never
-- offers an acceptance that cannot be saved. Returns only the gate's state.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE FUNCTION public.pazo_meta_consent_available()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $available$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM marketing_private.meta_release_gate_candidate g
  WHERE g.singleton AND g.enabled
 )
$available$;
REVOKE ALL ON FUNCTION public.pazo_meta_consent_available() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_meta_consent_available() TO authenticated;
COMMIT;
