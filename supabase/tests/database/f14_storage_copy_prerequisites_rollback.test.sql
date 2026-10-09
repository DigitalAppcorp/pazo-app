-- PAZO F14 A2 negative-capability test: illustrates COPY prerequisites on
-- held public media. This is NOT a Storage HTTP copy and creates NO file bytes.
-- A public SELECT source + unheld owned INSERT destination are currently allowed.
-- Transactional metadata only; fully rolled back.
BEGIN;
DO $fixture$
DECLARE uid uuid; rid uuid; obj uuid:=gen_random_uuid(); source_path text; dest_path text;
BEGIN
 SELECT user_id INTO STRICT uid FROM moderation_private.moderator_grants LIMIT 1;
 source_path:=uid::text||'/f14-copy-source-'||gen_random_uuid()||'.png';
 dest_path:=uid::text||'/f14-copy-dest-'||gen_random_uuid()||'.png';
 INSERT INTO moderation_private.reports
 (reporter_user_id,target_kind,target_id,target_owner_user_id,reason,status,resolved_at,resolved_by)
 VALUES(uid,'feed_post',gen_random_uuid(),uid,'spam','removed',now(),uid) RETURNING id INTO rid;
 INSERT INTO storage.objects(id,bucket_id,name,owner_id,version)
 VALUES(obj,'post-photos',source_path,uid::text,'1');
 INSERT INTO moderation_private.media_claims
 (target_kind,target_id,report_id,bucket,storage_object_id,snapshot,status)
 VALUES('feed_post',gen_random_uuid(),rid,'post-photos',obj,jsonb_build_object('path',source_path),'held');
 PERFORM set_config('pazo.f14.qa.uid',uid::text,true);
 PERFORM set_config('pazo.f14.qa.source',source_path,true);
 PERFORM set_config('pazo.f14.qa.destination',dest_path,true);
END $fixture$;
SELECT set_config('request.jwt.claim.sub',current_setting('pazo.f14.qa.uid'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $proof$
DECLARE n int;
BEGIN
 IF public.f14_storage_media_path_unclaimed('post-photos',current_setting('pazo.f14.qa.source')) THEN
  RAISE EXCEPTION 'Source should be held';
 END IF;
 SELECT count(*) INTO n FROM storage.objects
 WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.source');
 IF n<>1 THEN RAISE EXCEPTION 'Held PUBLIC source SELECT should be visible under existing policy: %',n; END IF;
 INSERT INTO storage.objects(bucket_id,name,owner_id,version)
 VALUES('post-photos',current_setting('pazo.f14.qa.destination'),current_setting('pazo.f14.qa.uid'),'1');
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'Unheld destination INSERT expected under owner grant: %',n; END IF;
END $proof$;
RESET ROLE;
ROLLBACK;