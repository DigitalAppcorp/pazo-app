BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(17);

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
  (SELECT count(*) = 5
   FROM storage.buckets
   WHERE (id = 'pet-documents'
          AND allowed_mime_types @> ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[]
          AND cardinality(allowed_mime_types) = 4)
      OR (id IN ('pet-avatars','post-photos','community-avatars','community-post-photos')
          AND allowed_mime_types @> ARRAY['image/jpeg','image/png','image/webp']::text[]
          AND cardinality(allowed_mime_types) = 3)),
  'bucket MIME allowlists match the PAZO contract'
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
  NOT EXISTS (
    SELECT 1
    FROM (VALUES
      ('authenticated', 'public.activate_lost_pet_alert(uuid,text,timestamptz,text)'),
      ('authenticated', 'public.archive_care_item(uuid)'),
      ('authenticated', 'public.begin_delete_pet_document(uuid)'),
      ('authenticated', 'public.begin_pet_document_upload(uuid,text,text,text,text,bigint)'),
      ('authenticated', 'public.cancel_delete_pet_document(uuid)'),
      ('authenticated', 'public.cancel_pet_document_upload(uuid)'),
      ('authenticated', 'public.complete_care_item(uuid,date,time without time zone)'),
      ('authenticated', 'public.create_community(text,text,text,text,text,text,uuid)'),
      ('authenticated', 'public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'),
      ('authenticated', 'public.finalize_delete_pet_document(uuid)'),
      ('authenticated', 'public.finalize_pet_document_upload(uuid)'),
      ('authenticated', 'public.get_pet_founder_status(uuid)'),
      ('authenticated', 'public.get_public_pet_rescue_profile(uuid)'),
      ('authenticated', 'public.get_recommended_posts(uuid,integer)'),
      ('authenticated', 'public.get_recommended_posts_page(uuid,integer,integer)'),
      ('authenticated', 'public.register_interaction_signal(uuid,uuid,text)'),
      ('authenticated', 'public.resolve_lost_pet_alert(uuid)'),
      ('authenticated', 'public.rotate_pet_public_link(uuid)'),
      ('authenticated', 'public.submit_pet_sighting(uuid,text,text,text,text)'),
      ('authenticated', 'public.try_finalize_delete_pet_document(uuid)'),
      ('authenticated', 'public.undo_care_completion(uuid)'),
      ('authenticated', 'public.update_pet_profile(uuid,text,text,text,text,text,text,text,text,text[],text,text)'),
      ('anon', 'public.get_pet_founder_status(uuid)'),
      ('anon', 'public.get_public_pet_rescue_profile(uuid)'),
      ('anon', 'public.submit_pet_sighting(uuid,text,text,text,text)')
    ) AS required(role_name, signature)
    CROSS JOIN LATERAL (
      SELECT to_regprocedure(required.signature) AS procedure_oid
    ) resolved
    WHERE resolved.procedure_oid IS NULL
       OR NOT has_function_privilege(required.role_name, resolved.procedure_oid, 'EXECUTE')
  ),
  'all frontend RPCs retain their intended execution grants'
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
