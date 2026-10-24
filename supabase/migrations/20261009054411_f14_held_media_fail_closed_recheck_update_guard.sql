-- PAZO F14 A2 — NOT APPLIED. Product Owner migration gate required.
-- Candidate fail-closed media-lock hardening; does NOT enable moderated deletion.
-- Authoritative update of existing 20261009040957 held INSERT/DELETE guards.
--
-- Existing issue: old helper releases the write block automatically after
-- five minutes, even when a cleanup request may still be in flight.
-- Proposed: preserve the authenticated write block while claim.status='held',
-- regardless of expires_at; only explicit invalidation releases it.
-- The candidate also makes f14_recheck_media_claim() return false on expiry
-- or source drift WITHOUT changing held status. A future worker MUST still
-- serialize claims, explicit releases and in-flight deletion. This patch
-- alone is NOT a cross-service lock/CAS and must not activate the purge Edge.
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

-- Keep held paths locked on expiry / drift. Recheck returns false but
-- does not release/invalidate the claim; operator recovery requires a separately
-- approved, auditable workflow after all in-flight Storage operations finish.
CREATE OR REPLACE FUNCTION public.f14_recheck_media_claim(p_claim uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $f14_recheck$
DECLARE v_claim moderation_private.media_claims%ROWTYPE; v_now jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_claim FROM moderation_private.media_claims
    WHERE claim_id=p_claim FOR UPDATE;
  IF NOT FOUND OR v_claim.status<>'held' THEN RETURN false; END IF;
  IF v_claim.expires_at<=clock_timestamp() THEN
    RETURN false;
  END IF;
  v_now:=moderation_private.f14_media_probe(v_claim.target_kind,v_claim.target_id);
  IF v_now IS NULL OR v_now IS DISTINCT FROM v_claim.snapshot THEN
    RETURN false;
  END IF;
  UPDATE moderation_private.media_claims SET checked_at=now() WHERE claim_id=p_claim;
  INSERT INTO moderation_private.media_claim_events(claim_id,event) VALUES(p_claim,'rechecked');
  RETURN true;
END;
$f14_recheck$;

CREATE POLICY f14_media_claim_restrict_update
ON storage.objects
AS RESTRICTIVE FOR UPDATE
TO authenticated
USING (public.f14_storage_media_path_unclaimed(bucket_id,name))
WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name));

COMMIT;
