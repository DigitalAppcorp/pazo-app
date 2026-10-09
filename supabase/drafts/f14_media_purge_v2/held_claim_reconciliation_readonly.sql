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
