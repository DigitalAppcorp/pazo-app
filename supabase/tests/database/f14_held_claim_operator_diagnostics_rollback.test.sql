-- PAZO F14 A2. All synthetic test data rolled back, no bytes stored.
BEGIN;
DO $fixture$
DECLARE owner_id uuid;pet_id uuid;post_id uuid:=gen_random_uuid();report_uuid uuid;
 obj_id uuid:=gen_random_uuid();v_claim uuid;v_path text;v_url text;v_snap jsonb;
BEGIN
 SELECT p.owner_id,p.id INTO owner_id,pet_id FROM public.pets p WHERE p.owner_id IS NOT NULL LIMIT 1;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'No pet FK for fixture'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 v_path:=owner_id::text||'/'||pet_id::text||'/'||gen_random_uuid()::text||'.webp';
 v_url:='https://mrybvqdebbgcayuvgkkr.supabase.co/storage/v1/object/public/post-photos/'||v_path;
 INSERT INTO public.posts(id,pet_id,user_id,pet_name,pet_species,text,photo_url)
 VALUES(post_id,pet_id,owner_id,'F14 synthetic','perro','rollback only',v_url);
 INSERT INTO moderation_private.reports(target_kind,target_id,target_owner_user_id,reason,status,resolved_at)
 VALUES('feed_post',post_id,owner_id,'spam','removed',now()) RETURNING id INTO report_uuid;
 INSERT INTO moderation_private.content_restrictions(target_kind,target_id,report_id,media_status)
 VALUES('feed_post',post_id,report_uuid,'pending_review');
 INSERT INTO storage.objects(id,bucket_id,name,owner_id,version,metadata)
 VALUES(obj_id,'post-photos',v_path,owner_id::text,gen_random_uuid()::text,'{"cacheControl":"max-age=60"}'::jsonb);
 v_snap:=moderation_private.f14_media_probe('feed_post',post_id);
 IF v_snap IS NULL THEN RAISE EXCEPTION 'Synthetic source snapshot absent'; END IF;
 INSERT INTO moderation_private.media_claims(target_kind,target_id,report_id,bucket,storage_object_id,snapshot)
 VALUES('feed_post',post_id,report_uuid,'post-photos',obj_id,v_snap)
 RETURNING claim_id INTO v_claim;
 PERFORM set_config('f14.diag.claim',v_claim::text,true);
 PERFORM set_config('f14.diag.post',post_id::text,true);
END $fixture$;
PREPARE f14_diag AS
-- F14 A2 / D3-A: SAFE, AGGREGATED, ADMIN-ONLY stalled-claim diagnostic.
-- Execute as database administrator in a transaction that permits row locks.
-- This SELECT NEVER mutates claims, restrictions, files or user content.
-- No claim IDs, media paths, report details or personal identifiers returned.
-- f14_media_probe may use FOR SHARE; do NOT use SQL READ ONLY transaction mode.
-- A positive count is a reason for manual investigation, NOT permission to delete.
WITH observed AS MATERIALIZED (
  SELECT
    c.status, c.expires_at,
    (c.expires_at <= clock_timestamp()) AS expired,
    (o.id IS NOT NULL) AS storage_metadata_exists,
    CASE WHEN c.status='held'
      THEN moderation_private.f14_media_probe(c.target_kind,c.target_id)
      ELSE NULL::jsonb END AS source_now,
    c.snapshot,
    cr.media_status,
    r.status AS report_status
  FROM moderation_private.media_claims c
  LEFT JOIN storage.objects o
    ON o.id=c.storage_object_id AND o.bucket_id=c.bucket
  LEFT JOIN moderation_private.content_restrictions cr
    ON cr.target_kind=c.target_kind AND cr.target_id=c.target_id
  LEFT JOIN moderation_private.reports r ON r.id=c.report_id
)
SELECT
  count(*)::integer AS claims_total,
  count(*) FILTER (WHERE status='held')::integer AS held_total,
  count(*) FILTER (WHERE status='invalidated')::integer AS invalidated_total,
  count(*) FILTER (WHERE status='held' AND expired)::integer AS held_expired,
  count(*) FILTER (WHERE status='held' AND NOT storage_metadata_exists)::integer AS held_without_storage_metadata,
  count(*) FILTER (WHERE status='held' AND NOT expired
    AND (source_now IS NULL OR source_now IS DISTINCT FROM snapshot)
  )::integer AS held_source_drift,
  count(*) FILTER (WHERE status='held'
    AND (media_status IS DISTINCT FROM 'pending_review'
      OR report_status IS DISTINCT FROM 'removed')
  )::integer AS held_moderation_state_drift,
  count(*) FILTER (WHERE status='held' AND NOT expired
    AND storage_metadata_exists AND source_now=snapshot
    AND media_status='pending_review' AND report_status='removed'
  )::integer AS held_snapshot_consistent_not_delete_authorized
FROM observed;

DO $healthy$
DECLARE r record;
BEGIN
 EXECUTE 'EXECUTE f14_diag' INTO r;
 IF r.claims_total<>1 OR r.held_total<>1 OR r.held_snapshot_consistent_not_delete_authorized<>1 OR r.held_expired<>0
 THEN RAISE EXCEPTION 'Healthy held classification failed: %',row_to_json(r); END IF;
END $healthy$;
UPDATE moderation_private.media_claims
SET created_at=now()-interval '10 minutes', expires_at=now()-interval '5 minutes'
WHERE claim_id=current_setting('f14.diag.claim')::uuid;
DO $expired$
DECLARE r record;
BEGIN
 EXECUTE 'EXECUTE f14_diag' INTO r;
 IF r.held_expired<>1 OR r.held_snapshot_consistent_not_delete_authorized<>0
 THEN RAISE EXCEPTION 'Expired held classification failed: %',row_to_json(r); END IF;
END $expired$;
UPDATE moderation_private.media_claims
SET expires_at=now()+interval '5 minutes'
WHERE claim_id=current_setting('f14.diag.claim')::uuid;
UPDATE public.posts SET photo_url=NULL WHERE id=current_setting('f14.diag.post')::uuid;
DO $drift$
DECLARE r record;
BEGIN
 EXECUTE 'EXECUTE f14_diag' INTO r;
 IF r.held_source_drift<>1 OR r.held_snapshot_consistent_not_delete_authorized<>0
 THEN RAISE EXCEPTION 'Source drift classification failed: %',row_to_json(r); END IF;
END $drift$;
DEALLOCATE f14_diag;
ROLLBACK;
