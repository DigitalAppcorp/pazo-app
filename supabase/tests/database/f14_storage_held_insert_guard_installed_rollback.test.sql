-- F14 A2 hosted RLS INSERT + DELETE-path helper checks.
-- No storage.objects DELETE (Storage API only); no bytes; BEGIN/ROLLBACK.
BEGIN;
DO $seed$
DECLARE uid uuid; rid uuid; target uuid:=gen_random_uuid();
  held text; free text;
BEGIN
 SELECT user_id INTO STRICT uid FROM moderation_private.moderator_grants LIMIT 1;
 held:=uid::text||'/f14-claimed-path-'||gen_random_uuid()||'.png';
 free:=uid::text||'/f14-free-path-'||gen_random_uuid()||'.png';
 INSERT INTO moderation_private.reports
 (reporter_user_id,target_kind,target_id,target_owner_user_id,reason,status,resolved_at,resolved_by)
 VALUES(uid,'feed_post',target,uid,'spam','removed',now(),uid) RETURNING id INTO rid;
 INSERT INTO moderation_private.media_claims
 (target_kind,target_id,report_id,bucket,storage_object_id,snapshot,status)
 VALUES('feed_post',target,rid,'post-photos',gen_random_uuid(),jsonb_build_object('path',held),'held');
 PERFORM set_config('pazo.f14.qa.uid',uid::text,true);
 PERFORM set_config('pazo.f14.qa.held',held,true);
 PERFORM set_config('pazo.f14.qa.free',free,true);
END $seed$;
SELECT set_config('request.jwt.claim.sub',current_setting('pazo.f14.qa.uid'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $checks$
DECLARE denied boolean:=false; n int;
BEGIN
 IF public.f14_storage_media_path_unclaimed('post-photos',current_setting('pazo.f14.qa.held')) THEN
  RAISE EXCEPTION 'Held path should be blocked by existing DELETE and INSERT guards';
 END IF;
 IF NOT public.f14_storage_media_path_unclaimed('post-photos',current_setting('pazo.f14.qa.free')) THEN
  RAISE EXCEPTION 'Free path should remain allowed';
 END IF;
 BEGIN
  INSERT INTO storage.objects(bucket_id,name,owner_id,version)
  VALUES('post-photos',current_setting('pazo.f14.qa.held'),current_setting('pazo.f14.qa.uid'),'1');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'INSERT to held path must raise 42501'; END IF;
 INSERT INTO storage.objects(bucket_id,name,owner_id,version)
 VALUES('post-photos',current_setting('pazo.f14.qa.free'),current_setting('pazo.f14.qa.uid'),'1');
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'INSERT free path failed: %',n; END IF;
END $checks$;
RESET ROLE;
ROLLBACK;