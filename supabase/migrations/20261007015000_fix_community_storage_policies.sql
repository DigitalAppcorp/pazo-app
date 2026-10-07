DROP POLICY IF EXISTS community_avatar_owner_insert ON storage.objects;
DROP POLICY IF EXISTS community_avatar_owner_delete ON storage.objects;
DROP POLICY IF EXISTS community_post_photo_member_insert ON storage.objects;
DROP POLICY IF EXISTS community_post_photo_author_or_owner_delete ON storage.objects;

CREATE POLICY community_avatar_owner_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-avatars'
  AND array_length(storage.foldername(objects.name), 1) = 2
  AND (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_avatar_owner_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-avatars'
  AND (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.communities c
    WHERE c.id::text = (storage.foldername(objects.name))[1]
      AND c.owner_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY community_post_photo_member_insert
ON storage.objects
FOR INSERT
TO authenticated
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

CREATE POLICY community_post_photo_author_or_owner_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-post-photos'
  AND (
    (storage.foldername(objects.name))[2] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.communities c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.owner_user_id = (SELECT auth.uid())
    )
  )
);
