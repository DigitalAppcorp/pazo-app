-- F14 A2 reversible safety regression, no media deletion.
BEGIN;
CREATE OR REPLACE FUNCTION public.f14_confirm_media_cleanup(p_kind text,p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f14_disable$
BEGIN
 RAISE EXCEPTION 'Legacy media cleanup confirmation disabled: exact-object verification required'
 USING ERRCODE='42501';
END;
$f14_disable$;
REVOKE ALL ON FUNCTION public.f14_confirm_media_cleanup(text,uuid)
FROM PUBLIC,anon,authenticated,service_role;
DO $grants$
BEGIN
 IF has_function_privilege('anon','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')
 OR has_function_privilege('service_role','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Legacy confirmation remained executable';
 END IF;
END $grants$;
DO $owner_test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f14_confirm_media_cleanup('feed_post',gen_random_uuid());
 EXCEPTION WHEN insufficient_privilege THEN
  denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Owner call to legacy function must fail closed'; END IF;
END $owner_test$;
SET LOCAL ROLE service_role;
DO $service_test$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f14_confirm_media_cleanup('feed_post',gen_random_uuid());
 EXCEPTION WHEN insufficient_privilege THEN
  denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Service role legacy entry must be disabled'; END IF;
END $service_test$;
RESET ROLE;
ROLLBACK;
