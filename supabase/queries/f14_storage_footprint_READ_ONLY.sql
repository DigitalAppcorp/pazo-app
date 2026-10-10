-- PAZO F14: bucket-level Storage review, aggregate/READ ONLY.
-- Bucket IDs are technical categories; no owner IDs, filenames or URLs.
SELECT b.id AS bucket,COUNT(o.id) AS objects,
 COUNT(o.id) FILTER(WHERE o.owner_id IS NULL) AS no_owner_id,
 false AS safe_to_delete
FROM storage.buckets b LEFT JOIN storage.objects o ON o.bucket_id=b.id
GROUP BY b.id ORDER BY b.id;
