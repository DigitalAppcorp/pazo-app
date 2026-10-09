-- F14 A2 refusal tests against installed backend; all simulated metadata rolled back.
BEGIN;
DO $seed$
DECLARE v_owner uuid; v_pet uuid; v_post uuid; v_filename text; v_path text; v_object uuid;
BEGIN
 SELECT user_id INTO STRICT v_owner FROM moderation_private.moderator_grants LIMIT 1;
 IF (SELECT count(*) FROM moderation_private.moderator_grants)<>1 THEN RAISE EXCEPTION 'ambiguous moderator'; END IF;
 PERFORM set_config('request.jwt.claim.sub',v_owner::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 INSERT INTO public.pets(owner_id,name,species)
 VALUES(v_owner,'F14 MEDIA LEASE ROLLBACK','perro') RETURNING id INTO v_pet;
 v_filename:=gen_random_uuid()::text||'.webp';
 v_path:=v_owner::text||'/'||v_pet::text||'/'||v_filename;
 INSERT INTO public.posts(user_id,pet_id,text,photo_url)
 VALUES(v_owner,v_pet,'F14 MEDIA LEASE ROLLBACK',
   'https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/'||v_path)
 RETURNING id INTO v_post;
 INSERT INTO storage.objects(bucket_id,name,owner,owner_id,version,metadata)
 VALUES('post-photos',v_path,v_owner,v_owner::text,'f14-test-version','{"size":123,"mimetype":"image/webp"}')
 RETURNING id INTO v_object;
 INSERT INTO moderation_private.reports(reporter_user_id,target_kind,target_id,target_owner_user_id,reason,status,resolved_at,resolved_by)
 VALUES(v_owner,'feed_post',v_post,v_owner,'spam','removed',now(),v_owner);
 INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,applied_by,media_status)
 SELECT 'feed_post',v_post,r.id,v_owner,'pending_review'
 FROM moderation_private.reports r WHERE r.target_id=v_post AND r.target_kind='feed_post';
 PERFORM set_config('pazo.f14.lease.post',v_post::text,true);
 PERFORM set_config('pazo.f14.lease.object',v_object::text,true);
END $seed$;

-- Shared reference must be rejected.
INSERT INTO public.posts(user_id,pet_id,text,photo_url)
SELECT user_id,pet_id,'F14 duplicate media ref',photo_url
FROM public.posts WHERE id=current_setting('pazo.f14.lease.post')::uuid;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $shared$
BEGIN
 BEGIN
  PERFORM public.f14_prepare_media_claim('feed_post',current_setting('pazo.f14.lease.post')::uuid);
  RAISE EXCEPTION 'FAIL shared reference accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $shared$;
RESET ROLE;
DELETE FROM public.posts WHERE text='F14 duplicate media ref'
  AND pet_id=(SELECT pet_id FROM public.posts WHERE id=current_setting('pazo.f14.lease.post')::uuid);
-- Wrong project host rejected.
UPDATE public.posts SET photo_url=replace(photo_url,'https://mrybvqdebbgcayuvgkkr.supabase.co/','https://other-project.supabase.co/')
WHERE id=current_setting('pazo.f14.lease.post')::uuid;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $host$
BEGIN
 BEGIN
  PERFORM public.f14_prepare_media_claim('feed_post',current_setting('pazo.f14.lease.post')::uuid);
  RAISE EXCEPTION 'FAIL foreign host accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $host$;
RESET ROLE;
UPDATE public.posts SET photo_url='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/'||
(SELECT name FROM storage.objects WHERE id=current_setting('pazo.f14.lease.object')::uuid)
WHERE id=current_setting('pazo.f14.lease.post')::uuid;
-- Marker means object must not be issued claim.
UPDATE storage.objects SET is_delete_marker=true WHERE id=current_setting('pazo.f14.lease.object')::uuid;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $marker$
BEGIN
 BEGIN
  PERFORM public.f14_prepare_media_claim('feed_post',current_setting('pazo.f14.lease.post')::uuid);
  RAISE EXCEPTION 'FAIL tombstone object accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $marker$;
ROLLBACK;