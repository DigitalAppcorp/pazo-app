\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' THEN RAISE EXCEPTION 'Disposable only';END IF;END $$;
ALTER TABLE public.pets ADD COLUMN is_lost boolean NOT NULL DEFAULT false;
CREATE TABLE public.posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,pet_id uuid);
CREATE TABLE public.community_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_pet_id uuid NOT NULL);
CREATE TABLE public.care_completions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),pet_id uuid NOT NULL);
CREATE TABLE public.pet_public_links(pet_id uuid PRIMARY KEY,enabled boolean DEFAULT true,rotated_at timestamptz);
CREATE TABLE supporter_private.pazo_admin_gift_access(owner_id uuid PRIMARY KEY,revoked_at timestamptz,granted_at timestamptz DEFAULT now(),expires_at timestamptz);
\i supabase/tests/supporter/fixtures/f18-rollback.generated.sql
DO $$ BEGIN IF to_regclass('supporter_private.public_supporter_control') IS NOT NULL THEN RAISE EXCEPTION 'Rollback failed';END IF;END $$;
\i supabase/migrations/20261025073311_pazo_f18_public_supporter_invitations.sql
