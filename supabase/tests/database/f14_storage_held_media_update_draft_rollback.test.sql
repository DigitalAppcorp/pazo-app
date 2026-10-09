-- PAZO F14 A2: candidate UPDATE guard DDL smoke only.
-- NOT applied to hosted DB. Running this test would create policy only
-- inside an explicit transaction and roll it back. Does not test HTTP races.
BEGIN;

DO $preflight$
BEGIN
 IF EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
     AND policyname='f14_media_claim_restrict_update'
 ) THEN
   RAISE EXCEPTION 'UPDATE guard already present; stop and reconcile before test';
 END IF;
END $preflight$;

CREATE POLICY f14_media_claim_restrict_update
ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.f14_storage_media_path_unclaimed(bucket_id,name))
WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name));

DO $check$
DECLARE v_count integer;
BEGIN
 SELECT count(*) INTO v_count FROM pg_policies
 WHERE schemaname='storage' AND tablename='objects'
 AND policyname='f14_media_claim_restrict_update'
 AND cmd='UPDATE' AND permissive='RESTRICTIVE'
 AND roles::text LIKE '%authenticated%'
 AND qual LIKE '%f14_storage_media_path_unclaimed%'
 AND with_check LIKE '%f14_storage_media_path_unclaimed%';
 IF v_count<>1 THEN
   RAISE EXCEPTION 'New UPDATE policy is not restrictive with USING+WITH CHECK';
 END IF;
 SELECT count(*) INTO v_count FROM pg_policies
 WHERE schemaname='storage' AND tablename='objects' AND policyname IN
 ('f14_media_claim_restrict_insert','f14_media_claim_restrict_delete',
  'post_photos_owner_insert','post_photos_owner_delete',
  'community_post_photo_member_insert',
  'community_post_photo_author_or_owner_delete');
 IF v_count<>6 THEN RAISE EXCEPTION 'Existing guard/owner policies changed or missing'; END IF;
END $check$;

ROLLBACK;
