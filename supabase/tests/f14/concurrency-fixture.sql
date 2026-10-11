-- Run ONLY against an isolated schema-only restoration with synthetic fixtures.
-- psql -X --set ON_ERROR_STOP=1 --file f14-tests.sql
-- The fixture loader must create pg_temp.f14_lab.test_case (see test-cases.md)
-- and SET pazo.test.synthetic_fixture = 'confirmed'. No reduced mock tables.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA f14_lab;
-- Exact synthetic rows use real restored constraints/triggers. No hosted connections.
DO $isolated$
BEGIN
 IF current_database() <> 'f14_synthetic' OR session_user <> 'f14_admin'
 THEN RAISE EXCEPTION 'Tests require isolated f14_synthetic / f14_admin'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM storage.objects)
 THEN RAISE EXCEPTION 'Tests require an empty structural clone'; END IF;
END;
$isolated$;
SET LOCAL pazo.test.synthetic_fixture='confirmed';
CREATE TABLE f14_lab.test_case (
 kind text, target uuid, bucket text, path text, url text, claim uuid,
 other_target uuid, other_bucket text, other_path text,
 owner_id uuid, other_owner uuid, pet uuid, other_pet uuid, community uuid
);
CREATE TABLE f14_lab.actors (
 n integer, owner_id uuid, pet uuid, feed uuid, community_post uuid
);
INSERT INTO f14_lab.actors
 SELECT n,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()
 FROM generate_series(1,2) n;

DO $fixture$
DECLARE a record; b record; v_community uuid:=gen_random_uuid(); v_path text;
 v_bucket text; v_target uuid; v_report uuid; v_url text; v_claim jsonb; v_kind text;
BEGIN
 INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 SELECT owner_id,'authenticated','authenticated','f14-synthetic-'||n||'@example.invalid','{}','{}'
 FROM f14_lab.actors;
 INSERT INTO public.pets(id,owner_id,name,species)
 SELECT pet,owner_id,'Synthetic pet '||n,'gato' FROM f14_lab.actors;
 SELECT * INTO a FROM f14_lab.actors WHERE n=1;
 PERFORM set_config('request.jwt.claim.sub',a.owner_id::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',a.owner_id)::text,true);
 INSERT INTO public.communities(id,owner_user_id,name,description,category)
 VALUES(v_community,a.owner_id,'Synthetic community','Isolated F14 test','test');
 INSERT INTO public.community_memberships(community_id,user_id,display_pet_id,role)
 VALUES(v_community,a.owner_id,a.pet,'owner');
 SELECT * INTO b FROM f14_lab.actors WHERE n=2;
 PERFORM set_config('request.jwt.claim.sub',b.owner_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',b.owner_id)::text,true);
 INSERT INTO public.community_memberships(community_id,user_id,display_pet_id,role)
 VALUES(v_community,b.owner_id,b.pet,'member');

 INSERT INTO storage.buckets(id,name,public)
 VALUES('post-photos','post-photos',true),('community-post-photos','community-post-photos',true);

 FOR a IN SELECT * FROM f14_lab.actors ORDER BY n LOOP
  PERFORM set_config('request.jwt.claim.sub',a.owner_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',a.owner_id)::text,true);
  FOREACH v_kind IN ARRAY ARRAY['feed_post','community_post'] LOOP
   v_target:=CASE WHEN v_kind='feed_post' THEN a.feed ELSE a.community_post END;
   v_bucket:=CASE WHEN v_kind='feed_post' THEN 'post-photos' ELSE 'community-post-photos' END;
   v_path:=CASE WHEN v_kind='feed_post'
      THEN a.owner_id::text||'/'||a.pet::text||'/'||gen_random_uuid()::text||'.jpg'
      ELSE v_community::text||'/'||a.owner_id::text||'/'||gen_random_uuid()::text||'.jpg' END;
   v_url:='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/'||v_bucket||'/'||v_path;
   IF v_kind='feed_post' THEN
    INSERT INTO public.posts(id,user_id,pet_id,pet_name,pet_species,text,photo_url)
    VALUES(v_target,a.owner_id,a.pet,'Synthetic','gato','Synthetic F14 test',v_url);
   ELSE
    INSERT INTO public.community_posts(id,community_id,author_user_id,author_pet_id,body,photo_url,photo_storage_path)
    VALUES(v_target,v_community,a.owner_id,a.pet,'Synthetic F14 test',v_url,v_path);
   END IF;
   INSERT INTO storage.objects(bucket_id,name,owner_id,version,metadata)
   VALUES(v_bucket,v_path,a.owner_id::text,'fixture-version-1','{"size":123,"mimetype":"image/jpeg"}');
   INSERT INTO moderation_private.reports(target_kind,target_id,target_owner_user_id,reason,status)
   VALUES(v_kind,v_target,a.owner_id,'other','removed') RETURNING id INTO v_report;
   INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,media_status)
   VALUES(v_kind,v_target,v_report,'pending_review');
   IF a.n=1 THEN
    SELECT * INTO b FROM f14_lab.actors WHERE n=2;
    INSERT INTO f14_lab.test_case(kind,target,bucket,path,url,other_target,other_bucket,owner_id,other_owner,pet,other_pet,community)
    VALUES(v_kind,v_target,v_bucket,v_path,v_url,
      CASE WHEN v_kind='feed_post' THEN b.feed ELSE b.community_post END,
      v_bucket,a.owner_id,b.owner_id,a.pet,b.pet,v_community);
   ELSE
    UPDATE f14_lab.test_case SET other_path=v_path WHERE kind=v_kind;
   END IF;
  END LOOP;
 END LOOP;
 SET CONSTRAINTS ALL IMMEDIATE;
 PERFORM set_config('request.jwt.claim.role','',true);
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 IF current_setting('pazo.test.prepare_claims',true) IS DISTINCT FROM 'false' THEN
 FOR a IN SELECT * FROM f14_lab.test_case LOOP
  SET LOCAL ROLE service_role;
  v_claim:=public.f14_prepare_media_claim(a.kind,a.target);
  IF NOT public.f14_recheck_media_claim((v_claim->>'claim_id')::uuid)
  THEN RAISE EXCEPTION 'Real initial claim recheck failed'; END IF;
  RESET ROLE;
  UPDATE f14_lab.test_case SET claim=(v_claim->>'claim_id')::uuid WHERE kind=a.kind;
 END LOOP;
 END IF;
END;
$fixture$;
COMMIT;
