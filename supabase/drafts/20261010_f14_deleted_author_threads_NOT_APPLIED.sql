-- F14 / AUTHOR-DELETED THREAD CONTINUITY, DRAFT / NOT APPLIED
-- Policy approved by PO: clear departing author's personal text/media, retain
-- third-party replies beneath a neutral "Autor eliminado" thread.
-- DO NOT APPLY without separate migration gate. This is not the Auth/Storage
-- deletion executor. Existing media remains untouched by this SQL.
BEGIN;
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
 author_deleted_at IS NULL OR
 (user_id IS NULL AND pet_id IS NULL AND pet_name='Autor eliminado'
  AND pet_species='otro' AND pet_avatar IS NULL AND location IS NULL
  AND text='' AND photo_url IS NULL AND tags='{}'::text[]
  AND comments='[]'::jsonb)
);
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_content_required;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_content_required CHECK(
 author_deleted_at IS NOT NULL OR btrim(body)<>'' OR photo_url IS NOT NULL
);
ALTER TABLE public.community_posts ADD CONSTRAINT f14_community_deleted_author_sanitized CHECK (
 author_deleted_at IS NULL OR
 (author_user_id IS NULL AND author_pet_id IS NULL
  AND body='' AND photo_url IS NULL AND photo_storage_path IS NULL)
);
-- This server-only step is prepared, not installed or executed. A separate
-- worker must first freeze access, clear physical media through Storage API,
-- verify URL references and handle every other personal data category.
CREATE OR REPLACE FUNCTION public.pazo_redact_social_threads(p_subject uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $redact$
DECLARE v_feed int;v_community int;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
   RAISE EXCEPTION 'Server authorization required' USING ERRCODE='42501';
 END IF;
 IF p_subject IS NULL THEN RAISE EXCEPTION 'Missing subject';END IF;
 PERFORM 1 FROM account_requests_private.deletion_requests req
 WHERE req.subject_user_id=p_subject AND req.status='processing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account request is not processing';END IF;
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
 THEN RAISE EXCEPTION 'Post photo still present in Storage';END IF;
 -- Preserve only discussions that have an actual third-party author.
 UPDATE public.posts p
 SET author_deleted_at=pg_catalog.clock_timestamp(),
     user_id=NULL,pet_id=NULL,pet_name='Autor eliminado',pet_species='otro',
     pet_avatar=NULL,location=NULL,text='',photo_url=NULL,
     tags='{}'::text[],comments='[]'::jsonb,likes=0
 WHERE p.user_id=p_subject AND p.author_deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM public.post_comments c
   JOIN public.pets pet ON pet.id=c.author_pet_id
   WHERE c.post_id=p.id AND pet.owner_id<>p_subject);
 GET DIAGNOSTICS v_feed=ROW_COUNT;
 UPDATE public.community_posts cp
 SET author_deleted_at=pg_catalog.clock_timestamp(),
     author_user_id=NULL,author_pet_id=NULL,body='',photo_url=NULL,
     photo_storage_path=NULL,likes_count=0
 WHERE cp.author_user_id=p_subject AND cp.author_deleted_at IS NULL
 AND EXISTS(SELECT 1 FROM public.community_post_comments c
   JOIN public.pets pet ON pet.id=c.author_pet_id
   WHERE c.post_id=cp.id AND pet.owner_id<>p_subject);
 GET DIAGNOSTICS v_community=ROW_COUNT;
 RETURN pg_catalog.jsonb_build_object('feed_redacted',v_feed,'community_redacted',v_community,
   'account_deleted',false,'storage_deleted',false);
END;
$redact$;
REVOKE ALL ON FUNCTION public.pazo_redact_social_threads(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_redact_social_threads(uuid) TO service_role;
COMMIT;
