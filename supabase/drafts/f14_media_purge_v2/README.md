# PAZO F14 A2 — Storage media deletion V2 SECURITY DRAFT

**State:** inspection and tests only. NEVER DEPLOY THIS DRAFT AS A PURGER. No hosted mutation, Storage DELETE, or secrets. The deployed Edge function at supabase/functions/f14-moderation-purge/index.ts must stay the HTTP 503 stub.

## Evidence, 2026-10-08, read-only hosted audit

- Five buckets: four public (post-photos: 10 files, pet-avatars: 3, community-post-photos: 3, community-avatars: 2) and one private (pet-documents: 1). Private documents and community avatars are excluded from this moderation-purge scope.
- Feed photo_url values: 13 total, 7 match existing post-photos objects, 6 are external/other or not resolvable in that bucket. Of the 7 exact matches, 3 use the current owner-user/pet/UUID.ext layout; 4 use historical pet/safe_file.ext. All seven matched author ownership; this does NOT prove arbitrary paths are safe.
- Pet avatars: 5 URLs, only 3 match Storage; 2 are external/other. Four pets have photo-bearing posts; an avatar-only deletion is not enough to withdraw a profile.
- Community posts: 2 photo posts have matching URL, path and Storage object.
- Public Storage URLs are not revoked by RLS on posts. Three post-photos files lack current source-row references: DO NOT auto-clean orphan objects.

## Candidate inspector and verification

The pure file mediaGuard.mjs consumes server-side task/proof metadata and returns either manual_review or candidate_only; NEVER approved, deleted or purged. No HTTP payload can be trusted for bucket, owner, object path or proof. mediaGuard.test.mjs contains hermetic synthetic tests with no network or destructive calls.

Supported *candidate* path types, subject to authoritative proof:
- Feed current: ownerUserId/petId/uuid.ext
- Feed historical: petId/safe_file.ext, but ONLY if the post belongs to that pet and the verified author owns that pet
- Community post: communityId/ownerUserId/uuid.ext; recorded URL AND stored path must agree
- Pet avatar: ownerUserId/uuid.ext; any associated photo-bearing pet posts or uncertain references trigger manual review

For all kinds, require a canonical https URL on the expected Supabase project and matching public bucket, expected Storage object ID/update timestamp, current removed report + pending media restriction, exact source reference count = 1 and zero references elsewhere. Reject external/signed URLs, double encoding, encoded slashes, traversal, shared or missing objects, mismatched ownership, wrong bucket and unverified conditions.

## Unimplemented mandatory deletion gates

1. Authenticate genuine JWT and enforce the moderator grant on the SERVER. Revoke access for normal and anonymous accounts. Separate signed-JWT script: scripts/f14-signed-jwt-authorization.mjs. Do not claim it passed until run with genuine, securely injected distinct user tokens.
2. Implement a trusted SECURITY DEFINER preflight RPC with strict EXECUTE grants. Derive object ID, owner, target media and ALL cross-content references on the server; never trust client evidence. Return a finite-lived plan. This is NOT implemented by the inspector.
3. Add an atomic, unique claim with object ID/version or metadata fingerprint and audit trail; lock against changing the media target during deletion. All retries must be idempotent. Requires a new migration and separate PO approval.
4. Revalidate Storage metadata immediately before mutation. Delete exactly one proved object using the Storage API, never SQL DELETE on storage.objects (that leaves orphaned bytes). Require Storage API response and a subsequent Storage info lookup confirming absence.
5. Confirm the EXACT object/target/report claim with a new CAS completion RPC; the existing f14_confirm_media_cleanup(kind,id) does not bind a media object and is insufficient. Fail closed on missing object proof, uncertainty or API errors.
6. Verify public URL/CDN behavior. Cache propagation may be delayed (~60 seconds with Smart CDN) and browser caches may persist. Do not claim immediate worldwide erasure. Manual purge support depends on plan and credentials.

## Gate matrix

- Read-only Storage audit: PASS.
- Synthetic path/ownership tests: prepared for executable Node test verification.
- Signed-JWT moderator / non-moderator HTTP tests: NOT RUN; real tokens unavailable in this connector scope.
- Atomic preflight/claim/confirmation migrations: NOT IMPLEMENTED; approval needed.
- Storage deletion/CDN: NOT AUTHORIZED, NOT RUN.
- Published Edge: HARD-DISABLED HTTP 503, no deletion code.

After draft review, request separate PO authorization for the preflight/claim migration and test with isolated photo fixture before even considering actual Storage deletion. Main, Vercel production, and F14 Block 03 remain untouched.

## Repository verification

The hermetic suite is wired into npm run test:f14 and therefore npm run verify. Its 29 cases were separately evaluated in the orchestration V8 environment using a URL parser shim; an actual Node test-runner result must be recorded when verify is executed in a Node environment. This does NOT fulfill the signed-JWT test gate.
