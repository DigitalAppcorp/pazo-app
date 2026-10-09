-- F14 A2: installed legacy confirmation is disabled; read-only verification.
BEGIN;
DO $check$
BEGIN
 IF has_function_privilege('anon','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')
 OR has_function_privilege('service_role','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Legacy media confirmation is still executable'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='f14_confirm_media_cleanup'
   AND pg_get_functiondef(p.oid) LIKE '%Legacy media cleanup confirmation disabled%'
 ) THEN RAISE EXCEPTION 'Legacy function body is not parked'; END IF;
END $check$;
SET LOCAL ROLE service_role;
DO $deny$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f14_confirm_media_cleanup('feed_post',gen_random_uuid());
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Service role must not invoke legacy purged confirmation'; END IF;
END $deny$;
RESET ROLE;
ROLLBACK;
