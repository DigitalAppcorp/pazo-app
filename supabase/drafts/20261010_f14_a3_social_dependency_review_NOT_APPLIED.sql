-- PAZO F14 A3 | SOCIAL & FK DEPENDENCY INVENTORY ONLY
-- NOT APPLIED: no user, post, pet, comment or file is deleted or changed.
-- Database dependency counts were reconciled against hosted PostgreSQL
-- on 2026-10-10. This draft is not an installable migration.
BEGIN;
DO $a3_review_guard$
BEGIN
  RAISE EXCEPTION 'F14 A3 SOCIAL DEPENDENCY DRAFT NOT APPLIED';
END
$a3_review_guard$;

-- No personally identifying post text, comments, URLs, emails or UUID lists
-- are returned. This routine identifies which third-party content must
-- survive the account closure, before starting any destructive stage.
CREATE OR REPLACE FUNCTION public.f14_a3_social_dependency_review(
  p_subject_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_social_inventory$
DECLARE
  v_my_pets bigint;
  v_my_posts bigint;
  v_own_comments_elsewhere bigint;
  v_third_party_feed_replies bigint;
  v_third_party_community_replies bigint;
  v_third_party_community_posts bigint;
  v_owned_community_posts bigint;
  v_owned_communities bigint;
  v_documents bigint;
  v_care_items bigint;
  v_care_completions bigint;
  v_storage_owned bigint;
  v_held_claims bigint;
BEGIN
  IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role'
    OR p_subject_user_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM account_requests_private.deletion_requests r
      WHERE r.subject_user_id=p_subject_user_id
        AND r.status IN ('requested','processing')
    ) THEN
    RAISE EXCEPTION 'A3 private review access denied' USING ERRCODE='42501';
  END IF;

  SELECT count(*) INTO v_my_pets FROM public.pets
    WHERE owner_id=p_subject_user_id;
  SELECT count(*) INTO v_my_posts FROM public.posts p
    WHERE p.user_id=p_subject_user_id OR EXISTS(
      SELECT 1 FROM public.pets x WHERE x.id=p.pet_id
        AND x.owner_id=p_subject_user_id);
  SELECT count(*) INTO v_owned_communities
    FROM public.communities WHERE owner_user_id=p_subject_user_id;
  SELECT count(*) INTO v_owned_community_posts
    FROM public.community_posts cp
    WHERE cp.author_user_id=p_subject_user_id OR EXISTS(
      SELECT 1 FROM public.pets x WHERE x.id=cp.author_pet_id
        AND x.owner_id=p_subject_user_id);

  -- Replies by people OTHER than the departing author underneath that
  -- author's posts. ON DELETE CASCADE would otherwise erase their replies.
  SELECT count(*) INTO v_third_party_feed_replies
  FROM public.post_comments c
  JOIN public.posts p ON p.id=c.post_id
  JOIN public.pets commenter ON commenter.id=c.author_pet_id
  WHERE (p.user_id=p_subject_user_id OR EXISTS (
      SELECT 1 FROM public.pets ownpet
      WHERE ownpet.id=p.pet_id AND ownpet.owner_id=p_subject_user_id))
    AND commenter.owner_id<>p_subject_user_id;

  SELECT count(*) INTO v_third_party_community_replies
  FROM public.community_post_comments c
  JOIN public.community_posts p ON p.id=c.post_id
  JOIN public.pets commenter ON commenter.id=c.author_pet_id
  WHERE (p.author_user_id=p_subject_user_id OR EXISTS (
    SELECT 1 FROM public.pets ownpet
    WHERE ownpet.id=p.author_pet_id AND ownpet.owner_id=p_subject_user_id))
    AND commenter.owner_id<>p_subject_user_id;

  -- Entire conversations authored by others within a community whose
  -- owner is leaving. The COMMUNITY MUST REMAIN ARCHIVED, NOT BE DELETED.
  SELECT count(*) INTO v_third_party_community_posts
  FROM public.community_posts cp
  JOIN public.communities community ON community.id=cp.community_id
  WHERE community.owner_user_id=p_subject_user_id
    AND cp.author_user_id IS DISTINCT FROM p_subject_user_id;

  -- Own replies on other people's posts contain subject PII and are
  -- not to be retained or anonymized without a separate product policy.
  SELECT count(*) INTO v_own_comments_elsewhere
  FROM public.post_comments c
  JOIN public.pets ownpet ON ownpet.id=c.author_pet_id
  JOIN public.posts p ON p.id=c.post_id
  WHERE ownpet.owner_id=p_subject_user_id
    AND p.user_id IS DISTINCT FROM p_subject_user_id;

  SELECT count(*) INTO v_documents
    FROM public.pet_documents d JOIN public.pets p ON p.id=d.pet_id
    WHERE p.owner_id=p_subject_user_id;
  SELECT count(*) INTO v_care_items
    FROM public.care_items c JOIN public.pets p ON p.id=c.pet_id
    WHERE p.owner_id=p_subject_user_id;
  SELECT count(*) INTO v_care_completions
    FROM public.care_completions c JOIN public.pets p ON p.id=c.pet_id
    WHERE p.owner_id=p_subject_user_id;
  SELECT count(*) INTO v_storage_owned
    FROM storage.objects WHERE owner_id=p_subject_user_id::text;

  SELECT count(*) INTO v_held_claims FROM moderation_private.media_claims claim
  WHERE claim.status='held'
    AND claim.snapshot->>'owner_id'=p_subject_user_id::text;

  RETURN pg_catalog.jsonb_build_object(
    'owned_pets',v_my_pets,
    'owned_feed_posts',v_my_posts,
    'owned_community_posts',v_owned_community_posts,
    'owned_communities',v_owned_communities,
    'third_party_feed_replies_to_preserve',v_third_party_feed_replies,
    'third_party_community_replies_to_preserve',v_third_party_community_replies,
    'third_party_community_posts_to_preserve',v_third_party_community_posts,
    'own_feed_replies_elsewhere',v_own_comments_elsewhere,
    'owned_documents',v_documents,
    'owned_care_items',v_care_items,
    'owned_care_completions',v_care_completions,
    'owned_storage_objects',v_storage_owned,
    'held_moderation_claims',v_held_claims,
    'social_cleanup_verified',false,
    'destructive_execution_allowed',false
  );
END
$a3_social_inventory$;

REVOKE ALL ON FUNCTION public.f14_a3_social_dependency_review(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_social_dependency_review(uuid)
  TO service_role;

-- No UPDATE/DELETE of user data, no bypass of moderation holds and no
-- automatic tombstones. The author-deleted thread draft remains separate.
COMMIT;
