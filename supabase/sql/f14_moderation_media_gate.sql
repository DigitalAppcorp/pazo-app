-- F14 D3-A: single-object Storage removal gate. READY FOR REVIEW, NOT APPLIED.
-- Run only after explicit PO authorization. Edge F14_MEDIA_PURGE_ENABLED remains OFF.
-- Storage deletion itself MUST occur through Storage API, never by SQL.
BEGIN;
CREATE OR REPLACE FUNCTION public.f14_moderation_media_gate(
 p_kind text, p_target uuid, p_bucket text, p_path text, p_url text, p_stage text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f14_purge$
DECLARE
 v_owner uuid;
 v_url text;
 v_path text;
 v_expected_bucket text;
 v_refs bigint;
BEGIN
 -- SECURITY DEFINER is not authorization. Only the server's service_role can call.
 IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role'
 OR p_kind NOT IN ('feed_post','community_post')
 OR p_target IS NULL OR p_url IS NULL OR p_path IS NULL
 OR p_stage IS NULL OR p_stage NOT IN ('preflight','complete')
 OR p_path !~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9._-]+)+$'
 OR pg_catalog.strpos(p_path,'..') > 0 OR pg_catalog.length(p_path)>400
 THEN RETURN false; END IF;

 v_expected_bucket := CASE p_kind WHEN 'feed_post' THEN 'post-photos'
                                  ELSE 'community-post-photos' END;
 IF p_bucket IS DISTINCT FROM v_expected_bucket THEN RETURN false; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM moderation_private.content_restrictions r
  WHERE r.target_kind=p_kind AND r.target_id=p_target AND r.media_status='pending_review'
 ) THEN RETURN false; END IF;

 IF p_kind='feed_post' THEN
  SELECT p.user_id,p.photo_url INTO v_owner,v_url
  FROM public.posts p WHERE p.id=p_target;
 ELSE
  SELECT p.author_user_id,p.photo_url,p.photo_storage_path
  INTO v_owner,v_url,v_path
  FROM public.community_posts p WHERE p.id=p_target;
  IF v_path IS DISTINCT FROM p_path THEN RETURN false; END IF;
 END IF;

 IF v_owner IS NULL OR NULLIF(pg_catalog.btrim(v_url),'') IS NULL
    OR v_url IS DISTINCT FROM p_url THEN RETURN false; END IF;

 -- Forbid one image referenced by any other PAZO object, including avatars
 -- duplicated into feed-post denormalized pet_avatar fields.
 SELECT COALESCE(SUM(n),0) INTO v_refs FROM (
  SELECT COUNT(*)::bigint n FROM public.posts WHERE photo_url=p_url
  UNION ALL SELECT COUNT(*) FROM public.posts WHERE pet_avatar=p_url
  UNION ALL SELECT COUNT(*) FROM public.community_posts WHERE photo_url=p_url
  UNION ALL SELECT COUNT(*) FROM public.pets WHERE photo_url=p_url
  UNION ALL SELECT COUNT(*) FROM public.communities WHERE image_url=p_url
  UNION ALL SELECT COUNT(*) FROM public.profiles WHERE avatar_url=p_url
 ) refs;
 IF v_refs <> 1 THEN RETURN false; END IF;
 IF p_kind='community_post' AND
   (SELECT COUNT(*) FROM public.community_posts WHERE photo_storage_path=p_path)<>1
 THEN RETURN false; END IF;

 -- If object exists, the immutable Storage owner must match the actual
 -- published content owner. Missing object can be reconciled after retry.
 IF EXISTS(
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id=p_bucket AND o.name=p_path
    AND o.owner_id IS DISTINCT FROM v_owner::text
 ) THEN RETURN false; END IF;

 IF p_stage='preflight' THEN RETURN true; END IF;
 -- Caller must first remove object via Storage API and verify direct URL.
 -- This last server-side check is authoritative for origin metadata.
 IF EXISTS(SELECT 1 FROM storage.objects o
  WHERE o.bucket_id=p_bucket AND o.name=p_path) THEN RETURN false; END IF;

 UPDATE moderation_private.content_restrictions
 SET media_status='purged'
 WHERE target_kind=p_kind AND target_id=p_target
   AND media_status='pending_review';
 RETURN FOUND;
END;
$f14_purge$;
REVOKE ALL ON FUNCTION public.f14_moderation_media_gate(text,uuid,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_moderation_media_gate(text,uuid,text,text,text,text)
 TO service_role;
COMMIT;

-- Semantic contract: purged = Storage origin absent AND two direct HEAD probes
-- succeeded in server caller; it cannot guarantee all CDN regions evicted.
-- Other media (pet_profile, external URL, shared, legacy) remain pending_review.
