-- PAZO F14 A2 installed storage guard regression, no persistent writes.
BEGIN;
DO $fixture$
DECLARE v_mod uuid; v_report uuid; v_claim uuid; v_target uuid:=gen_random_uuid();
 v_path text:='f14-safe-gate/temporary-object.webp';
BEGIN
 SELECT user_id INTO STRICT v_mod FROM moderation_private.moderator_grants LIMIT 1;
 INSERT INTO moderation_private.reports
  (reporter_user_id,target_kind,target_id,target_owner_user_id,reason,status,resolved_at,resolved_by)
 VALUES (v_mod,'feed_post',v_target,v_mod,'spam','removed',now(),v_mod)
 RETURNING id INTO v_report;
 INSERT INTO moderation_private.media_claims
  (target_kind,target_id,report_id,bucket,storage_object_id,snapshot,status)
 VALUES ('feed_post',v_target,v_report,'post-photos',gen_random_uuid(),
         jsonb_build_object('path',v_path),'held')
 RETURNING claim_id INTO v_claim;
 PERFORM set_config('pazo.f14.policy.path',v_path,true);
 PERFORM set_config('pazo.f14.policy.claim',v_claim::text,true);
END $fixture$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $checks$
BEGIN
 IF public.f14_storage_media_path_unclaimed('post-photos',current_setting('pazo.f14.policy.path')) THEN
   RAISE EXCEPTION 'Held object must be blocked';
 END IF;
 IF NOT public.f14_storage_media_path_unclaimed('post-photos','unrelated/new-file.webp') THEN
   RAISE EXCEPTION 'Unrelated object incorrectly blocked';
 END IF;
 IF NOT public.f14_storage_media_path_unclaimed('pet-avatars',current_setting('pazo.f14.policy.path')) THEN
   RAISE EXCEPTION 'Unrelated bucket incorrectly blocked';
 END IF;
 IF NOT public.f14_storage_media_path_unclaimed('community-post-photos',current_setting('pazo.f14.policy.path')) THEN
   RAISE EXCEPTION 'Other public bucket incorrectly blocked';
 END IF;
END $checks$;
RESET ROLE;
UPDATE moderation_private.media_claims SET expires_at=now()-interval '1 minute',created_at=now()-interval '10 minutes'
WHERE claim_id=current_setting('pazo.f14.policy.claim')::uuid;
SET LOCAL ROLE authenticated;
DO $expiration$
BEGIN
 IF NOT public.f14_storage_media_path_unclaimed('post-photos',current_setting('pazo.f14.policy.path')) THEN
   RAISE EXCEPTION 'Expired claim must not retain row policy block';
 END IF;
END $expiration$;
RESET ROLE;
DO $invariants$
DECLARE c int;
BEGIN
 SELECT count(*) INTO c FROM pg_policies
 WHERE schemaname='storage' AND tablename='objects'
   AND policyname IN ('f14_media_claim_restrict_insert','f14_media_claim_restrict_delete')
   AND permissive='RESTRICTIVE' AND roles::text LIKE '%authenticated%';
 IF c<>2 THEN RAISE EXCEPTION 'Restrictive policies not installed properly: %',c; END IF;
 SELECT count(*) INTO c FROM pg_policies
 WHERE schemaname='storage' AND tablename='objects'
   AND policyname IN ('post_photos_owner_insert','post_photos_owner_delete','community_post_photo_member_insert','community_post_photo_author_or_owner_delete');
 IF c<>4 THEN RAISE EXCEPTION 'Existing allow policies must be preserved'; END IF;
END $invariants$;
ROLLBACK;