-- READ-ONLY operational inventory; never a deletion script or automatic eligibility list.
-- Exact paths/IDs, when needed for one approved object, belong only in a private operator record.
BEGIN READ ONLY;
WITH urls AS (
  SELECT photo_url AS url FROM public.posts
  UNION ALL SELECT pet_avatar FROM public.posts
  UNION ALL SELECT photo_url FROM public.community_posts
  UNION ALL SELECT photo_url FROM public.pets
  UNION ALL SELECT image_url FROM public.communities
  UNION ALL SELECT avatar_url FROM public.profiles
), inventory AS (
  SELECT o.id, o.bucket_id, o.name, o.created_at,
    (SELECT count(*) FROM public.community_posts p WHERE p.photo_storage_path=o.name)
    + (SELECT count(*) FROM urls u WHERE
      right(split_part(replace(replace(u.url,'%2F','/'),'%2f','/'), '?', 1),
        length(o.bucket_id || '/' || o.name)+1) = '/' || o.bucket_id || '/' || o.name
      ) AS reference_count,
    EXISTS (SELECT 1 FROM moderation_private.media_claims c
      WHERE c.bucket=o.bucket_id AND (c.storage_object_id=o.id OR c.snapshot->>'path'=o.name)
    ) AS has_claim
  FROM storage.objects o
  WHERE o.bucket_id='community-post-photos'
), classified AS (
  SELECT *, CASE WHEN has_claim THEN 'claimed_hold'
    WHEN reference_count>0 THEN 'referenced_keep'
    ELSE 'unreferenced_needs_review' END AS review_state
  FROM inventory
)
SELECT review_state, count(*) AS object_count
FROM classified GROUP BY review_state ORDER BY review_state;
-- For ONE approved candidate only, the operator may replace the final SELECT with:
-- SELECT id,bucket_id,name,created_at,reference_count,has_claim,review_state
-- FROM classified WHERE id=:'object_id'::uuid;
-- A zero-reference result is NOT permission to delete. See the reconciliation SOP.
ROLLBACK;
