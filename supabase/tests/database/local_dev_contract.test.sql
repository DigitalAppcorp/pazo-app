BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(15);

SELECT extensions.ok(
  (SELECT count(*) = 5 FROM storage.buckets WHERE id IN (
    'pet-avatars',
    'post-photos',
    'community-avatars',
    'community-post-photos',
    'pet-documents'
  )),
  'all five PAZO Storage buckets exist'
);

SELECT extensions.ok(
  (SELECT count(*) = 5
   FROM storage.buckets
   WHERE (id = 'pet-documents' AND public = false AND file_size_limit = 10485760)
      OR (id IN ('pet-avatars','post-photos','community-avatars','community-post-photos')
          AND public = true AND file_size_limit = 5242880)),
  'bucket visibility and file-size limits match the PAZO contract'
);

SELECT extensions.ok(
  (SELECT count(*) = 11 FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'
     AND policyname IN (
       'pet_avatars_owner_insert',
       'pet_avatars_owner_delete',
       'post_photos_owner_insert',
       'post_photos_owner_delete',
       'pet_documents_storage_insert',
       'pet_documents_storage_select',
       'pet_documents_storage_delete',
       'community_avatar_owner_insert',
       'community_avatar_owner_delete',
       'community_post_photo_member_insert',
       'community_post_photo_author_or_owner_delete'
     )),
  'all expected Storage policies exist'
);

SELECT extensions.ok(
  (SELECT count(*) = 11 FROM pg_policies
   WHERE schemaname = 'storage' AND tablename = 'objects'),
  'Storage has no unexpected object policies'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ),
  'every public table has RLS enabled'
);

SELECT extensions.ok(
  (SELECT c.relrowsecurity
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'storage' AND c.relname = 'objects'),
  'storage.objects has RLS enabled'
);

SELECT extensions.ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type IN ('TRUNCATE', 'TRIGGER', 'REFERENCES')
  ),
  'Data API roles have no structural table privileges'
);

SELECT extensions.ok(
  NOT has_column_privilege('authenticated', 'public.profiles', 'is_founder', 'UPDATE'),
  'authenticated users cannot grant themselves founder status'
);

SELECT extensions.ok(
  has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE'),
  'authenticated users can update their allowed profile fields'
);

SELECT extensions.ok(
  NOT has_function_privilege(
    'anon',
    'public.create_pet_profile(text,text,text,text,text,text[],text,text,text)',
    'EXECUTE'
  ),
  'anon cannot execute create_pet_profile'
);

SELECT extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_pet_profile(text,text,text,text,text,text[],text,text,text)',
    'EXECUTE'
  ),
  'authenticated can execute create_pet_profile'
);

SELECT extensions.ok(
  NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anon cannot call the auth trigger function directly'
);

SELECT extensions.ok(
  NOT has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE'),
  'authenticated cannot call the auth trigger function directly'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ),
  'auth.users creates a PAZO profile through the versioned trigger'
);

SELECT extensions.ok(
  EXISTS (
    SELECT 1
    FROM supabase_migrations.schema_migrations
    WHERE version = '20261008061800'
  ),
  'local development contract migration is recorded'
);

SELECT * FROM extensions.finish();

ROLLBACK;
