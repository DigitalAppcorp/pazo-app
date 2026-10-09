-- PAZO F14 A2 — Installed Storage held-media guard 20261009040957.
-- Prevent authenticated user INSERT or DELETE on exactly the public object
-- path being held by a moderation media claim. No Storage API deletion.
-- Existing permissive policies remain untouched; this adds RESTRICTIVE policies.
-- IMPORTANT: Does not protect writes performed with service_role nor provide
-- atomic compare-and-delete across Storage and PostgreSQL.
BEGIN;
CREATE FUNCTION public.f14_storage_media_path_unclaimed(p_bucket text,p_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
 SELECT CASE
 WHEN p_bucket NOT IN ('post-photos','community-post-photos') THEN true
 WHEN p_path IS NULL OR p_path='' THEN false
 ELSE NOT EXISTS (
   SELECT 1
   FROM moderation_private.media_claims c
   WHERE c.bucket=p_bucket AND c.snapshot->>'path'=p_path
     AND c.status='held' AND c.expires_at>statement_timestamp()
 )
 END;
$$;
REVOKE ALL ON FUNCTION public.f14_storage_media_path_unclaimed(text,text)
FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f14_storage_media_path_unclaimed(text,text)
TO authenticated;

CREATE INDEX f14_media_claims_held_bucket_path_idx
ON moderation_private.media_claims (bucket,(snapshot->>'path'))
WHERE status='held';

CREATE POLICY f14_media_claim_restrict_insert
ON storage.objects
AS RESTRICTIVE FOR INSERT
TO authenticated
WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name));

CREATE POLICY f14_media_claim_restrict_delete
ON storage.objects
AS RESTRICTIVE FOR DELETE
TO authenticated
USING (public.f14_storage_media_path_unclaimed(bucket_id,name));
COMMIT;
