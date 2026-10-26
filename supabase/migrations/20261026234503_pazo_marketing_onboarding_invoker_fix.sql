-- Issue130 hosted E2E found A03 403: the invoker may UPDATE the private
-- onboarding flag but may not SELECT it. Remove only the redundant read.
-- Keep SECURITY INVOKER, RLS, ownership, column grants and all other behavior.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $fix$
DECLARE old_def text;new_def text;old_acl text;
BEGIN
 SELECT pg_get_functiondef(p.oid),p.proacl::text INTO old_def,old_acl
 FROM pg_proc p WHERE p.oid='public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure;
 IF md5(old_def)<>'ca36e0d0f9e0e8170fe442aebd1d38fd' THEN RAISE EXCEPTION 'A03 baseline differs'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure AND prosecdef)
 THEN RAISE EXCEPTION 'A03 must remain invoker'; END IF;
 new_def:=replace(old_def,'WHERE id=v_user_id AND onboarding_completed IS DISTINCT FROM true','WHERE id=v_user_id');
 IF new_def=old_def THEN RAISE EXCEPTION 'Expected private-flag predicate missing'; END IF;
 EXECUTE new_def;
 IF (SELECT proacl::text FROM pg_proc WHERE oid='public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure) IS DISTINCT FROM old_acl
 THEN RAISE EXCEPTION 'A03 ACL changed'; END IF;
END $fix$;
COMMIT;
