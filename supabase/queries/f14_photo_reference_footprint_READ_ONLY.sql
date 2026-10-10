-- PAZO F14: exact URL-to-Storage metadata match by media category.
-- A nonmatching public URL may be legacy/external/cached and must be
-- investigated: never interpret it as authorization to delete an object.
-- Operator-only, READ ONLY; no object paths or URLs returned.
WITH refs AS (
 SELECT p.photo_url AS url,'post-photos'::text AS bucket FROM public.posts p
 WHERE NULLIF(p.photo_url,'') IS NOT NULL
 UNION ALL SELECT cp.photo_url,'community-post-photos' FROM public.community_posts cp
 WHERE NULLIF(cp.photo_url,'') IS NOT NULL
 UNION ALL SELECT pet.photo_url,'pet-avatars' FROM public.pets pet
 WHERE NULLIF(pet.photo_url,'') IS NOT NULL
)
SELECT bucket, COUNT(*) AS references,
 COUNT(*) FILTER(WHERE EXISTS(
   SELECT 1 FROM storage.objects o WHERE o.bucket_id=refs.bucket
   AND pg_catalog.right(refs.url,pg_catalog.length('/storage/v1/object/public/'||o.bucket_id||'/'||o.name))
    =('/storage/v1/object/public/'||o.bucket_id||'/'||o.name)
 )) AS exact_matches,
 COUNT(*) FILTER(WHERE NOT EXISTS(
   SELECT 1 FROM storage.objects o WHERE o.bucket_id=refs.bucket
   AND pg_catalog.right(refs.url,pg_catalog.length('/storage/v1/object/public/'||o.bucket_id||'/'||o.name))
    =('/storage/v1/object/public/'||o.bucket_id||'/'||o.name)
 )) AS unresolved,
 false AS safe_to_delete
FROM refs GROUP BY bucket ORDER BY bucket;
