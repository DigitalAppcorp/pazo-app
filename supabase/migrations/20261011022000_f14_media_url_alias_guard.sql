-- F14 follow-up: guard against shared Storage URL aliases.
-- NOT APPLIED to hosted Supabase. Requires a separate PO-hosted migration gate.
-- Depends on 20261010222006_f14_media_purge_retry_reconciliation.sql.
-- From the local PostgreSQL 17 single-session candidate PASS, 2026-10-11.
-- The helper name retains 'local' to preserve the SQL tested in that lab.
-- WARNING: this detects the project's canonical public Storage URL (including
-- query/fragment/percent-encoded path variants). Other hosts, signed URL forms
-- and concurrent references require an additional review before rollout.
-- No Storage API deletion, policy relaxation, feature flag or data mutation.
BEGIN;

CREATE OR REPLACE FUNCTION moderation_private.f14_local_url_points_to_object(
  p_url text, p_bucket text, p_path text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = ''
AS $f14_url_identity$
DECLARE
  v_parts text[];
  v_suffix text;
  v_decoded text := '';
  v_pos integer := 1;
  v_hex text;
  v_value integer;
  v_character text;
BEGIN
  IF pg_catalog.length(p_url) > 2048 OR pg_catalog.length(p_path) > 400
     OR p_bucket NOT IN ('post-photos', 'community-post-photos')
  THEN RETURN false; END IF;

  -- Only the canonical Supabase Storage public endpoint for this project.
  -- The URL hostname and scheme are case insensitive; the Storage path is not.
  v_parts := pg_catalog.regexp_match(
    p_url, '^([A-Za-z]+)://([^/?#]+)(/[^?#]*)([?#].*)?$'
  );
  IF v_parts IS NULL OR pg_catalog.lower(v_parts[1]) <> 'https'
     OR pg_catalog.lower(v_parts[2]) <> 'mrybvqdebbgcayuvgkkr.supabase.co'
  THEN RETURN false; END IF;
  IF pg_catalog.left(v_parts[3], pg_catalog.length('/storage/v1/object/public/'))
     <> '/storage/v1/object/public/'
  THEN RETURN false; END IF;

  v_suffix := pg_catalog.substr(
    v_parts[3], pg_catalog.length('/storage/v1/object/public/') + 1
  );
  WHILE v_pos <= pg_catalog.length(v_suffix) LOOP
    v_character := pg_catalog.substr(v_suffix, v_pos, 1);
    IF v_character = '%' THEN
      v_hex := pg_catalog.substr(v_suffix, v_pos + 1, 2);
      IF pg_catalog.length(v_hex) <> 2 OR v_hex !~ '^[0-9A-Fa-f]{2}$'
      THEN RETURN false; END IF;
      v_value := pg_catalog.get_byte(pg_catalog.decode(v_hex, 'hex'), 0);
      IF v_value < 32 OR v_value > 126 THEN RETURN false; END IF;
      v_character := pg_catalog.chr(v_value);
      v_pos := v_pos + 3;
    ELSE
      v_pos := v_pos + 1;
    END IF;
    IF v_character !~ '^[A-Za-z0-9._/-]$' THEN RETURN false; END IF;
    v_decoded := v_decoded || v_character;
  END LOOP;
  RETURN v_decoded = (p_bucket || '/' || p_path);
END;
$f14_url_identity$;
REVOKE ALL ON FUNCTION moderation_private.f14_local_url_points_to_object(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION moderation_private.f14_local_url_points_to_object(text, text, text) TO "postgres";

CREATE OR REPLACE FUNCTION moderation_private.f14_media_probe(p_kind text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_url text; v_path text; v_bucket text; v_owner uuid; v_pet uuid; v_community uuid;
  v_report uuid; v_source_path text; v_object storage.objects%ROWTYPE;
  v_count integer; v_owner_ok boolean;
BEGIN
  IF p_kind NOT IN ('feed_post','community_post') OR p_id IS NULL THEN RETURN NULL; END IF;
  SELECT r.report_id INTO v_report
  FROM moderation_private.content_restrictions r
  JOIN moderation_private.reports rep ON rep.id=r.report_id
  WHERE r.target_kind=p_kind AND r.target_id=p_id
    AND r.media_status='pending_review' AND rep.status='removed'
    AND rep.target_kind=p_kind AND rep.target_id=p_id;
  IF v_report IS NULL THEN RETURN NULL; END IF;

  IF p_kind='feed_post' THEN
    SELECT p.photo_url,p.user_id,p.pet_id,
      (pet.id IS NOT NULL AND pet.owner_id=p.user_id)
    INTO v_url,v_owner,v_pet,v_owner_ok
    FROM public.posts p JOIN public.pets pet ON pet.id=p.pet_id
    WHERE p.id=p_id FOR SHARE OF p,pet;
    v_bucket:='post-photos';
    IF v_owner_ok IS DISTINCT FROM TRUE OR v_owner IS NULL OR v_pet IS NULL
      THEN RETURN NULL; END IF;
  ELSE
    SELECT cp.photo_url,cp.photo_storage_path,cp.author_user_id,cp.community_id,
      (community.id IS NOT NULL)
    INTO v_url,v_source_path,v_owner,v_community,v_owner_ok
    FROM public.community_posts cp JOIN public.communities community ON community.id=cp.community_id
    WHERE cp.id=p_id FOR SHARE OF cp,community;
    v_bucket:='community-post-photos';
    IF v_owner_ok IS DISTINCT FROM TRUE OR v_owner IS NULL OR v_community IS NULL
      THEN RETURN NULL; END IF;
  END IF;
  IF v_url IS NULL OR v_url !~ ('^https://mrybvqdebbgcayuvgkkr[.]supabase[.]co/storage/v1/object/public/' || v_bucket || '/[A-Za-z0-9_./-]+$')
    THEN RETURN NULL; END IF;
  v_path:=substring(v_url FROM ('^https://mrybvqdebbgcayuvgkkr[.]supabase[.]co/storage/v1/object/public/' || v_bucket || '/(.+)$'));
  IF v_path IS NULL OR length(v_path)>700 OR position('..' IN v_path)>0 OR position('//' IN v_path)>0 OR v_path LIKE '/%'
    THEN RETURN NULL; END IF;
  IF p_kind='community_post' THEN
    IF v_path IS DISTINCT FROM v_source_path
       OR v_path !~* ('^' || v_community::text || '/' || v_owner::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$')
       THEN RETURN NULL; END IF;
  ELSE
    IF NOT (
      v_path ~* ('^' || v_owner::text || '/' || v_pet::text || '/[0-9a-f-]{36}[.](jpg|png|webp)$')
      OR v_path ~* ('^' || v_pet::text || '/[A-Za-z0-9_-]{1,100}[.](jpg|jpeg|png|webp)$')
    ) THEN RETURN NULL; END IF;
  END IF;

  -- Reject aliases across every supported PAZO reference column.
  SELECT COALESCE(pg_catalog.sum(n),0)::integer INTO v_count FROM (
    SELECT pg_catalog.count(*)::integer n FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(pet_avatar,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.community_posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.pets
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.communities
      WHERE moderation_private.f14_local_url_points_to_object(image_url,v_bucket,v_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.profiles
      WHERE moderation_private.f14_local_url_points_to_object(avatar_url,v_bucket,v_path)
  ) aliases;
  IF v_count <> 1 THEN RETURN NULL; END IF;
  IF p_kind='community_post' AND
    (SELECT count(*) FROM public.community_posts WHERE photo_storage_path=v_path)<>1
    THEN RETURN NULL; END IF;
  SELECT * INTO v_object FROM storage.objects o
  WHERE o.bucket_id=v_bucket AND o.name=v_path FOR SHARE;
  IF NOT FOUND OR v_object.id IS NULL OR nullif(btrim(v_object.version),'') IS NULL
    OR v_object.updated_at IS NULL OR v_object.is_delete_marker
    OR v_object.archived_at IS NOT NULL
    OR (v_object.owner_id IS NOT NULL AND v_object.owner_id<>v_owner::text)
    THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'kind',p_kind,'target_id',p_id,'report_id',v_report,
    'bucket',v_bucket,'path',v_path,'source_url',v_url,
    'owner_id',v_owner,'pet_id',v_pet,'community_id',v_community,
    'storage_object_id',v_object.id,'object_version',v_object.version,
    'object_updated_at',v_object.updated_at,
    'metadata_fingerprint',md5(coalesce(v_object.metadata::text,''))
  );
END;
$$;

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

  SELECT COALESCE(pg_catalog.sum(refs.n),0)::bigint INTO v_refs FROM (
    SELECT pg_catalog.count(*)::bigint n FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.posts
      WHERE moderation_private.f14_local_url_points_to_object(pet_avatar,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.community_posts
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.pets
      WHERE moderation_private.f14_local_url_points_to_object(photo_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.communities
      WHERE moderation_private.f14_local_url_points_to_object(image_url,p_bucket,p_path)
    UNION ALL SELECT pg_catalog.count(*) FROM public.profiles
      WHERE moderation_private.f14_local_url_points_to_object(avatar_url,p_bucket,p_path)
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

COMMIT;
