-- PAZO F14 A2 — DRAFT ONLY / NOT APPLIED / NOT APPROVED FOR PRODUCTION.
-- Intended companion for existing 20261009040957 held-media INSERT/DELETE guards.
-- Prevent an authenticated principal from changing the old OR new path of a
-- held media object if UPDATE/UPSERT/MOVE support is ever granted.
--
-- Current live storage.objects RLS audit (2026-10-08): NO PERMISSIVE UPDATE
-- policies, so owner UPDATE is already denied by default. This is defense in
-- depth and must never be represented as proof of a currently exploitable bypass.
--
-- Caveats: does not protect service_role, in-flight HTTP operations, five-minute
-- hold expiry, or prove CAS/object-version conditional deletion. Does not give
-- UPDATE capability by itself; a restrictive policy cannot grant access.
-- Requires Product Owner migration gate before execution against hosted PAZO.

BEGIN;

CREATE POLICY f14_media_claim_restrict_update
ON storage.objects
AS RESTRICTIVE FOR UPDATE
TO authenticated
USING (public.f14_storage_media_path_unclaimed(bucket_id,name))
WITH CHECK (public.f14_storage_media_path_unclaimed(bucket_id,name));

COMMIT;
