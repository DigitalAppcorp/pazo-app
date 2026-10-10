-- F14 / AUTHOR-DELETED THREAD CONTINUITY, DRAFT / NOT APPLIED
-- Policy approved by PO: clear departing author's personal text/media, retain
-- third-party replies beneath a neutral "Autor eliminado" thread.
-- DO NOT APPLY without separate migration gate. This is not the Auth/Storage
-- deletion executor. Existing media remains untouched by this SQL.
BEGIN;
-- Fail closed even if this draft is accidentally submitted to a SQL runner.
-- A future approved migration must be rebuilt and integration-tested separately.
DO $a3_uninstalled$
BEGIN
  RAISE EXCEPTION 'F14 DELETED AUTHOR DRAFT NOT APPLIED: Requires isolated FK and third-party QA';
END
$a3_uninstalled$;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_deleted_at timestamptz;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS author_deleted_at timestamptz;
-- A retained thread must survive later deletion of the author and their pet.
ALTER TABLE public.posts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.posts DROP CONSTRAINT posts_user_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey
 FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.posts DROP CONSTRAINT posts_pet_id_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_pet_id_fkey
 FOREIGN KEY(pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
ALTER TABLE public.community_posts ALTER COLUMN author_user_id DROP NOT NULL;
ALTER TABLE public.community_posts ALTER COLUMN author_pet_id DROP NOT NULL;
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_author_user_id_fkey;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_author_user_id_fkey
 FOREIGN KEY(author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_author_pet_id_fkey;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_author_pet_id_fkey
 FOREIGN KEY(author_pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;
-- A redacted post has no owner reference, identifiable data or media URL.
-- The ordinary insert path cannot create an author-deleted row with an owner.
ALTER TABLE public.posts ADD CONSTRAINT f14_posts_deleted_author_sanitized CHECK (
 (author_deleted_at IS NULL AND user_id IS NOT NULL) OR
 (author_deleted_at IS NOT NULL AND user_id IS NULL AND pet_id IS NULL AND pet_name='Autor eliminado'
  AND pet_species='otro' AND pet_avatar IS NULL AND location IS NULL
  AND text='' AND photo_url IS NULL AND tags='{}'::text[]
  AND comments='[]'::jsonb)
);
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_content_required;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_content_required CHECK(
 author_deleted_at IS NOT NULL OR btrim(body)<>'' OR photo_url IS NOT NULL
);
ALTER TABLE public.community_posts ADD CONSTRAINT f14_community_deleted_author_sanitized CHECK (
 (author_deleted_at IS NULL AND author_user_id IS NOT NULL AND author_pet_id IS NOT NULL) OR
 (author_deleted_at IS NOT NULL AND author_user_id IS NULL AND author_pet_id IS NULL
  AND body='' AND photo_url IS NULL AND photo_storage_path IS NULL)
);
-- A retained reply thread is read-only. Client code cannot be the security
-- boundary: direct REST/RPC writes to tombstones must fail at the database.
CREATE OR REPLACE FUNCTION private.f14_guard_deleted_thread_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
DECLARE v_deleted timestamptz;
BEGIN
 IF TG_TABLE_NAME='post_comments' THEN
   SELECT p.author_deleted_at INTO v_deleted FROM public.posts p WHERE p.id=NEW.post_id;
 ELSIF TG_TABLE_NAME='community_post_comments'
    OR TG_TABLE_NAME='community_post_likes' THEN
   SELECT cp.author_deleted_at INTO v_deleted FROM public.community_posts cp WHERE cp.id=NEW.post_id;
 ELSIF TG_TABLE_NAME='interactions' AND NEW.target_type='post' THEN
   SELECT p.author_deleted_at INTO v_deleted FROM public.posts p WHERE p.id=NEW.target_id;
 END IF;
 IF v_deleted IS NOT NULL THEN
   RAISE EXCEPTION 'Archived deleted-author discussion is read only'
     USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION private.f14_guard_deleted_thread_write()
 FROM PUBLIC,anon,authenticated;
CREATE TRIGGER f14_block_deleted_feed_replies
 BEFORE INSERT OR UPDATE ON public.post_comments
 FOR EACH ROW EXECUTE FUNCTION private.f14_guard_deleted_thread_write();
CREATE TRIGGER f14_block_deleted_community_replies
 BEFORE INSERT OR UPDATE ON public.community_post_comments
 FOR EACH ROW EXECUTE FUNCTION private.f14_guard_deleted_thread_write();
CREATE TRIGGER f14_block_deleted_community_likes
 BEFORE INSERT OR UPDATE ON public.community_post_likes
 FOR EACH ROW EXECUTE FUNCTION private.f14_guard_deleted_thread_write();
CREATE TRIGGER f14_block_deleted_feed_interactions
 BEFORE INSERT OR UPDATE ON public.interactions
 FOR EACH ROW EXECUTE FUNCTION private.f14_guard_deleted_thread_write();

-- This server-only step is prepared, not installed or executed. A separate
-- worker must first freeze access, clear physical media through Storage API,
-- verify URL references and handle every other personal data category.
CREATE OR REPLACE FUNCTION public.pazo_redact_social_threads(
 p_subject uuid,p_reviewer_user_id uuid,p_lease_token uuid,p_revision bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $redact$
DECLARE v_feed int;v_community int;
BEGIN
 IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
   RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501';
 END IF;
 IF p_subject IS NULL OR p_reviewer_user_id IS NULL OR p_subject=p_reviewer_user_id
   OR p_lease_token IS NULL OR p_revision IS NULL THEN
   RAISE EXCEPTION 'Missing or invalid supervised cleanup identifiers' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests req
 WHERE req.subject_user_id=p_subject AND req.status='processing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account request is not processing';END IF;
 PERFORM 1 FROM account_requests_private.deletion_review_jobs j
 JOIN account_requests_private.deletion_review_operators op
   ON op.operator_user_id=j.reviewer_user_id
 WHERE j.subject_user_id=p_subject
   AND j.reviewer_user_id=p_reviewer_user_id
   AND j.lease_token=p_lease_token AND j.revision=p_revision
   AND j.lease_expires_at>pg_catalog.clock_timestamp()
   AND j.phase IN ('preserve_others','clean_private_data')
 FOR UPDATE OF j;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Redaction lease or phase is not valid' USING ERRCODE='42501';
 END IF;
 PERFORM pg_catalog.set_config('pazo.a3_cleanup_lease',p_lease_token::text,true);
 -- A held moderation claim is a legal/security dependency, not cleanup.
 IF EXISTS(SELECT 1 FROM moderation_private.media_claims claim
   WHERE claim.status='held' AND claim.snapshot->>'owner_id'=p_subject::text)
 THEN RAISE EXCEPTION 'Held moderation claim requires reconciliation';END IF;
 -- Never redact a post while physical media remains available in Storage,
 -- even when the database row is about to lose its public URL.
 IF EXISTS(SELECT 1 FROM storage.objects obj WHERE obj.owner_id=p_subject::text)
 THEN RAISE EXCEPTION 'Storage media not physically reconciled';END IF;
 IF EXISTS(SELECT 1 FROM public.posts p WHERE p.user_id=p_subject
   AND jsonb_typeof(p.comments)='array' AND jsonb_array_length(p.comments)>0)
 THEN RAISE EXCEPTION 'Legacy embedded comments require reconciliation';END IF;
 -- Do not erase the author's original post until the image no longer has
 -- a live Storage metadata object, including a legacy non-owner match.
 IF EXISTS(SELECT 1 FROM public.posts p JOIN storage.objects obj ON
   obj.bucket_id='post-photos' AND p.photo_url IS NOT NULL
   AND pg_catalog.right(p.photo_url,pg_catalog.length('/storage/v1/object/public/'||obj.bucket_id||'/'||obj.name))
      =('/storage/v1/object/public/'||obj.bucket_id||'/'||obj.name)
   WHERE p.user_id=p_subject)
 OR EXISTS(SELECT 1 FROM public.community_posts cp JOIN storage.objects obj ON
   obj.bucket_id='community-post-photos' AND cp.photo_url IS NOT NULL
   AND pg_catalog.right(cp.photo_url,pg_catalog.length('/storage/v1/object/public/'||obj.bucket_id||'/'||obj.name))
      =('/storage/v1/object/public/'||obj.bucket_id||'/'||obj.name)
   WHERE cp.author_user_id=p_subject)
 OR EXISTS(SELECT 1 FROM public.community_posts cp JOIN storage.objects obj
   ON obj.bucket_id='community-post-photos'
   AND cp.photo_storage_path=obj.name
   WHERE cp.author_user_id=p_subject)
 THEN RAISE EXCEPTION 'Post photo still present in Storage';END IF;
 -- Existing external/legacy URLs are not evidence of deletion from that
 -- provider. Also check the pet avatar source independently.
 IF EXISTS(SELECT 1 FROM public.posts p WHERE p.user_id=p_subject AND p.photo_url IS NOT NULL
    AND pg_catalog.strpos(p.photo_url,'/storage/v1/object/public/post-photos/')=0)
 OR EXISTS(SELECT 1 FROM public.community_posts cp WHERE cp.author_user_id=p_subject
    AND cp.photo_url IS NOT NULL
    AND pg_catalog.strpos(cp.photo_url,'/storage/v1/object/public/community-post-photos/')=0)
 OR EXISTS(SELECT 1 FROM public.pets pet WHERE pet.owner_id=p_subject AND pet.photo_url IS NOT NULL
    AND pg_catalog.strpos(pet.photo_url,'/storage/v1/object/public/pet-avatars/')=0)
 THEN RAISE EXCEPTION 'External or legacy media requires verified provider cleanup';END IF;

 -- Preserve only discussions that have an actual third-party author.
 UPDATE public.posts p
 SET author_deleted_at=pg_catalog.clock_timestamp(),
     user_id=NULL,pet_id=NULL,pet_name='Autor eliminado',pet_species='otro',
     pet_avatar=NULL,location=NULL,text='',photo_url=NULL,
     tags='{}'::text[],comments='[]'::jsonb,likes=0,
     comments_count=(SELECT count(*) FROM public.post_comments remaining
       WHERE remaining.post_id=p.id)
 WHERE p.user_id=p_subject AND p.author_deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM public.post_comments c
   JOIN public.pets pet ON pet.id=c.author_pet_id
   WHERE c.post_id=p.id AND pet.owner_id<>p_subject);
 GET DIAGNOSTICS v_feed=ROW_COUNT;
 UPDATE public.community_posts cp
 SET author_deleted_at=pg_catalog.clock_timestamp(),
     author_user_id=NULL,author_pet_id=NULL,body='',photo_url=NULL,
     photo_storage_path=NULL,likes_count=0,
     comments_count=(SELECT count(*) FROM public.community_post_comments remaining
       WHERE remaining.post_id=cp.id)
 WHERE cp.author_user_id=p_subject AND cp.author_deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM public.community_post_comments c
   JOIN public.pets pet ON pet.id=c.author_pet_id
   WHERE c.post_id=cp.id AND pet.owner_id<>p_subject);
 GET DIAGNOSTICS v_community=ROW_COUNT;
 RETURN pg_catalog.jsonb_build_object('feed_redacted',v_feed,'community_redacted',v_community,
   'account_deleted',false,'storage_deleted',false);
END;
$redact$;
-- The existing recommendation RPC joins posts to pets with an INNER JOIN.
-- Once the author and pet are detached, that would silently hide preserved
-- third-party replies from the real Feed. Keep such threads discoverable,
-- while retaining normal recommendation privacy and moderation restrictions.
CREATE OR REPLACE FUNCTION public.get_recommended_posts_page(p_actor_pet_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS SETOF posts
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_explicit_interests text[];
  v_top_learned text[];
  v_combined text[];
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.pets actor
    WHERE actor.id = p_actor_pet_id
      AND actor.owner_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: La mascota no pertenece al usuario autenticado.';
  END IF;

  SELECT ppd.interests
  INTO v_explicit_interests
  FROM public.pet_private_details ppd
  WHERE ppd.pet_id = p_actor_pet_id;

  SELECT array_agg(s.key ORDER BY s.score DESC)
  INTO v_top_learned
  FROM (
    SELECT kv.key, kv.value::numeric AS score
    FROM public.pet_private_metrics ppm
    CROSS JOIN LATERAL jsonb_each_text(ppm.learned_interests) AS kv(key, value)
    WHERE ppm.pet_id = p_actor_pet_id
      AND kv.value::numeric > 0
    ORDER BY kv.value::numeric DESC
    LIMIT 5
  ) s;

  v_combined := ARRAY(
    SELECT DISTINCT interest
    FROM unnest(
      COALESCE(v_explicit_interests, ARRAY[]::text[])
      || COALESCE(v_top_learned, ARRAY[]::text[])
    ) AS interest
    WHERE btrim(interest) <> ''
  );

  RETURN QUERY
  SELECT candidate.*
  FROM public.posts candidate
  LEFT JOIN public.pets candidate_pet
    ON candidate_pet.id = candidate.pet_id
  JOIN public.pets actor_pet
    ON actor_pet.id = p_actor_pet_id
  WHERE (
      (candidate.author_deleted_at IS NOT NULL AND EXISTS(
        SELECT 1 FROM public.post_comments pc WHERE pc.post_id=candidate.id
      ))
      OR
      (candidate.author_deleted_at IS NULL
       AND candidate_pet.owner_id <> actor_pet.owner_id
       AND public.f14_can_interact(candidate_pet.owner_id))
    )
    AND public.f14_content_visible('feed_post',candidate.id)
    AND NOT EXISTS(SELECT 1 FROM public.hidden_posts h WHERE h.user_id=auth.uid() AND h.post_id=candidate.id)
    AND NOT EXISTS (
      SELECT 1
      FROM public.follows f
      WHERE f.follower_id = p_actor_pet_id
        AND f.following_id = candidate.pet_id
    )
  ORDER BY
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.interactions i
        WHERE i.actor_pet_id = p_actor_pet_id
          AND i.target_id = candidate.id
          AND i.target_type = 'post'
          AND i.action_type IN ('impression', 'view', 'like')
          AND i.created_at > now() - interval '48 hours'
      )
      THEN 1
      ELSE 0
    END ASC,
    CASE
      WHEN COALESCE(array_length(v_combined, 1), 0) > 0
       AND candidate.tags && v_combined
      THEN 0
      ELSE 1
    END ASC,
    (
      (COALESCE(candidate.likes, 0) * 2 + 1)
      / power(
          (extract(epoch FROM (now() - candidate.created_at)) / 3600.0 + 2),
          1.5
        )
    ) DESC,
    candidate.created_at DESC,
    candidate.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.pazo_redact_social_threads(uuid,uuid,uuid,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_redact_social_threads(uuid,uuid,uuid,bigint) TO service_role;
COMMIT;
