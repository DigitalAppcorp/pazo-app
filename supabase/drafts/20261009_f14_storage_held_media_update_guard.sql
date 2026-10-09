-- PAZO F14 A2 — NOT APPLIED. Product Owner migration gate required.
-- Candidate fail-closed media-lock hardening; does NOT enable moderated deletion.
-- Authoritative update of existing 20261009040957 held INSERT/DELETE guards.
--
-- Existing issue: old helper releases the write block automatically after
-- five minutes, even when a cleanup request may still be in flight.
-- Proposed: preserve the authenticated write block while claim.status='held',
-- regardless of expires_at; only explicit invalidation releases it.
-- Caveat: f14_recheck_media_claim() can invalidate expired claims, so a
-- future worker MUST serialize claims/rechecks/deletion. This patch alone
-- is NOT a cross-service lock/CAS and must not activate the purge Edge.
--
-- Also enforce UPDATE USING+WITH CHECK on held paths as defense-in-depth.
-- There is currently NO permissive UPDATE policy for authenticated roles.
--
-- service_role bypasses RLS. Never claim this protects privileged writes,
-- in-flight Storage API calls, COPY/MOVE paths, or browser/CDN caches.
BEGIN;

CREATE OR REPLACE FUNCTION public.f14_storage_media_path_unclaimed(p_bucket text,p_path text)
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
     AND c.status='held'
 )
 END;
$$;
-- Existing narrow EXECUTE grants remain unchanged by CREATE OR REPLACE.
-- Do not broaden role grants or leak claim identifiers.

CREATE POLICY f14_media_claim_restrict_update
ON storage.objects
AS RESTRICTIVE FOR UPDATE
TO authenticated
USING (public.f14_storage_media_path_unclaimed(bucket_id,name))
WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name));

COMMIT;
