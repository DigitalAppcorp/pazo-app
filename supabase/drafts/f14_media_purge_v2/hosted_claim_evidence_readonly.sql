-- PAZO F14 A2 — READ-ONLY PRIVATE EVIDENCE QUERY TEMPLATE.
-- Do not expose to browser, authenticated or anon. Run ONLY from a trusted
-- backend in a single repeatable-read transaction with required permissions.
-- $1: media_claims.claim_id UUID. No deletions, changes or authorization.
-- f14_media_probe obtains source evidence but SQL locks do not span Storage HTTP.
-- Returns a single JSON object for inspectHostedClaimEvidence, or zero rows.
SELECT jsonb_build_object(
  'reservation', jsonb_build_object(
    'claim_id', c.claim_id, 'target_kind', c.target_kind,
    'target_id', c.target_id, 'report_id', c.report_id,
    'bucket', c.bucket, 'storage_object_id', c.storage_object_id,
    'status', c.status, 'expires_at', c.expires_at,
    'snapshot', c.snapshot
  ),
  'restriction', jsonb_build_object(
    'target_kind', cr.target_kind, 'target_id', cr.target_id,
    'report_id', cr.report_id, 'media_status', cr.media_status
  ),
  'report', jsonb_build_object(
    'id', rep.id, 'target_kind', rep.target_kind,
    'target_id', rep.target_id, 'status', rep.status
  ),
  'storageObject', jsonb_build_object(
    'id', o.id, 'bucket_id', o.bucket_id, 'name', o.name,
    'version', o.version, 'updated_at', o.updated_at,
    'metadata_fingerprint', md5(coalesce(o.metadata::text,'')),
    'is_delete_marker', o.is_delete_marker, 'archived_at', o.archived_at
  ),
  'currentSourceSnapshot', moderation_private.f14_media_probe(c.target_kind, c.target_id),
  'references', jsonb_build_object(
    'url_reference_count', (
      SELECT count(*) FROM (
        SELECT photo_url AS url FROM public.posts
        UNION ALL SELECT photo_url FROM public.pets
        UNION ALL SELECT photo_url FROM public.community_posts
        UNION ALL SELECT image_url FROM public.communities
      ) urls
      WHERE urls.url LIKE ('%/storage/v1/object/public/' || c.bucket || '/' || c.snapshot->>'path' || '%')
    ),
    'community_path_count', (
      SELECT count(*) FROM public.community_posts cp
      WHERE cp.photo_storage_path=c.snapshot->>'path'
    )
  ),
  'databaseNow', clock_timestamp()
) AS evidence
FROM moderation_private.media_claims c
JOIN moderation_private.content_restrictions cr
  ON cr.target_kind=c.target_kind AND cr.target_id=c.target_id
JOIN moderation_private.reports rep ON rep.id=c.report_id
JOIN storage.objects o
  ON o.id=c.storage_object_id AND o.bucket_id=c.bucket
WHERE c.claim_id=$1::uuid;
