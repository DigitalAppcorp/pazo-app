-- ONLY locally committed synthetic concurrency fixtures, never a hosted database.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR EXISTS(SELECT 1 FROM auth.users WHERE email IS NULL OR email NOT LIKE 'f14-synthetic-%@example.invalid')
    OR to_regclass('f14_lab.test_case') IS NULL
 THEN RAISE EXCEPTION 'Refusing cleanup outside the synthetic laboratory'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users u WHERE NOT EXISTS(SELECT 1 FROM f14_lab.actors a WHERE a.owner_id=u.id))
    OR EXISTS(SELECT 1 FROM storage.objects o WHERE NOT EXISTS(
      SELECT 1 FROM f14_lab.test_case c WHERE o.bucket_id=c.bucket AND o.name IN (c.path,c.other_path)))
 THEN RAISE EXCEPTION 'Unexpected rows: synthetic cleanup refused'; END IF;
END $$;
TRUNCATE auth.users,public.communities,public.pets,public.posts,public.profiles,
 moderation_private.reports,moderation_private.content_restrictions,
 moderation_private.media_claims,storage.objects,storage.buckets CASCADE;
DROP SCHEMA f14_lab CASCADE;
COMMIT;
