-- Disposable baseline supplements only. Financial kernel uses the actual F16 definitions.
\connect f14_synthetic
DO $$ BEGIN IF current_database()<>'f14_synthetic' THEN RAISE EXCEPTION 'Disposable only';END IF;END $$;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS banned_until timestamptz;
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),onboarding_completed boolean NOT NULL DEFAULT false);
CREATE SCHEMA account_requests_private;
CREATE TABLE account_requests_private.deletion_requests(subject_user_id uuid PRIMARY KEY,status text);
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,pet_id uuid,type text CHECK(type IN('system','sighting','community_join')),title text NOT NULL,body text NOT NULL,source_id uuid,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_notifications ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.notifications TO authenticated;
\i supabase/migrations/20261022103706_pazo_f17_private_support.sql
