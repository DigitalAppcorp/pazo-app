-- PAZO F14: READ-ONLY operator preflight for deletion requests.
-- Does not execute DELETE, UPDATE, INSERT or DDL. Run as trusted SQL operator.
-- No authenticated/public RPC is created. User IDs remain internal to the operator.
-- Additionally fails closed for the sole moderator account: do not remove
-- the only person able to review reports. This query never performs deletion.
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
 -- Interactions do not have FK to posts: preserve third-party activity.
 (SELECT count(*) FROM public.interactions i JOIN public.posts p ON p.id=i.target_id
  JOIN public.pets actor ON actor.id=i.actor_pet_id
  WHERE i.target_type='post' AND p.user_id=q.user_id AND actor.owner_id<>q.user_id
   AND i.action_type IN ('like','save','comment'))::int AS external_explicit_feed_interactions,
 (SELECT count(*) FROM public.interactions i JOIN public.posts p ON p.id=i.target_id
  JOIN public.pets actor ON actor.id=i.actor_pet_id
  WHERE i.target_type='post' AND p.user_id=q.user_id AND actor.owner_id<>q.user_id
   AND i.action_type='impression')::int AS external_feed_impressions,
 (SELECT count(*) FROM public.community_post_likes l JOIN public.community_posts cp ON cp.id=l.post_id
  JOIN public.pets actor ON actor.id=l.actor_pet_id
  WHERE cp.author_user_id=q.user_id AND actor.owner_id<>q.user_id)::int AS external_community_reactions,
 (SELECT count(*) FROM public.posts p JOIN public.pets pet ON pet.id=p.pet_id
  WHERE pet.owner_id=q.user_id AND p.user_id<>q.user_id)::int AS cross_owner_feed_posts_via_pet,
 (SELECT count(*) FROM public.community_posts cp JOIN public.pets pet ON pet.id=cp.author_pet_id
  WHERE pet.owner_id=q.user_id AND cp.author_user_id<>q.user_id)::int AS cross_owner_community_posts_via_pet,
 (SELECT count(*) FROM moderation_private.media_claims c
  WHERE c.status='held' AND c.snapshot->>'owner_id'=q.user_id::text)::int AS held_moderation_claims,
 (SELECT count(*) FROM (
   SELECT p.photo_url AS url,'post-photos'::text AS bucket FROM public.posts p
    WHERE p.user_id=q.user_id AND NULLIF(p.photo_url,'') IS NOT NULL
   UNION ALL SELECT cp.photo_url,'community-post-photos' FROM public.community_posts cp
    WHERE cp.author_user_id=q.user_id AND NULLIF(cp.photo_url,'') IS NOT NULL
   UNION ALL SELECT pet.photo_url,'pet-avatars' FROM public.pets pet
    WHERE pet.owner_id=q.user_id AND NULLIF(pet.photo_url,'') IS NOT NULL
  ) src WHERE NOT EXISTS (
   SELECT 1 FROM storage.objects o WHERE o.bucket_id=src.bucket
   AND pg_catalog.right(src.url,pg_catalog.length('/storage/v1/object/public/'||o.bucket_id||'/'||o.name))
    =('/storage/v1/object/public/'||o.bucket_id||'/'||o.name)
  ))::int AS unresolved_owned_photo_references,
 (SELECT count(*) FROM public.pet_documents d JOIN public.pets pet ON pet.id=d.pet_id
  WHERE pet.owner_id=q.user_id)::int AS pet_documents,
 (SELECT count(*) FROM storage.objects o WHERE o.owner_id=q.user_id::text)::int AS storage_objects,
 (SELECT count(*) FROM moderation_private.reports report WHERE
   report.target_owner_user_id=q.user_id OR report.reporter_user_id=q.user_id)::int AS moderation_records,
 (SELECT count(*) FROM moderation_private.moderator_grants g
   WHERE g.user_id=q.user_id)::int AS moderator_grants,
 CASE WHEN EXISTS(SELECT 1 FROM moderation_private.moderator_grants g
     WHERE g.user_id=q.user_id)
   AND (SELECT count(*) FROM moderation_private.moderator_grants)=1
  THEN 1 ELSE 0 END::int AS last_moderator_at_risk
 FROM candidate_users q
)
SELECT user_id,
 CASE
  WHEN last_moderator_at_risk=1 THEN 'blocked_last_moderator'
  WHEN (external_community_posts+external_community_comments+
        external_comments_on_own_community_posts+
        external_community_memberships+external_feed_comments+
        external_explicit_feed_interactions+external_community_reactions+
        cross_owner_feed_posts_via_pet+cross_owner_community_posts_via_pet)>0 THEN 'blocked_third_party'
  WHEN (owned_pets+owned_feed_posts+owned_communities+owned_community_posts+
        pet_documents+storage_objects+moderation_records+moderator_grants+
        external_feed_impressions+held_moderation_claims+
        unresolved_owned_photo_references)>0 THEN 'cleanup_required'
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
  'external_explicit_feed_interactions',external_explicit_feed_interactions,
  'external_feed_impressions',external_feed_impressions,
  'external_community_reactions',external_community_reactions,
  'cross_owner_feed_posts_via_pet',cross_owner_feed_posts_via_pet,
  'cross_owner_community_posts_via_pet',cross_owner_community_posts_via_pet,
  'held_moderation_claims',held_moderation_claims,
  'unresolved_owned_photo_references',unresolved_owned_photo_references,
  'pet_documents',pet_documents,
  'storage_objects',storage_objects,
  'moderation_records',moderation_records,
  'moderator_grants',moderator_grants,
  'last_moderator_at_risk',last_moderator_at_risk) AS dependency_counts,
 false AS may_delete_auth,
 false AS may_delete_storage
FROM counts ORDER BY readiness,user_id;
