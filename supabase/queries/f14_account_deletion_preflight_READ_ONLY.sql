-- PAZO F14: READ-ONLY operator preflight for deletion requests.
-- Does not execute DELETE, UPDATE, INSERT or DDL. Run as trusted SQL operator.
-- No authenticated/public RPC is created. User IDs remain internal to the operator.
-- For a scoped audit of all test accounts, temporarily replace the
-- candidate_users CTE with SELECT id AS user_id FROM auth.users.
WITH candidate_users AS (
 SELECT r.subject_user_id AS user_id
 FROM account_requests_private.deletion_requests r WHERE r.status='requested'
),
counts AS (
 SELECT q.user_id,
 (SELECT count(*) FROM public.pets p WHERE p.owner_id=q.user_id)::int AS owned_pets,
 (SELECT count(*) FROM public.posts p WHERE p.user_id=q.user_id)::int AS owned_feed_posts,
 (SELECT count(*) FROM public.communities c WHERE c.owner_user_id=q.user_id)::int AS owned_communities,
 (SELECT count(*) FROM public.community_posts cp WHERE cp.author_user_id=q.user_id)::int AS owned_community_posts,
 (SELECT count(*) FROM public.community_posts cp JOIN public.communities c ON c.id=cp.community_id
  WHERE c.owner_user_id=q.user_id AND cp.author_user_id<>q.user_id)::int AS external_community_posts,
 (SELECT count(*) FROM public.community_post_comments cm
  JOIN public.community_posts cp ON cp.id=cm.post_id
  JOIN public.communities c ON c.id=cp.community_id
  JOIN public.pets pet ON pet.id=cm.author_pet_id
  WHERE c.owner_user_id=q.user_id AND pet.owner_id<>q.user_id)::int AS external_community_comments,
 (SELECT count(*) FROM public.community_post_comments cm
  JOIN public.community_posts cp ON cp.id=cm.post_id
  JOIN public.pets pet ON pet.id=cm.author_pet_id
  WHERE cp.author_user_id=q.user_id AND pet.owner_id<>q.user_id)::int AS external_comments_on_own_community_posts,
 (SELECT count(*) FROM public.community_memberships member
  JOIN public.communities c ON c.id=member.community_id
  WHERE c.owner_user_id=q.user_id AND member.user_id<>q.user_id)::int AS external_community_memberships,
 (SELECT count(*) FROM public.post_comments cm
  JOIN public.posts p ON p.id=cm.post_id
  JOIN public.pets pet ON pet.id=cm.author_pet_id
  WHERE p.user_id=q.user_id AND pet.owner_id<>q.user_id)::int AS external_feed_comments,
 (SELECT count(*) FROM public.pet_documents d JOIN public.pets pet ON pet.id=d.pet_id
  WHERE pet.owner_id=q.user_id)::int AS pet_documents,
 (SELECT count(*) FROM storage.objects o WHERE o.owner_id=q.user_id::text)::int AS storage_objects,
 (SELECT count(*) FROM moderation_private.reports report WHERE
   report.target_owner_user_id=q.user_id OR report.reporter_user_id=q.user_id)::int AS moderation_records
 FROM candidate_users q
)
SELECT user_id,
 CASE
  WHEN (external_community_posts+external_community_comments+
        external_comments_on_own_community_posts+
        external_community_memberships+external_feed_comments)>0 THEN 'blocked_third_party'
  WHEN (owned_pets+owned_feed_posts+owned_communities+owned_community_posts+
        pet_documents+storage_objects+moderation_records)>0 THEN 'cleanup_required'
  ELSE 'awaiting_executor'
 END AS readiness,
 pg_catalog.jsonb_build_object(
  'owned_pets',owned_pets,
  'owned_feed_posts',owned_feed_posts,
  'owned_communities',owned_communities,
  'owned_community_posts',owned_community_posts,
  'external_community_posts',external_community_posts,
  'external_community_comments',external_community_comments,
  'external_comments_on_own_community_posts',external_comments_on_own_community_posts,
  'external_community_memberships',external_community_memberships,
  'external_feed_comments',external_feed_comments,
  'pet_documents',pet_documents,
  'storage_objects',storage_objects,
  'moderation_records',moderation_records) AS dependency_counts,
 false AS may_delete_auth,
 false AS may_delete_storage
FROM counts ORDER BY readiness,user_id;
