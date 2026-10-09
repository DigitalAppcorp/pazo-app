-- PAZO F14 A2: DRAFT COPY source guard reversible proof.
-- Pure synthetic DB metadata. No Storage bytes, copy API, or delete.
BEGIN;
DO $pre$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage'
 AND tablename='objects' AND policyname='f14_held_media_copy_source_select') THEN
  RAISE EXCEPTION 'Copy guard installed already, use installed test instead';
 END IF;
END $pre$;
CREATE POLICY f14_held_media_copy_source_select
ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING (
 NOT storage.allow_any_operation(ARRAY[
  'storage.object.copy','storage.s3.object.copy','storage.s3.upload.part_copy'
 ])
 OR public.f14_storage_media_path_unclaimed(bucket_id,name)
);
DO $fixture$
DECLARE uid uuid; rid uuid; held text; free text;
BEGIN
 SELECT user_id INTO STRICT uid FROM moderation_private.moderator_grants LIMIT 1;
 held:=uid::text||'/f14-copy-held-'||gen_random_uuid()||'.png';
 free:=uid::text||'/f14-copy-free-'||gen_random_uuid()||'.png';
 INSERT INTO moderation_private.reports(reporter_user_id,target_kind,target_id,target_owner_user_id,
 reason,status,resolved_at,resolved_by)
 VALUES(uid,'feed_post',gen_random_uuid(),uid,'spam','removed',now(),uid) RETURNING id INTO rid;
 INSERT INTO storage.objects(id,bucket_id,name,owner_id,version)
 VALUES(gen_random_uuid(),'post-photos',held,uid::text,'1'),
       (gen_random_uuid(),'post-photos',free,uid::text,'1');
 INSERT INTO moderation_private.media_claims(target_kind,target_id,report_id,bucket,
 storage_object_id,snapshot,status)
 VALUES('feed_post',gen_random_uuid(),rid,'post-photos',gen_random_uuid(),
 jsonb_build_object('path',held),'held');
 PERFORM set_config('pazo.f14.qa.held',held,true);
 PERFORM set_config('pazo.f14.qa.free',free,true);
 PERFORM set_config('pazo.f14.qa.uid',uid::text,true);
END $fixture$;
SELECT set_config('request.jwt.claim.sub',current_setting('pazo.f14.qa.uid'),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $checks$
DECLARE op text; cnt integer;
BEGIN
 FOR op IN SELECT unnest(ARRAY[
  'storage.object.copy','object.copy','storage.s3.object.copy',
  'storage.s3.upload.part_copy'
 ]) LOOP
  PERFORM set_config('storage.operation',op,true);
  SELECT count(*) INTO cnt FROM storage.objects
   WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.held');
  IF cnt<>0 THEN RAISE EXCEPTION 'COPY % exposed held source',op; END IF;
  SELECT count(*) INTO cnt FROM storage.objects
   WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.free');
  IF cnt<>1 THEN RAISE EXCEPTION 'COPY % blocked free source',op; END IF;
 END LOOP;
 FOR op IN SELECT unnest(ARRAY[
  'storage.object.list','storage.object.get_public',
  'storage.object.get_authenticated','storage.object.sign',''
 ]) LOOP
  PERFORM set_config('storage.operation',op,true);
  SELECT count(*) INTO cnt FROM storage.objects
   WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.held');
  IF cnt<>1 THEN RAISE EXCEPTION 'Normal read % unexpectedly blocked',op; END IF;
 END LOOP;
END $checks$;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('storage.operation','storage.object.copy',true);
DO $anon$
DECLARE cnt integer;
BEGIN
 SELECT count(*) INTO cnt FROM storage.objects
 WHERE bucket_id='post-photos' AND name=current_setting('pazo.f14.qa.held');
 IF cnt<>1 THEN RAISE EXCEPTION 'Anon public read changed'; END IF;
END $anon$;
RESET ROLE;
ROLLBACK;
