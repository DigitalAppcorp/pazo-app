-- F14 A2: service-only, read-only evidence for held media claims.
-- IMPORTANT: no Storage delete, claim mutation, grants on private schema, or purge.
-- A function call is a PostgreSQL transaction only; row locks DO NOT span
-- subsequent Storage HTTP requests and are not permission to purge.
CREATE FUNCTION public.f14_get_media_claim_evidence(p_claim uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $f14_evidence$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;

  IF p_claim IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'status','candidate_only',
    'mayDelete',false,
    'reservation',jsonb_build_object(
      'claim_id',c.claim_id,'target_kind',c.target_kind,
      'target_id',c.target_id,'report_id',c.report_id,
      'bucket',c.bucket,'storage_object_id',c.storage_object_id,
      'status',c.status,'expires_at',c.expires_at,'snapshot',c.snapshot
    ),
    'restriction',jsonb_build_object(
      'target_kind',cr.target_kind,'target_id',cr.target_id,
      'report_id',cr.report_id,'media_status',cr.media_status
    ),
    'report',jsonb_build_object(
      'id',r.id,'target_kind',r.target_kind,
      'target_id',r.target_id,'status',r.status
    ),
    'storageObject',jsonb_build_object(
      'id',o.id,'bucket_id',o.bucket_id,'name',o.name,
      'version',o.version,'updated_at',o.updated_at,
      'metadata_fingerprint',md5(coalesce(o.metadata::text,'')),
      'is_delete_marker',o.is_delete_marker,'archived_at',o.archived_at
    ),
    'currentSourceSnapshot',live.snapshot,
    'references',jsonb_build_object(
      'url_reference_count',(
        SELECT count(*) FROM (
          SELECT p.photo_url AS url FROM public.posts p
          UNION ALL SELECT p.photo_url FROM public.pets p
          UNION ALL SELECT cp.photo_url FROM public.community_posts cp
          UNION ALL SELECT com.image_url FROM public.communities com
        ) ref
        WHERE ref.url LIKE ('%/storage/v1/object/public/' || c.bucket || '/' ||
          (c.snapshot->>'path') || '%')
      ),
      'community_path_count',(
        SELECT count(*) FROM public.community_posts cp
        WHERE cp.photo_storage_path=(c.snapshot->>'path')
      )
    ),
    'databaseNow',clock_timestamp()
  ) INTO v_result
  FROM moderation_private.media_claims c
  JOIN moderation_private.content_restrictions cr
    ON cr.target_kind=c.target_kind AND cr.target_id=c.target_id
    AND cr.report_id=c.report_id AND cr.media_status='pending_review'
  JOIN moderation_private.reports r
    ON r.id=c.report_id AND r.target_kind=c.target_kind
    AND r.target_id=c.target_id AND r.status='removed'
  JOIN storage.objects o
    ON o.id=c.storage_object_id AND o.bucket_id=c.bucket
    AND o.name=(c.snapshot->>'path') AND o.is_delete_marker IS FALSE
    AND o.archived_at IS NULL
  CROSS JOIN LATERAL (
    SELECT moderation_private.f14_media_probe(c.target_kind,c.target_id) AS snapshot
  ) live
  WHERE c.claim_id=p_claim AND c.status='held'
    AND c.target_kind IN ('feed_post','community_post')
    AND c.expires_at>clock_timestamp()
    AND live.snapshot IS NOT NULL
    AND live.snapshot=c.snapshot
    AND (c.snapshot->>'kind')=c.target_kind
    AND (c.snapshot->>'target_id')=c.target_id::text
    AND (c.snapshot->>'report_id')=c.report_id::text
    AND (c.snapshot->>'bucket')=c.bucket
    AND (c.snapshot->>'storage_object_id')=c.storage_object_id::text
  FOR SHARE OF c,cr,r,o;

  RETURN v_result;
END;
$f14_evidence$;

REVOKE ALL ON FUNCTION public.f14_get_media_claim_evidence(uuid)
FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f14_get_media_claim_evidence(uuid)
TO service_role;
