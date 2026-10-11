\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$
DECLARE t regclass; f regprocedure; r text;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Not the isolated laboratory'; END IF;
 FOREACH f IN ARRAY ARRAY[
  'moderation_private.f14_media_probe(text,uuid)'::regprocedure,
  'public.f14_moderation_media_gate(text,uuid,text,text,text,text)'::regprocedure,
  'moderation_private.f14_guard_held_media_reference()'::regprocedure,
  'moderation_private.f14_guard_held_storage_mutation()'::regprocedure
 ] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=f AND prosecdef AND provolatile='v'
     AND proconfig @> ARRAY['search_path=""'] AND pg_get_userbyid(proowner)='postgres')
  THEN RAISE EXCEPTION 'Unsafe owner/security/search_path/volatility'; END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['public.posts'::regclass,'public.community_posts'::regclass,
    'public.pets'::regclass,'public.communities'::regclass,'public.profiles'::regclass] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=t AND tgname='f14_guard_held_media_reference'
      AND tgenabled='O' AND NOT tgisinternal AND tgfoid='moderation_private.f14_guard_held_media_reference()'::regprocedure)
  THEN RAISE EXCEPTION 'Reference barrier trigger missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=t AND relrowsecurity)
  THEN RAISE EXCEPTION 'Reference RLS lost'; END IF;
 END LOOP;
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(r,'moderation_private.f14_guard_held_media_reference()','EXECUTE')
     OR has_function_privilege(r,'moderation_private.f14_guard_held_storage_mutation()','EXECUTE')
     OR has_function_privilege(r,'moderation_private.f14_local_url_points_to_object(text,text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'Private helper privilege widened'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='storage.objects'::regclass
     AND tgname='f14_guard_held_storage_mutation' AND tgenabled='O' AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'Storage barrier missing'; END IF;
END $$;
ROLLBACK;
