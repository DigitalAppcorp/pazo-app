-- PAZO F14 A2 — APPLIED to hosted Supabase: 20261009055801.
-- Canonical migration; scoped to authenticated Storage copy-source SELECT on public moderated buckets.
-- Deny a held source during Storage COPY / S3 COPY / multipart-part COPY.
-- All other operations, including public views and normal list/read, retain
-- existing SELECT behavior. No Storage DELETE and no CDN effect.
-- Caveat: Public URL downloads, external copies, privileged service_role
-- writers and in-flight HTTP requests remain outside this policy.
BEGIN;
CREATE POLICY f14_held_media_copy_source_select
ON storage.objects
AS RESTRICTIVE FOR SELECT
TO authenticated
USING (
  NOT storage.allow_any_operation(ARRAY[
    'storage.object.copy',
    'storage.s3.object.copy',
    'storage.s3.upload.part_copy'
  ])
  OR public.f14_storage_media_path_unclaimed(bucket_id,name)
);
COMMIT;
