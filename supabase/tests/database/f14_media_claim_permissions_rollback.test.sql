-- F14 A2 installed claim RPC regression. Requires canonical migration 20261009014616.
-- Synthetic fixture and changes are rolled back; no Storage byte deletion.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $deny_user$
BEGIN
  BEGIN
    PERFORM public.f14_prepare_media_claim('feed_post',gen_random_uuid());
    RAISE EXCEPTION 'Authenticated should not execute claim preparation';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.f14_recheck_media_claim(gen_random_uuid());
    RAISE EXCEPTION 'Authenticated should not execute recheck';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny_user$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',true);
DO $deny_anon$
BEGIN
  BEGIN
    PERFORM public.f14_prepare_media_claim('feed_post',gen_random_uuid());
    RAISE EXCEPTION 'Anon should not execute claim preparation';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.f14_recheck_media_claim(gen_random_uuid());
    RAISE EXCEPTION 'Anon should not execute recheck';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny_anon$;
RESET ROLE;
DO $access$
BEGIN
 IF has_function_privilege('anon','public.f14_prepare_media_claim(text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.f14_prepare_media_claim(text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.f14_recheck_media_claim(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f14_prepare_media_claim(text,uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f14_recheck_media_claim(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected claim privilege';
 END IF;
 IF has_table_privilege('authenticated','moderation_private.media_claims','SELECT')
 OR has_table_privilege('service_role','moderation_private.media_claims','SELECT') THEN
   RAISE EXCEPTION 'Private claims table exposed';
 END IF;
END $access$;
ROLLBACK;