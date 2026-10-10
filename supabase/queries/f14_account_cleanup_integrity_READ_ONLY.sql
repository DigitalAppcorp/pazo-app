-- PAZO F14: aggregate reference integrity, operator-only, READ ONLY.
-- Returns no UUIDs, emails, file names, media URLs or raw user content.
SELECT
 (SELECT count(*) FROM auth.users) AS auth_accounts,
 (SELECT count(*) FROM account_requests_private.deletion_requests WHERE status='requested') AS pending_requests,
 (SELECT count(*) FROM public.interactions i LEFT JOIN public.posts p
   ON p.id=i.target_id WHERE i.target_type='post' AND p.id IS NULL) AS orphan_feed_interactions,
 (SELECT count(*) FROM public.interactions i LEFT JOIN public.pets pet
   ON pet.id=i.actor_pet_id WHERE pet.id IS NULL) AS orphan_interaction_actors,
 (SELECT count(*) FROM public.posts p JOIN public.pets pet ON pet.id=p.pet_id
   WHERE p.user_id<>pet.owner_id) AS cross_owner_feed_posts,
 (SELECT count(*) FROM public.community_posts cp JOIN public.pets pet ON pet.id=cp.author_pet_id
   WHERE cp.author_user_id<>pet.owner_id) AS cross_owner_community_posts,
 (SELECT count(*) FROM moderation_private.media_claims c WHERE c.status='held') AS held_media_claims,
 (SELECT count(*) FROM public.pet_documents) AS private_document_records,
 (SELECT count(*) FROM storage.objects) AS all_storage_objects,
 false AS may_delete_auth,
 false AS may_delete_storage;
