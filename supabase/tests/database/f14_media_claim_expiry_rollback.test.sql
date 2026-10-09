-- F14 A2 lease expiry against installed version 20261009014616.
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
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $verify$
DECLARE v_post uuid:=current_setting('pazo.f14.lease.post')::uuid; v_first jsonb; v_second jsonb; v_claim uuid;
BEGIN
 v_first:=public.f14_prepare_media_claim('feed_post',v_post);
 IF v_first->>'status'<>'candidate_only' THEN RAISE EXCEPTION 'unexpected candidate state'; END IF;
 v_second:=public.f14_prepare_media_claim('feed_post',v_post);
 IF v_first IS DISTINCT FROM v_second THEN RAISE EXCEPTION 'not idempotent'; END IF;
 v_claim:=(v_first->>'claim_id')::uuid;
 IF NOT public.f14_recheck_media_claim(v_claim) THEN RAISE EXCEPTION 'recheck should pass'; END IF;
 PERFORM set_config('pazo.f14.lease.claim',v_claim::text,true);
END $verify$;
RESET ROLE;
UPDATE moderation_private.media_claims
SET created_at=now()-interval '10 minutes', expires_at=now()-interval '5 minutes'
WHERE claim_id=current_setting('pazo.f14.lease.claim')::uuid;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $drift$
BEGIN
 IF public.f14_recheck_media_claim(current_setting('pazo.f14.lease.claim')::uuid)
 THEN RAISE EXCEPTION 'Changed source incorrectly accepted'; END IF;
 IF public.f14_recheck_media_claim(current_setting('pazo.f14.lease.claim')::uuid)
 THEN RAISE EXCEPTION 'Invalidated claim incorrectly reopened'; END IF;
END $drift$;
ROLLBACK;