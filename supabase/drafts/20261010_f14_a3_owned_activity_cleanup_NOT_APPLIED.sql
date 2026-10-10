-- PAZO F14 A3 — OWNED ACTIVITY CLEANUP (CANDIDATE SQL, NOT APPLIED)
-- This isolated stage removes ONLY interactions, likes and replies written
-- by the departing pet's account. It never deletes a parent feed/community
-- post, community, pet, Auth identity, moderation evidence or Storage object.
--
-- Requires installed + tested:
--   A3 review jobs, reviewer grants, third-party snapshot, write fence,
--   deleted-author tombstones and media removal journal, in one audited
--   migration. No such integration is live as of 2026-10-10.
BEGIN;
DO $not_applied$
BEGIN
  RAISE EXCEPTION 'F14 A3 OWNED ACTIVITY DRAFT IS NOT AN APPLIED MIGRATION';
END
$not_applied$;

CREATE OR REPLACE FUNCTION public.f14_a3_remove_owned_activity(
 p_subject_user_id uuid,
 p_reviewer_user_id uuid,
 p_lease_token uuid,
 p_revision bigint
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_activity$
DECLARE
 v_now timestamptz := pg_catalog.clock_timestamp();
 v_feed_replies bigint:=0;
 v_group_replies bigint:=0;
 v_group_likes bigint:=0;
 v_interactions bigint:=0;
BEGIN
 IF COALESCE(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role'
   OR p_subject_user_id IS NULL
   OR p_reviewer_user_id IS NULL
   OR p_subject_user_id=p_reviewer_user_id
   OR p_lease_token IS NULL OR p_revision IS NULL THEN
   RAISE EXCEPTION 'A3 cleanup is not authorized' USING ERRCODE='42501';
 END IF;

 -- Linearize with concurrent cancellation and writes. This row remains
 -- locked until all four child-table deletions and counter updates commit.
 PERFORM 1 FROM account_requests_private.deletion_requests r
 WHERE r.subject_user_id=p_subject_user_id AND r.status='processing'
 FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Deletion request not processing' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM account_requests_private.deletion_review_jobs j
 JOIN account_requests_private.deletion_review_operators op
   ON op.operator_user_id=j.reviewer_user_id
 WHERE j.subject_user_id=p_subject_user_id
   AND j.reviewer_user_id=p_reviewer_user_id
   AND j.lease_token=p_lease_token AND j.revision=p_revision
   AND j.lease_expires_at>v_now AND j.phase='clean_private_data'
 FOR UPDATE OF j;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Stale reviewer lease or phase' USING ERRCODE='42501';
 END IF;

 -- The write-fence trigger verifies this SAME live lease and processing
 -- phase for every write in this transaction. This value is transaction-local
 -- and cannot be authorized solely by a browser or unverified service call.
 PERFORM pg_catalog.set_config('pazo.a3_cleanup_lease',
   p_lease_token::text,true);

 -- Fails closed if the media and social archive prerequisites remain.
 IF EXISTS(SELECT 1 FROM storage.objects o
   WHERE o.owner_id=p_subject_user_id::text)
 OR EXISTS(SELECT 1 FROM moderation_private.media_claims claim
   WHERE claim.status='held'
     AND claim.snapshot->>'owner_id'=p_subject_user_id::text)
 OR EXISTS(SELECT 1 FROM public.posts p
   WHERE p.user_id=p_subject_user_id
     AND pg_catalog.jsonb_typeof(p.comments)='array'
     AND pg_catalog.jsonb_array_length(p.comments)>0)
 THEN
   RAISE EXCEPTION 'Media, claim or legacy comments require reconciliation'
     USING ERRCODE='42501';
 END IF;

 -- There must be no departing-author post that is still live while
 -- containing other people's replies. Such posts require redaction and
 -- ON DELETE SET NULL FK conversion before any dependent cleanup.
 IF EXISTS(
   SELECT 1 FROM public.posts p
   JOIN public.post_comments c ON c.post_id=p.id
   JOIN public.pets pet ON pet.id=c.author_pet_id
   WHERE p.user_id=p_subject_user_id AND pet.owner_id<>p_subject_user_id
     AND p.author_deleted_at IS NULL
 ) OR EXISTS(
   SELECT 1 FROM public.community_posts cp
   JOIN public.community_post_comments c ON c.post_id=cp.id
   JOIN public.pets pet ON pet.id=c.author_pet_id
   WHERE cp.author_user_id=p_subject_user_id
     AND pet.owner_id<>p_subject_user_id
     AND cp.author_deleted_at IS NULL
 ) THEN
   RAISE EXCEPTION 'Third-party replies have not been preserved'
     USING ERRCODE='42501';
 END IF;

 -- Strict snapshot test: the original IDs and authors must still exist.
 IF EXISTS(
  SELECT 1 FROM account_requests_private.deletion_third_party_evidence e
  WHERE e.subject_user_id=p_subject_user_id AND (
    (e.contribution_kind='feed_reply' AND NOT EXISTS(
      SELECT 1 FROM public.post_comments c
      WHERE c.id=e.contribution_id AND c.author_pet_id=e.author_id))
    OR (e.contribution_kind='community_reply' AND NOT EXISTS(
      SELECT 1 FROM public.community_post_comments c
      WHERE c.id=e.contribution_id AND c.author_pet_id=e.author_id))
    OR (e.contribution_kind='community_post' AND NOT EXISTS(
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id=e.contribution_id AND cp.author_user_id=e.author_id))
  )
 ) THEN
   RAISE EXCEPTION 'Foreign contribution missing from frozen snapshot'
     USING ERRCODE='42501';
 END IF;

 -- Only owned replies are removed. Recount parent denormalized counters;
 -- never DELETE a post containing someone else's message by CASCADE.
 WITH removed AS(
   DELETE FROM public.post_comments c
   USING public.pets pet
   WHERE c.author_pet_id=pet.id AND pet.owner_id=p_subject_user_id
   RETURNING c.post_id
 ), touched AS(
   SELECT DISTINCT post_id FROM removed
 )
 UPDATE public.posts p
 SET comments_count=(
   SELECT count(*) FROM public.post_comments c WHERE c.post_id=p.id
 )
 WHERE p.id IN (SELECT post_id FROM touched);
 -- Counts are aggregate only: no message bodies returned.

 WITH removed AS(
   DELETE FROM public.community_post_comments c
   USING public.pets pet
   WHERE c.author_pet_id=pet.id AND pet.owner_id=p_subject_user_id
   RETURNING c.post_id
 ), touched AS(
   SELECT DISTINCT post_id FROM removed
 )
 UPDATE public.community_posts cp
 SET comments_count=(
   SELECT count(*) FROM public.community_post_comments c
   WHERE c.post_id=cp.id
 )
 WHERE cp.id IN (SELECT post_id FROM touched);

 WITH removed AS(
   DELETE FROM public.community_post_likes l
   USING public.pets pet
   WHERE l.actor_pet_id=pet.id AND pet.owner_id=p_subject_user_id
   RETURNING l.post_id
 ), touched AS(
   SELECT DISTINCT post_id FROM removed
 )
 UPDATE public.community_posts cp
 SET likes_count=(
   SELECT count(*) FROM public.community_post_likes l
   WHERE l.post_id=cp.id
 )
 WHERE cp.id IN (SELECT post_id FROM touched);

 WITH removed AS(
   DELETE FROM public.interactions i
   USING public.pets pet
   WHERE i.actor_pet_id=pet.id AND pet.owner_id=p_subject_user_id
   RETURNING i.target_id,i.target_type,i.action_type
 ), touched AS(
   SELECT DISTINCT target_id FROM removed
   WHERE target_type='post' AND action_type IN ('like','unlike')
 )
 UPDATE public.posts p
 SET likes=(
   SELECT count(*) FROM public.interactions i
   WHERE i.target_type='post'
     AND i.action_type='like' AND i.target_id=p.id
 )
 WHERE p.id IN (SELECT target_id FROM touched);

 -- Final structural test for any unexpected fan-out into foreign content.
 IF EXISTS(
  SELECT 1 FROM account_requests_private.deletion_third_party_evidence e
  WHERE e.subject_user_id=p_subject_user_id AND (
    (e.contribution_kind='feed_reply' AND NOT EXISTS(
      SELECT 1 FROM public.post_comments c
      WHERE c.id=e.contribution_id AND c.author_pet_id=e.author_id))
    OR (e.contribution_kind='community_reply' AND NOT EXISTS(
      SELECT 1 FROM public.community_post_comments c
      WHERE c.id=e.contribution_id AND c.author_pet_id=e.author_id))
    OR (e.contribution_kind='community_post' AND NOT EXISTS(
      SELECT 1 FROM public.community_posts cp
      WHERE cp.id=e.contribution_id AND cp.author_user_id=e.author_id))
  )
 ) THEN
   RAISE EXCEPTION 'Third-party contribution disappeared'
     USING ERRCODE='42501';
 END IF;

 -- Intentionally not advancing phase or claiming the account was deleted:
 -- every later cleanup stage needs independent proof and a durable checkpoint.
 RETURN pg_catalog.jsonb_build_object(
   'owned_replies_removed_for_review',true,
   'third_party_survival_rechecked',true,
   'account_deleted',false,'destructive_execution_allowed',false
 );
END
$a3_activity$;

REVOKE ALL ON FUNCTION public.f14_a3_remove_owned_activity(uuid,uuid,uuid,bigint)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f14_a3_remove_owned_activity(uuid,uuid,uuid,bigint)
  TO service_role;
COMMIT;
