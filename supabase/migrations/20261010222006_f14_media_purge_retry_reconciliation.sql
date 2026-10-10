-- F14 D3-A recovery hardening (NOT APPLIED to hosted Supabase).
-- Requires a separately reviewed rollout gate and one disposable-object trial.
-- Storage deletion remains an Edge Storage API operation; this function only
-- verifies an exact, already-held claim and finalizes after absence is proven.
BEGIN;

CREATE OR REPLACE FUNCTION public.f14_moderation_media_gate(
  p_kind text,
  p_target uuid,
  p_bucket text,
  p_path text,
  p_url text,
  p_stage text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $f14_media_gate$
DECLARE
  v_owner uuid;
  v_pet uuid;
  v_community uuid;
  v_url text;
  v_path text;
  v_expected_bucket text;
  v_refs bigint;
  v_claim moderation_private.media_claims%ROWTYPE;
  v_live jsonb;
  v_report uuid;
  v_media_status text;
  v_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    OR p_kind IS NULL OR p_kind NOT IN ('feed_post', 'community_post')
    OR p_target IS NULL OR p_bucket IS NULL OR p_path IS NULL OR p_url IS NULL
    OR p_stage IS NULL OR p_stage NOT IN ('preflight', 'complete')
    OR p_path !~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9._-]+)+$'
    OR pg_catalog.strpos(p_path, '..') > 0
    OR pg_catalog.length(p_path) > 400
  THEN
    RETURN false;
  END IF;

  v_expected_bucket := CASE p_kind
    WHEN 'feed_post' THEN 'post-photos'
    ELSE 'community-post-photos'
  END;
  IF p_bucket IS DISTINCT FROM v_expected_bucket THEN RETURN false; END IF;

  -- Serialize completion retries for this target. Preflight is restricted to
  -- pending rows; complete also accepts an already purged exact target so a
  -- lost response can be retried without another Storage mutation.
  SELECT r.media_status, r.report_id
    INTO v_media_status, v_report
  FROM moderation_private.content_restrictions r
  WHERE r.target_kind = p_kind
    AND r.target_id = p_target
    AND (
      (p_stage = 'preflight' AND r.media_status = 'pending_review')
      OR (p_stage = 'complete' AND r.media_status IN ('pending_review', 'purged'))
    )
  FOR UPDATE;
  IF NOT FOUND OR v_report IS NULL THEN RETURN false; END IF;

  IF p_kind = 'feed_post' THEN
    SELECT p.user_id, p.photo_url, p.pet_id
      INTO v_owner, v_url, v_pet
    FROM public.posts p
    WHERE p.id = p_target
    FOR SHARE;
    IF NOT FOUND OR v_pet IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.pets pet
      WHERE pet.id = v_pet AND pet.owner_id = v_owner
    ) THEN
      RETURN false;
    END IF;
  ELSE
    SELECT cp.author_user_id, cp.photo_url, cp.photo_storage_path, cp.community_id
      INTO v_owner, v_url, v_path, v_community
    FROM public.community_posts cp
    WHERE cp.id = p_target
    FOR SHARE;
    IF NOT FOUND OR v_community IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.communities c WHERE c.id = v_community
    ) THEN
      RETURN false;
    END IF;
    IF v_path IS DISTINCT FROM p_path THEN RETURN false; END IF;
  END IF;

  IF v_owner IS NULL OR v_url IS DISTINCT FROM p_url
    OR NULLIF(pg_catalog.btrim(v_url), '') IS NULL
  THEN
    RETURN false;
  END IF;

  SELECT COALESCE(pg_catalog.sum(refs.n), 0)::bigint
    INTO v_refs
  FROM (
    SELECT pg_catalog.count(*)::bigint AS n FROM public.posts WHERE photo_url = p_url
    UNION ALL SELECT pg_catalog.count(*) FROM public.posts WHERE pet_avatar = p_url
    UNION ALL SELECT pg_catalog.count(*) FROM public.community_posts WHERE photo_url = p_url
    UNION ALL SELECT pg_catalog.count(*) FROM public.pets WHERE photo_url = p_url
    UNION ALL SELECT pg_catalog.count(*) FROM public.communities WHERE image_url = p_url
    UNION ALL SELECT pg_catalog.count(*) FROM public.profiles WHERE avatar_url = p_url
  ) refs;
  IF v_refs <> 1 THEN RETURN false; END IF;

  IF p_kind = 'community_post' AND (
    SELECT pg_catalog.count(*) FROM public.community_posts WHERE photo_storage_path = p_path
  ) <> 1 THEN
    RETURN false;
  END IF;

  SELECT * INTO v_claim
  FROM moderation_private.media_claims c
  WHERE c.target_kind = p_kind AND c.target_id = p_target
  FOR SHARE;
  IF NOT FOUND OR v_claim.status <> 'held' OR v_claim.checked_at IS NULL
    OR v_claim.report_id IS DISTINCT FROM v_report
    OR v_claim.bucket IS DISTINCT FROM p_bucket
    OR v_claim.snapshot->>'kind' IS DISTINCT FROM p_kind
    OR v_claim.snapshot->>'path' IS DISTINCT FROM p_path
    OR v_claim.snapshot->>'source_url' IS DISTINCT FROM p_url
    OR v_claim.snapshot->>'owner_id' IS DISTINCT FROM v_owner::text
    OR v_claim.snapshot->>'target_id' IS DISTINCT FROM p_target::text
    OR v_claim.snapshot->>'report_id' IS DISTINCT FROM v_report::text
    OR v_claim.snapshot->>'bucket' IS DISTINCT FROM p_bucket
    OR v_claim.snapshot->>'storage_object_id' IS DISTINCT FROM v_claim.storage_object_id::text
    OR (p_kind = 'feed_post' AND v_claim.snapshot->>'pet_id' IS DISTINCT FROM v_pet::text)
    OR (p_kind = 'community_post' AND v_claim.snapshot->>'community_id' IS DISTINCT FROM v_community::text)
  THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM moderation_private.reports report
    WHERE report.id = v_report
      AND report.status = 'removed'
      AND report.target_kind = p_kind
      AND report.target_id = p_target
  ) THEN
    RETURN false;
  END IF;

  IF p_stage = 'preflight' THEN
    IF v_media_status <> 'pending_review'
      OR v_claim.expires_at <= pg_catalog.clock_timestamp()
    THEN
      RETURN false;
    END IF;
    v_live := moderation_private.f14_media_probe(p_kind, p_target);
    IF v_live IS NULL OR v_live IS DISTINCT FROM v_claim.snapshot THEN RETURN false; END IF;
    RETURN true;
  END IF;

  -- The Edge has already required Storage.info() to prove absence and checked
  -- both original/cache-busted public URLs with HEAD and ranged GET. The DB
  -- independently checks that Storage metadata is absent before finalizing.
  IF EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = p_bucket AND o.name = p_path
  ) THEN
    RETURN false;
  END IF;

  IF v_media_status = 'purged' THEN RETURN true; END IF;

  UPDATE moderation_private.content_restrictions
  SET media_status = 'purged'
  WHERE target_kind = p_kind AND target_id = p_target AND media_status = 'pending_review';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$f14_media_gate$;

REVOKE ALL ON FUNCTION public.f14_moderation_media_gate(text, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.f14_moderation_media_gate(text, uuid, text, text, text, text)
  TO service_role;

COMMIT;
