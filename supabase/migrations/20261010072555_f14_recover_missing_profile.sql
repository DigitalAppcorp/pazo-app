-- F14: recovery for retained auth.users when public.profiles was reset.
-- APPLIED to hosted PAZO via Supabase migration 20261010072555_f14_recover_missing_profile (2026-10-10).
-- This function cannot modify an existing profile or set privileged columns.
CREATE OR REPLACE FUNCTION public.pazo_ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.profiles (id, is_founder, onboarding_completed)
  VALUES (v_user_id, false, false)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.pazo_ensure_my_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pazo_ensure_my_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.pazo_ensure_my_profile() TO authenticated;

-- Verified after applying: missing profile created only for caller;
-- repeated calls idempotent; unrelated profiles unchanged; anon denied;
-- no insert privilege on public.profiles granted to authenticated;
-- founder/admin state never reconstructed from client metadata.
