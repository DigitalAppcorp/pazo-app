-- Disposable PG17-only fixture for the two-session FINALIZE concurrency test.
\set ON_ERROR_STOP on
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
   OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
   OR EXISTS(SELECT 1 FROM storage.objects)
   OR EXISTS(SELECT 1 FROM auth.users)
 THEN RAISE EXCEPTION 'STOP: concurrent fixture requires clean isolated PG17 laboratory'; END IF;
END $guard$;
CREATE SCHEMA IF NOT EXISTS f14_lab;
CREATE TABLE f14_lab.reconcile_case(
  post_id uuid NOT NULL, storage_id uuid NOT NULL,
  claim_id uuid NOT NULL, bucket text NOT NULL, path text NOT NULL
);
DO $setup$
DECLARE
  v_owner uuid:=gen_random_uuid(); v_pet uuid:=gen_random_uuid();
  v_post uuid:='140d3769-cde2-47dc-998a-dcb3238b6f17'::uuid;
  v_storage uuid:='b9ef7bf4-9d86-4168-b124-a8b0b272d0c8'::uuid;
  v_path text; v_url text; v_report uuid; v_claim jsonb;
BEGIN
  v_path:=v_owner::text||'/'||v_pet::text||'/'||gen_random_uuid()::text||'.png';
  v_url:='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/'||v_path;
  INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
   VALUES(v_owner,'authenticated','authenticated','f14-concurrent@example.invalid','{}','{}');
  INSERT INTO public.pets(id,owner_id,name,species) VALUES(v_pet,v_owner,'Synthetic','gato');
  PERFORM set_config('request.jwt.claim.sub',v_owner::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_owner)::text,true);
  INSERT INTO public.posts(id,user_id,pet_id,pet_name,pet_species,text,photo_url)
   VALUES(v_post,v_owner,v_pet,'Synthetic','gato','F14 concurrent synthetic',v_url);
  INSERT INTO storage.buckets(id,name,public) VALUES('post-photos','post-photos',true);
  INSERT INTO storage.objects(id,bucket_id,name,owner_id,version,metadata)
   VALUES(v_storage,'post-photos',v_path,v_owner::text,'synthetic-v1','{"size":100,"mimetype":"image/png"}');
  INSERT INTO moderation_private.reports(target_kind,target_id,target_owner_user_id,reason,status)
   VALUES('feed_post',v_post,v_owner,'other','removed') RETURNING id INTO v_report;
  INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,media_status)
   VALUES('feed_post',v_post,v_report,'pending_review');
  PERFORM set_config('request.jwt.claim.role','',true);
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  SET LOCAL ROLE service_role;
  v_claim:=public.f14_prepare_media_claim('feed_post',v_post);
  IF public.f14_recheck_media_claim((v_claim->>'claim_id')::uuid) IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Held claim was not rechecked'; END IF;
  RESET ROLE;
  INSERT INTO f14_lab.reconcile_case VALUES(
   v_post,v_storage,(v_claim->>'claim_id')::uuid,'post-photos',v_path);
END $setup$;
