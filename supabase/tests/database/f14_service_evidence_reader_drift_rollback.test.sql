-- PAZO F14 A2. All writes are synthetic and MUST roll back.
-- Service-only reader must fail closed on shared URLs, expiry, moderator state and changed object version.
BEGIN;
DO $fixture$
DECLARE
  u uuid; pet uuid; post uuid:=gen_random_uuid();
  report uuid; obj uuid:=gen_random_uuid(); claim uuid;
  path text; url text; snap jsonb;
BEGIN
 SELECT p.owner_id,p.id INTO u,pet FROM public.pets p WHERE p.owner_id IS NOT NULL LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'Missing FK pet'; END IF;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 path:=u::text||'/'||pet::text||'/'||gen_random_uuid()::text||'.webp';
 url:='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/'||path;
 INSERT INTO public.posts(id,pet_id,user_id,pet_name,pet_species,text,photo_url)
 VALUES(post,pet,u,'F14 synthetic','perro','rollback only',url);
 INSERT INTO moderation_private.reports(target_kind,target_id,target_owner_user_id,reason,status,resolved_at)
 VALUES('feed_post',post,u,'spam','removed',now()) RETURNING id INTO report;
 INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,media_status)
 VALUES('feed_post',post,report,'pending_review');
 INSERT INTO storage.objects(id,bucket_id,name,owner_id,version,metadata)
 VALUES(obj,'post-photos',path,u::text,gen_random_uuid()::text,'{"cacheControl":"max-age=60"}'::jsonb);
 snap:=moderation_private.f14_media_probe('feed_post',post);
 IF snap IS NULL THEN RAISE EXCEPTION 'No source probe for synthetic claim'; END IF;
 INSERT INTO moderation_private.media_claims(target_kind,target_id,report_id,bucket,storage_object_id,snapshot)
 VALUES('feed_post',post,report,'post-photos',obj,snap)
 RETURNING claim_id INTO claim;
 PERFORM set_config('f14.qa.claim',claim::text,true);
 PERFORM set_config('f14.qa.post',post::text,true);
 PERFORM set_config('f14.qa.report',report::text,true);
 PERFORM set_config('f14.qa.object',obj::text,true);
 PERFORM set_config('f14.qa.owner',u::text,true);
 PERFORM set_config('f14.qa.pet',pet::text,true);
 PERFORM set_config('f14.qa.url',url,true);
END $fixture$;
SELECT set_config('request.jwt.claim.role','service_role',true);
SET LOCAL ROLE service_role;
DO $initial$
DECLARE e jsonb;
BEGIN
 e:=public.f14_get_media_claim_evidence(current_setting('f14.qa.claim')::uuid);
 IF e IS NULL OR e->>'status'<>'candidate_only' OR e->>'mayDelete'<>'false'
 OR e #>> '{references,url_reference_count}' <> '1'
 THEN RAISE EXCEPTION 'Expected current valid service-only candidate'; END IF;
END $initial$;
RESET ROLE;
-- Another synthetic post reuses the URL: deny the now-shared resource.
DO $duplicate$
DECLARE v_duplicate uuid:=gen_random_uuid();
BEGIN
 INSERT INTO public.posts(id,pet_id,user_id,pet_name,pet_species,text,photo_url)
 VALUES(v_duplicate,current_setting('f14.qa.pet')::uuid,
  current_setting('f14.qa.owner')::uuid,'F14 reference','perro',
  'duplicate synthetic reference',current_setting('f14.qa.url'));
 PERFORM set_config('f14.qa.duplicate',v_duplicate::text,true);
END $duplicate$;
SET LOCAL ROLE service_role;
DO $shared$
BEGIN
 IF public.f14_get_media_claim_evidence(current_setting('f14.qa.claim')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'Shared photo URL unexpectedly passed exclusive-usage guard'; END IF;
END $shared$;
RESET ROLE;
-- Remove only the second synthetic URL reference. No user content touched.
UPDATE public.posts SET photo_url=NULL
 WHERE id=current_setting('f14.qa.duplicate')::uuid;
UPDATE moderation_private.media_claims
 SET created_at=now()-interval '12 minutes',expires_at=now()-interval '5 minutes'
 WHERE claim_id=current_setting('f14.qa.claim')::uuid;
SET LOCAL ROLE service_role;
DO $expired$
BEGIN
 IF public.f14_get_media_claim_evidence(current_setting('f14.qa.claim')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'Expired media hold unexpectedly returned a candidate'; END IF;
END $expired$;
RESET ROLE;
UPDATE moderation_private.media_claims
 SET expires_at=now()+interval '5 minutes'
 WHERE claim_id=current_setting('f14.qa.claim')::uuid;
UPDATE moderation_private.reports SET status='dismissed'
 WHERE id=current_setting('f14.qa.report')::uuid;
SET LOCAL ROLE service_role;
DO $dismissed$
BEGIN
 IF public.f14_get_media_claim_evidence(current_setting('f14.qa.claim')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'Dismissed report unexpectedly returned candidate'; END IF;
END $dismissed$;
RESET ROLE;
UPDATE moderation_private.reports SET status='removed'
 WHERE id=current_setting('f14.qa.report')::uuid;
UPDATE moderation_private.content_restrictions SET media_status='none'
 WHERE target_kind='feed_post' AND target_id=current_setting('f14.qa.post')::uuid;
SET LOCAL ROLE service_role;
DO $unrestricted$
BEGIN
 IF public.f14_get_media_claim_evidence(current_setting('f14.qa.claim')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'No longer pending_review unexpectedly returned candidate'; END IF;
END $unrestricted$;
RESET ROLE;
UPDATE moderation_private.content_restrictions SET media_status='pending_review'
 WHERE target_kind='feed_post' AND target_id=current_setting('f14.qa.post')::uuid;
UPDATE storage.objects SET version=gen_random_uuid()::text
 WHERE id=current_setting('f14.qa.object')::uuid;
SET LOCAL ROLE service_role;
DO $changed_object$
BEGIN
 IF public.f14_get_media_claim_evidence(current_setting('f14.qa.claim')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'Changed Storage version unexpectedly returned candidate'; END IF;
END $changed_object$;
RESET ROLE;
ROLLBACK;
