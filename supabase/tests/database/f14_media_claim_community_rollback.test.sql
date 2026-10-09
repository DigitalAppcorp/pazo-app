-- F14 A2 installed claim RPC regression. Requires canonical migration 20261009014616.
-- Synthetic fixture and changes are rolled back; no Storage byte deletion.
BEGIN;
DO $community$
DECLARE v_owner uuid;v_pet uuid;v_com uuid;v_post uuid;v_path text;v_report uuid;
BEGIN
 SELECT user_id INTO STRICT v_owner FROM moderation_private.moderator_grants LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',v_owner::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 INSERT INTO public.pets(owner_id,name,species) VALUES(v_owner,'F14 COMMUNITY CLAIM ROLLBACK','perro') RETURNING id INTO v_pet;
 INSERT INTO public.communities(owner_user_id,name,description,category) VALUES(v_owner,'F14 MEDIA CLAIM','Rollback-only','Mascotas') RETURNING id INTO v_com;
 INSERT INTO public.community_memberships(community_id,user_id,display_pet_id,role)
 VALUES(v_com,v_owner,v_pet,'owner');
 v_path:=v_com::text||'/'||v_owner::text||'/'||gen_random_uuid()::text||'.webp';
 INSERT INTO public.community_posts(community_id,author_user_id,author_pet_id,body,photo_url,photo_storage_path)
 VALUES(v_com,v_owner,v_pet,'F14 COMMUNITY MEDIA ROLLBACK',
 'https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/community-post-photos/'||v_path,v_path)
 RETURNING id INTO v_post;
 INSERT INTO storage.objects(bucket_id,name,owner,owner_id,version,metadata)
 VALUES('community-post-photos',v_path,v_owner,v_owner::text,'f14-c-test','{"size":123}')
 ;
 INSERT INTO moderation_private.reports(reporter_user_id,target_kind,target_id,target_owner_user_id,reason,status,resolved_at,resolved_by)
 VALUES(v_owner,'community_post',v_post,v_owner,'spam','removed',now(),v_owner) RETURNING id INTO v_report;
 INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,applied_by,media_status)
 VALUES('community_post',v_post,v_report,v_owner,'pending_review');
 PERFORM set_config('pazo.f14.community.test',v_post::text,true);
END $community$;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
DO $assert$
DECLARE v_claim jsonb;v_id uuid;
BEGIN
 v_claim:=public.f14_prepare_media_claim('community_post',current_setting('pazo.f14.community.test')::uuid);
 IF v_claim->>'status'<>'candidate_only' THEN RAISE EXCEPTION 'Community claim not candidate'; END IF;
 v_id:=(v_claim->>'claim_id')::uuid;
 IF NOT public.f14_recheck_media_claim(v_id) THEN RAISE EXCEPTION 'Community recheck failed'; END IF;
END $assert$;
ROLLBACK;