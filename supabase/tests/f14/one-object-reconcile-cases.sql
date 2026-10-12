-- Run ONLY on disposable f14_synthetic PostgreSQL 17 after all F14 migrations.
-- Creates its OWN synthetic rows; never connect to hosted PAZO.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
  IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
    OR EXISTS(SELECT 1 FROM storage.objects)
    OR EXISTS(SELECT 1 FROM auth.users)
  THEN RAISE EXCEPTION 'STOP: test requires isolated empty F14 PG17 fixture'; END IF;
END $guard$;
SET LOCAL pazo.test.synthetic_fixture = 'confirmed';

CREATE TEMP TABLE f14_one_object_case(
  owner_id uuid, pet_id uuid, post_id uuid, object_id uuid,
  bucket text, path text, url text, claim_id uuid
) ON COMMIT DROP;

DO $setup$
DECLARE
  v_owner uuid:=gen_random_uuid();
  v_pet uuid:=gen_random_uuid();
  v_post uuid:='140d3769-cde2-47dc-998a-dcb3238b6f17'::uuid;
  v_object uuid:='b9ef7bf4-9d86-4168-b124-a8b0b272d0c8'::uuid;
  v_bucket text:='post-photos';
  v_path text;
  v_url text;
  v_report uuid;
  v_claim jsonb;
BEGIN
  v_path:=v_owner::text||'/'||v_pet::text||'/synthetic-e2e.png';
  v_url:='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/'||v_bucket||'/'||v_path;
  INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
    VALUES(v_owner,'authenticated','authenticated','f14-reconcile@example.invalid','{}','{}');
  INSERT INTO public.pets(id,owner_id,name,species)
    VALUES(v_pet,v_owner,'Synthetic','gato');
  INSERT INTO public.posts(id,user_id,pet_id,pet_name,pet_species,text,photo_url)
    VALUES(v_post,v_owner,v_pet,'Synthetic','gato','F14 synthetic reconciliation',v_url);
  INSERT INTO storage.buckets(id,name,public) VALUES(v_bucket,v_bucket,true);
  INSERT INTO storage.objects(id,bucket_id,name,owner_id,version,metadata)
    VALUES(v_object,v_bucket,v_path,v_owner::text,'fixture-v1','{"size":123,"mimetype":"image/png"}');
  INSERT INTO moderation_private.reports(target_kind,target_id,target_owner_user_id,reason,status)
    VALUES('feed_post',v_post,v_owner,'other','removed')
    RETURNING id INTO v_report;
  INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,media_status)
    VALUES('feed_post',v_post,v_report,'pending_review');
  PERFORM set_config('request.jwt.claim.role','',true);
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  SET LOCAL ROLE service_role;
  v_claim:=public.f14_prepare_media_claim('feed_post',v_post);
  IF v_claim->>'status' IS DISTINCT FROM 'candidate_only'
    OR public.f14_recheck_media_claim((v_claim->>'claim_id')::uuid) IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Synthetic claim prepare/recheck failed'; END IF;
  RESET ROLE;
  INSERT INTO f14_one_object_case VALUES(
    v_owner,v_pet,v_post,v_object,v_bucket,v_path,v_url,(v_claim->>'claim_id')::uuid);
END $setup$;

DO $cases$
DECLARE
  c f14_one_object_case%ROWTYPE;
  v_events integer;
  v_status text;
  v_count integer;
BEGIN
  SELECT * INTO c FROM f14_one_object_case LIMIT 1;
  PERFORM set_config('request.jwt.claim.role','',true);
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);

  -- This is the existing object: no premature finalization or claim change.
  SET LOCAL ROLE service_role;
  IF public.f14_finalize_one_object_reconciliation('feed_post',c.post_id,c.object_id)
    IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'Accepted reconciliation with existing Storage metadata'; END IF;
  RESET ROLE;
  IF (SELECT media_status FROM moderation_private.content_restrictions
      WHERE target_kind='feed_post' AND target_id=c.post_id) <> 'pending_review'
    OR (SELECT status FROM moderation_private.media_claims
      WHERE claim_id=c.claim_id) <> 'held'
  THEN RAISE EXCEPTION 'Premature reconciliation touched state'; END IF;

  -- Never accept a changed target or UUID even with real service_role.
  SET LOCAL ROLE service_role;
  IF public.f14_finalize_one_object_reconciliation('community_post',c.post_id,c.object_id)
    IS DISTINCT FROM false
    OR public.f14_finalize_one_object_reconciliation('feed_post',gen_random_uuid(),c.object_id)
      IS DISTINCT FROM false
    OR public.f14_finalize_one_object_reconciliation('feed_post',c.post_id,gen_random_uuid())
      IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'Wrong target or UUID reconciled'; END IF;
  RESET ROLE;

  -- Only the isolated Storage METADATA row is deleted here to model the
  -- previously verified hosted Storage API success. No remote calls/files.
  PERFORM set_config('storage.allow_delete_query','true',true);
  SET LOCAL ROLE service_role;
  DELETE FROM storage.objects WHERE bucket_id=c.bucket AND name=c.path;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RESET ROLE;
  IF v_count<>1 THEN RAISE EXCEPTION 'Fixture metadata delete was not exact'; END IF;

  -- Reconcile an expired but previously checked held claim, as in hosted.
  UPDATE moderation_private.media_claims SET
    created_at=clock_timestamp()-interval '2 hours',
    expires_at=clock_timestamp()-interval '1 hour'
  WHERE claim_id=c.claim_id;
  SET LOCAL ROLE service_role;
  IF public.f14_finalize_one_object_reconciliation('feed_post',c.post_id,c.object_id)
    IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Exact absent fixture was not reconciled'; END IF;
  IF public.f14_finalize_one_object_reconciliation('feed_post',c.post_id,c.object_id)
    IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Idempotent retry was not confirmed'; END IF;
  RESET ROLE;

  SELECT media_status INTO v_status FROM moderation_private.content_restrictions
    WHERE target_kind='feed_post' AND target_id=c.post_id;
  IF v_status IS DISTINCT FROM 'purged'
    OR (SELECT status FROM moderation_private.media_claims WHERE claim_id=c.claim_id)
      IS DISTINCT FROM 'invalidated'
  THEN RAISE EXCEPTION 'Atomic postconditions not satisfied'; END IF;
  SELECT count(*) INTO v_events FROM moderation_private.media_claim_events
    WHERE claim_id=c.claim_id AND event='invalidated';
  IF v_events<>1 THEN RAISE EXCEPTION 'Invalidated event count is not exactly 1'; END IF;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE id=c.object_id) THEN
    RAISE EXCEPTION 'Unexpected recreated Storage metadata'; END IF;
  RAISE NOTICE 'F14 ONE OBJECT RECONCILIATION SYNTHETIC PASS';
END $cases$;
ROLLBACK;
