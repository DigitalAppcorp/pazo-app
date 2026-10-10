-- PAZO F14 A2: DRAFT ONLY. Preflight/lease WITHOUT STORAGE DELETION.
-- Not approved for Supabase deployment. Run tests under BEGIN/ROLLBACK only.
-- Service-role RPC only; Edge purge remains hard-disabled HTTP 503.
-- Project-bound to PAZO Supabase ref mrybvqdebbgcayuvgkkr (no cross-project URLs).
BEGIN;

CREATE TABLE moderation_private.media_claims (
  claim_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL CHECK (target_kind IN ('feed_post','community_post')),
  target_id uuid NOT NULL,
  report_id uuid NOT NULL REFERENCES moderation_private.reports(id) ON DELETE RESTRICT,
  bucket text NOT NULL CHECK (bucket IN ('post-photos','community-post-photos')),
  storage_object_id uuid NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','invalidated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  checked_at timestamptz,
  UNIQUE (target_kind,target_id),
  UNIQUE (bucket,storage_object_id),
  CHECK (expires_at > created_at)
);
CREATE TABLE moderation_private.media_claim_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES moderation_private.media_claims(claim_id) ON DELETE RESTRICT,
  event text NOT NULL CHECK (event IN ('created','rechecked','invalidated')),
  at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON moderation_private.media_claims FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON moderation_private.media_claim_events FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE moderation_private.media_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_private.media_claim_events ENABLE ROW LEVEL SECURITY;

-- Internal snapshot; caller must authorize on public RPC and never treat output
-- as permission to delete. Current scope excludes pet_profile (related-media).
CREATE FUNCTION moderation_private.f14_media_probe(p_kind text,p_id uuid)
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

  -- Reject any shared or ambiguous reference, including URL query variants.
  SELECT count(*) INTO v_count FROM (
    SELECT photo_url AS url FROM public.posts
    UNION ALL SELECT photo_url FROM public.pets
    UNION ALL SELECT photo_url FROM public.community_posts
    UNION ALL SELECT image_url FROM public.communities
  ) all_urls
  WHERE url LIKE ('%/storage/v1/object/public/' || v_bucket || '/' || v_path || '%');
  IF v_count<>1 THEN RETURN NULL; END IF;
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
REVOKE ALL ON FUNCTION moderation_private.f14_media_probe(text,uuid)
FROM PUBLIC,anon,authenticated,service_role;

-- Idempotent for an already held, unexpired exact snapshot.
-- No automatic expiration/reassignment of a claim: manual reconciliation only.
CREATE FUNCTION public.f14_prepare_media_claim(p_kind text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_snapshot jsonb; v_existing moderation_private.media_claims%ROWTYPE;
v_claim uuid; v_expiry timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  IF p_kind NOT IN ('feed_post','community_post') OR p_id IS NULL
    THEN RAISE EXCEPTION 'manual review required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_kind||':'||p_id::text,0));
  -- Lock moderation restriction while taking the snapshot.
  PERFORM 1 FROM moderation_private.content_restrictions
  WHERE target_kind=p_kind AND target_id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no pending restriction' USING ERRCODE='22023'; END IF;
  v_snapshot:=moderation_private.f14_media_probe(p_kind,p_id);
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'manual review: source/object proof unavailable' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_existing FROM moderation_private.media_claims
    WHERE target_kind=p_kind AND target_id=p_id FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status='held' AND v_existing.expires_at>clock_timestamp()
      AND v_existing.snapshot=v_snapshot THEN
      RETURN jsonb_build_object('claim_id',v_existing.claim_id,
        'expires_at',v_existing.expires_at,'status','candidate_only');
    END IF;
    RAISE EXCEPTION 'stale or changed claim: manual reconciliation required'
      USING ERRCODE='22023';
  END IF;
  INSERT INTO moderation_private.media_claims
    (target_kind,target_id,report_id,bucket,storage_object_id,snapshot)
  VALUES (p_kind,p_id,(v_snapshot->>'report_id')::uuid,
    v_snapshot->>'bucket',(v_snapshot->>'storage_object_id')::uuid,v_snapshot)
  RETURNING claim_id,expires_at INTO v_claim,v_expiry;
  INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(v_claim,'created');
  RETURN jsonb_build_object('claim_id',v_claim,'expires_at',v_expiry,'status','candidate_only');
END;
$$;
REVOKE ALL ON FUNCTION public.f14_prepare_media_claim(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_prepare_media_claim(text,uuid) TO service_role;

-- Compares a lease with the live DB/source/Storage version. This does NOT
-- establish a lock across a future external Storage API request.
CREATE FUNCTION public.f14_recheck_media_claim(p_claim uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_claim moderation_private.media_claims%ROWTYPE; v_now jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_claim FROM moderation_private.media_claims
    WHERE claim_id=p_claim FOR UPDATE;
  IF NOT FOUND OR v_claim.status<>'held' THEN RETURN false; END IF;
  IF v_claim.expires_at<=clock_timestamp() THEN
    UPDATE moderation_private.media_claims SET status='invalidated',checked_at=now()
      WHERE claim_id=p_claim;
    INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(p_claim,'invalidated');
    RETURN false;
  END IF;
  v_now:=moderation_private.f14_media_probe(v_claim.target_kind,v_claim.target_id);
  IF v_now IS NULL OR v_now IS DISTINCT FROM v_claim.snapshot THEN
    UPDATE moderation_private.media_claims SET status='invalidated',checked_at=now()
      WHERE claim_id=p_claim;
    INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(p_claim,'invalidated');
    RETURN false;
  END IF;
  UPDATE moderation_private.media_claims SET checked_at=now() WHERE claim_id=p_claim;
  INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(p_claim,'rechecked');
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.f14_recheck_media_claim(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_recheck_media_claim(uuid) TO service_role;

-- Intentionally NO delete, purge, completed, or status-advance function.
-- The existing f14_confirm_media_cleanup(kind,id) is NOT a valid completion
-- protocol for this claim model; never call it from the future worker.
COMMIT;
