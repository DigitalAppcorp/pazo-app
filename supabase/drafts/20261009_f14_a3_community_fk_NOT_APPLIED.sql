-- F14 A3: community archiving / Auth-FK cascade safety
-- DRAFT ONLY - this changes compatibility with existing pet/community deletion.
-- NEVER apply without separate PO SQL gate and isolated SQL/E2E tests.
BEGIN;
DO $a3_fk_not_applied$
BEGIN
  RAISE EXCEPTION 'F14 A3 COMMUNITY FK DRAFT ONLY — implementation and isolated tests required';
END
$a3_fk_not_applied$;

-- Archival model D2: allow no owner ONLY when archived; active owners required.
ALTER TABLE public.communities ALTER COLUMN owner_user_id DROP NOT NULL;
ALTER TABLE public.communities
  ADD CONSTRAINT communities_active_owner_required
  CHECK (status <> 'active' OR owner_user_id IS NOT NULL);

-- Replace Auth->Community cascade with SET NULL. The CHECK makes a direct
-- Auth deletion of an ACTIVE community fail rather than silently orphaning it.
ALTER TABLE public.communities DROP CONSTRAINT communities_owner_user_id_fkey;
ALTER TABLE public.communities ADD CONSTRAINT communities_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Current constraint trigger always demands an owner membership. Handle the
-- special archived/null-owner state WITHOUT relaxing the active-owner rule.
CREATE OR REPLACE FUNCTION community_private.ensure_owner_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $a3_owner_membership$
BEGIN
  IF NEW.status='archived' AND NEW.owner_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.community_memberships m
      WHERE m.community_id=NEW.id
        AND m.user_id=NEW.owner_user_id AND m.role='owner'
  ) THEN
    RAISE EXCEPTION 'Community owner membership is required.';
  END IF;
  RETURN NEW;
END;
$a3_owner_membership$;

-- Existing trigger is AFTER INSERT OR UPDATE OF owner_user_id. If an admin
-- archives community without changing owner, the status CHECK remains safe.
-- Archived posts remain hidden only if all reads obey archived-status RLS.

-- Protect authored posts from cascading when their Auth account is removed.
-- A worker must privately preserve foreign replies then explicitly clean
-- its authored rows, rather than relying on Auth->Post CASCADE.
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_author_user_id_fkey;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_author_user_id_fkey
  FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

-- Same protection when deleting a pet; requires explicit post cleanup.
ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_author_pet_id_fkey;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_author_pet_id_fkey
  FOREIGN KEY (author_pet_id) REFERENCES public.pets(id) ON DELETE RESTRICT;

COMMIT;

-- INCOMPLETE: legacy/community views, SECURITY DEFINER list RPCs, Storage
-- public URL exposure, feed posts->pets CASCADE, comments→post cascades,
-- moderator reads, other Auth FKs and worker proof of ownership/retention.
-- A3 write fence+worker must be verified before activation.
