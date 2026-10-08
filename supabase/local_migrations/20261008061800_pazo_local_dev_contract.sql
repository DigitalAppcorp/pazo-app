BEGIN;

-- Recreate the auth trigger omitted by schema-only baselines that exclude auth.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user()
FROM PUBLIC, anon, authenticated, service_role;

-- The local CLI used to auto-grant broad access to new public objects. Reset the
-- live ACLs and keep future objects closed until a migration explicitly grants them.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public/authenticated RPC allowlist.
GRANT EXECUTE ON FUNCTION public.activate_lost_pet_alert(uuid,text,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_care_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_delete_pet_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_pet_document_upload(uuid,text,text,text,text,bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_delete_pet_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pet_document_upload(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_care_item(uuid,date,time without time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community(text,text,text,text,text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pet_profile(text,text,text,text,text,text[],text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_delete_pet_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_pet_document_upload(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pet_founder_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_pet_rescue_profile(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommended_posts(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommended_posts_page(uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_interaction_signal(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_lost_pet_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_pet_public_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_pet_sighting(uuid,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_finalize_delete_pet_document(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_care_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pet_profile(uuid,text,text,text,text,text,text,text,text,text[],text,text) TO authenticated;

-- Table/column allowlist copied from PAZO's production-derived baseline.
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT (pet_id, location, text, photo_url, tags) ON public.posts TO authenticated;

GRANT SELECT ON public.care_completions TO authenticated;
GRANT SELECT ON public.care_items TO authenticated;
GRANT INSERT (pet_id, title, category, due_date, due_time, timezone, recurrence, reminder_days_before, notes),
      UPDATE (title, category, due_date, due_time, timezone, recurrence, reminder_days_before, notes)
ON public.care_items TO authenticated;

GRANT SELECT ON public.communities TO authenticated;
GRANT INSERT (name, description, category, species, zone, image_url, rules),
      UPDATE (name, description, category, species, zone, image_url, image_storage_path, rules, status)
ON public.communities TO authenticated;

GRANT SELECT, DELETE ON public.community_memberships TO authenticated;
GRANT INSERT (community_id, display_pet_id, role), UPDATE (display_pet_id)
ON public.community_memberships TO authenticated;

GRANT SELECT, DELETE ON public.community_post_comments TO authenticated;
GRANT INSERT (post_id, author_pet_id, body) ON public.community_post_comments TO authenticated;

GRANT SELECT, DELETE ON public.community_post_likes TO authenticated;
GRANT INSERT (post_id, actor_pet_id) ON public.community_post_likes TO authenticated;

GRANT SELECT, DELETE ON public.community_posts TO authenticated;
GRANT INSERT (community_id, author_pet_id, body, photo_url, photo_storage_path)
ON public.community_posts TO authenticated;

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.interactions TO authenticated;
GRANT SELECT ON public.lost_pet_alerts TO authenticated;

GRANT SELECT ON public.module_validation_intents TO authenticated;
GRANT INSERT (module_key, intent_key, source), UPDATE (intent_key, source)
ON public.module_validation_intents TO authenticated;

GRANT SELECT, INSERT ON public.module_validation_interests TO authenticated;
GRANT INSERT ON public.module_validation_views TO authenticated;

GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

GRANT SELECT ON public.pet_documents TO authenticated;
GRANT UPDATE (title, category) ON public.pet_documents TO authenticated;

GRANT SELECT (id, place_id, pet_id, visible, checked_in_at, expires_at, ended_at),
      INSERT (place_id, pet_id, visible),
      UPDATE (visible, ended_at)
ON public.pet_place_checkins TO authenticated;

GRANT SELECT (place_id, visible_pet_id, expires_at) ON public.pet_place_presence TO authenticated;
GRANT SELECT ON public.pet_places TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_private_details TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pet_private_metrics TO authenticated;
GRANT SELECT ON public.pet_public_links TO authenticated;
GRANT SELECT ON public.pet_sightings TO authenticated;

GRANT SELECT (id, name, species, age, photo_url, created_at, bio, breed, gender, is_lost)
ON public.pets TO anon;
GRANT SELECT (id, owner_id, name, species, age, photo_url, created_at, bio, breed, gender, is_lost, last_seen_location),
      INSERT (owner_id, name, species, age, photo_url, bio, breed, gender, is_lost, last_seen_location),
      UPDATE (name, species, age, photo_url, bio, breed, gender, is_lost, last_seen_location)
ON public.pets TO authenticated;

GRANT INSERT (name, category, address, zone, note) ON public.place_suggestions TO authenticated;
GRANT INSERT (session_id, event_type, place_id, category) ON public.place_usage_events TO authenticated;

GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;

GRANT SELECT (id, username, avatar_url, is_founder, created_at) ON public.profiles TO anon, authenticated;
GRANT UPDATE (username, avatar_url, onboarding_completed) ON public.profiles TO authenticated;

GRANT INSERT (session_id, event_type, result_type, filter_type, had_results)
ON public.search_usage_events TO authenticated;

-- Storage buckets are infrastructure data and must exist after every local replay.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pet-avatars', 'pet-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('post-photos', 'post-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('community-avatars', 'community-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('community-post-photos', 'community-post-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('pet-documents', 'pet-documents', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS pet_avatars_owner_insert ON storage.objects;
DROP POLICY IF EXISTS pet_avatars_owner_delete ON storage.objects;
DROP POLICY IF EXISTS post_photos_owner_insert ON storage.objects;
DROP POLICY IF EXISTS post_photos_owner_delete ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_insert ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_select ON storage.objects;
DROP POLICY IF EXISTS pet_documents_storage_delete ON storage.objects;
DROP POLICY IF EXISTS community_avatar_owner_insert ON storage.objects;
DROP POLICY IF EXISTS community_avatar_owner_delete ON storage.objects;
DROP POLICY IF EXISTS community_post_photo_member_insert ON storage.objects;
DROP POLICY IF EXISTS community_post_photo_author_or_owner_delete ON storage.objects;

CREATE POLICY pet_avatars_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pet-avatars'
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY pet_avatars_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'pet-avatars'
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY post_photos_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-photos'
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY post_photos_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'post-photos'
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY pet_documents_storage_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  objects.bucket_id = 'pet-documents'
  AND array_length(storage.foldername(objects.name), 1) = 2
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets pet ON pet.id = d.pet_id
    WHERE d.storage_path = objects.name
      AND d.status = 'uploading'
      AND d.pet_id::text = (storage.foldername(objects.name))[2]
      AND pet.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_storage_select ON storage.objects
FOR SELECT TO authenticated
USING (
  objects.bucket_id = 'pet-documents'
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets pet ON pet.id = d.pet_id
    WHERE d.storage_path = objects.name
      AND d.status IN ('active', 'deleting')
      AND pet.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY pet_documents_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  objects.bucket_id = 'pet-documents'
  AND (storage.foldername(objects.name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.pet_documents d
    JOIN public.pets pet ON pet.id = d.pet_id
    WHERE d.storage_path = objects.name
      AND d.status IN ('uploading', 'deleting')
      AND pet.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_avatar_owner_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-avatars'
  AND array_length(storage.foldername(objects.name), 1) = 2
  AND (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_avatar_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'community-avatars'
  AND (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_post_photo_member_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-post-photos'
  AND array_length(storage.foldername(objects.name), 1) = 2
  AND (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    JOIN public.community_memberships m ON m.community_id = c.id
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND c.status = 'active'
      AND m.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_post_photo_author_or_owner_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'community-post-photos'
  AND (
    (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
);

COMMIT;
