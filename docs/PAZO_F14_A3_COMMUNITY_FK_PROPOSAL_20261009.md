# A3 — archived community FK safety proposal (NOT APPLIED)

Based on a read-only inspection of hosted Postgres `public.communities` and its triggers on 2026-10-09:

- `communities.owner_user_id`: currently `NOT NULL` + `ON DELETE CASCADE` to Auth.
- `community_posts.author_user_id` and `author_pet_id`: also `ON DELETE CASCADE`.
- `community_private.ensure_owner_membership()`: constraint trigger rejects owner absent, even when `status='archived'`.
- `communities_status_allowed`: allows only `active` and `archived`; `communities_read_authenticated` condition hides archived records unless owner. F14 restrictive `f14_communities_select` still needs direct RPC/access audit before relying on it for all API reads.

**Proposed draft**, SQL `supabase/drafts/20261009_f14_a3_community_fk_NOT_APPLIED.sql`:
1. Nullable `owner_user_id` **only logically for archived**; constraint `status<>'active' OR owner_user_id IS NOT NULL`.
2. FK `ON DELETE SET NULL` instead of cascade. Direct Auth DELETE of the owner of an *active* community will fail the CHECK, forcing explicit archival before deletion.
3. Existing owner-membership constraint trigger updated to accept `archived + owner=NULL`, still require owner membership for active or archived non-null owner.
4. Community-post author FK `ON DELETE RESTRICT` for both Auth and pet: direct delete fails until private contributions are preserved and content explicitly processed.

**Crucial:** This migration has a hard abort under `BEGIN` and was **NOT applied**. It can change/delete the assumptions of current product operations and has *not* been tested against the entire community UI and RPC API. A3 still lacks a working writer freeze, media handling and storage URL purge. No claim that archive/purge completes via this FK alone.

**Subsequent correctness matrix:** archiving owner while preserving third-party post/comment, author deleting own profile with/without pet, direct Auth DELETE of active vs archived community, references to signed public URLs, restoring backups, RLS anonymous/authenticated, cascade blockers for Feed posts and comments, session expiration and normal deletes not impacted.

PR #38 remains DRAFT; release is not allowed until SQL/E2E tests, a distinct migration authorization and remaining F14 gates.