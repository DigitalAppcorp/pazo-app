-- F14 D3-A: consolidate existing media claims, Storage API removal and audited finalization.
-- Install with deletion disabled in Edge (code latch remains FALSE). Does not
-- delete any row or file. Only service_role may finalize post/media state.
-- No public GUC/session bypass. Previous media claims/Storage policies stay in place.
CREATE OR REPLACE FUNCTION public.f14_moderation_media_gate(
 p_kind text,p_target uuid,p_bucket text,p_path text,p_url text,p_stage text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f14_media_gate$
DECLARE
 v_owner uuid; v_url text; v_path text; v_expected_bucket text;
 v_refs bigint; v_claim moderation_private.media_claims%ROWTYPE;
 v_live jsonb; v_count integer;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 OR p_kind NOT IN ('feed_post','community_post') OR p_target IS NULL
 OR p_url IS NULL OR p_path IS NULL OR p_stage NOT IN ('preflight','complete')
 OR p_path !~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9._-]+)+$'
 OR pg_catalog.strpos(p_path,'..')>0 OR pg_catalog.length(p_path)>400
 THEN RETURN false; END IF;

 v_expected_bucket:=CASE p_kind WHEN 'feed_post' THEN 'post-photos'
                                    ELSE 'community-post-photos' END;
 IF p_bucket IS DISTINCT FROM v_expected_bucket THEN RETURN false; END IF;

 -- Locks protect the decision and final status; all operations against
 -- one target follow restriction -> media claim order.
 PERFORM 1 FROM moderation_private.content_restrictions r
 WHERE r.target_kind=p_kind AND r.target_id=p_target
   AND r.media_status='pending_review' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;

 IF p_kind='feed_post' THEN
   SELECT p.user_id,p.photo_url INTO v_owner,v_url
     FROM public.posts p WHERE p.id=p_target FOR SHARE;
 ELSE
   SELECT cp.author_user_id,cp.photo_url,cp.photo_storage_path
   INTO v_owner,v_url,v_path
   FROM public.community_posts cp WHERE cp.id=p_target FOR SHARE;
   IF v_path IS DISTINCT FROM p_path THEN RETURN false; END IF;
 END IF;
 IF v_owner IS NULL OR v_url IS DISTINCT FROM p_url OR NULLIF(pg_catalog.btrim(v_url),'') IS NULL
 THEN RETURN false; END IF;

 SELECT COALESCE(SUM(n),0) INTO v_refs FROM(
   SELECT COUNT(*)::bigint n FROM public.posts WHERE photo_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.posts WHERE pet_avatar=p_url
   UNION ALL SELECT COUNT(*) FROM public.community_posts WHERE photo_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.pets WHERE photo_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.communities WHERE image_url=p_url
   UNION ALL SELECT COUNT(*) FROM public.profiles WHERE avatar_url=p_url
 ) refs;
 IF v_refs<>1 THEN RETURN false; END IF;
 IF p_kind='community_post' AND
  (SELECT COUNT(*) FROM public.community_posts WHERE photo_storage_path=p_path)<>1
 THEN RETURN false; END IF;

 SELECT * INTO v_claim FROM moderation_private.media_claims c
 WHERE c.target_kind=p_kind AND c.target_id=p_target FOR SHARE;
 IF NOT FOUND OR v_claim.status<>'held' OR v_claim.checked_at IS NULL
  OR v_claim.bucket IS DISTINCT FROM p_bucket
  OR v_claim.snapshot->>'path' IS DISTINCT FROM p_path
  OR v_claim.snapshot->>'source_url' IS DISTINCT FROM p_url
  OR v_claim.snapshot->>'owner_id' IS DISTINCT FROM v_owner::text
  OR v_claim.snapshot->>'target_id' IS DISTINCT FROM p_target::text
  OR v_claim.snapshot->>'storage_object_id' IS DISTINCT FROM v_claim.storage_object_id::text
 THEN RETURN false; END IF;

 PERFORM 1 FROM moderation_private.reports report
 WHERE report.id=v_claim.report_id AND report.status='removed'
   AND report.target_kind=p_kind AND report.target_id=p_target;
 IF NOT FOUND THEN RETURN false; END IF;

 IF p_stage='preflight' THEN
  IF v_claim.expires_at<=pg_catalog.clock_timestamp() THEN RETURN false; END IF;
  -- The existing probe checks live Storage UUID, version, owner, layout,
  -- original post/pet relationship and shared URL aliases.
  v_live:=moderation_private.f14_media_probe(p_kind,p_target);
  IF v_live IS NULL OR v_live IS DISTINCT FROM v_claim.snapshot THEN RETURN false; END IF;
  RETURN true;
 END IF;

 -- Finalization is a distinct request AFTER successful Storage API removal,
 -- exists=false and HEAD/GET checks in Edge. Permit late reconciliation if
 -- claim expiry elapsed during CDN verification (but never new deletion).
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE
   o.bucket_id=p_bucket AND o.name=p_path) THEN RETURN false; END IF;
 UPDATE moderation_private.content_restrictions
   SET media_status='purged'
 WHERE target_kind=p_kind AND target_id=p_target AND media_status='pending_review';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END;
$f14_media_gate$;

REVOKE ALL ON FUNCTION public.f14_moderation_media_gate(text,uuid,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_moderation_media_gate(text,uuid,text,text,text,text)
 TO service_role;

-- Preserve the existing rejection trigger, narrowing its exception to
-- server-only, exact held-claim verification AFTER storage metadata is gone.
-- This is NOT a generic service-role exemption or a session flag bypass.
CREATE OR REPLACE FUNCTION moderation_private.f14_reject_unverified_purged()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $f14_verified_purged$
BEGIN
 IF NEW.media_status='purged' THEN
  IF TG_OP<>'UPDATE' THEN
   RAISE EXCEPTION 'Cannot insert purged media without verified cleanup' USING ERRCODE='23514';
  END IF;
  IF OLD.media_status IS DISTINCT FROM 'pending_review'
    OR OLD.target_kind IS DISTINCT FROM NEW.target_kind
    OR OLD.target_id IS DISTINCT FROM NEW.target_id
    OR pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
    OR NOT EXISTS(
      SELECT 1 FROM moderation_private.media_claims c
      JOIN moderation_private.reports r ON r.id=c.report_id
      WHERE c.target_kind=NEW.target_kind AND c.target_id=NEW.target_id
        AND c.report_id IS NOT DISTINCT FROM NEW.report_id
        AND c.status='held' AND c.checked_at IS NOT NULL
        AND r.status='removed' AND r.target_kind=c.target_kind
        AND r.target_id=c.target_id
        AND c.bucket IN ('post-photos','community-post-photos')
        AND c.snapshot->>'target_id'=c.target_id::text
        AND c.snapshot->>'storage_object_id'=c.storage_object_id::text
        AND NOT EXISTS (SELECT 1 FROM storage.objects o
          WHERE o.bucket_id=c.bucket AND o.name=c.snapshot->>'path')
    )
  THEN
   RAISE EXCEPTION 'F14 media cleanup lacks verified exact-object evidence' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END;
$f14_verified_purged$;
