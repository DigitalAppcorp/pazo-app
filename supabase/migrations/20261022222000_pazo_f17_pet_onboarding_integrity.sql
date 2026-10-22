-- PAZO F17: The authenticated A03 pet-creation RPC is the onboarding
-- completion event. Historically profiles.onboarding_completed never changed,
-- so all genuine pet owners were incorrectly blocked at the Live checkout.
-- This patch does not grant entitlements, charge, or relax the canary policy.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='45s';
LOCK TABLE public.profiles, public.pets IN SHARE ROW EXCLUSIVE MODE;
DO $repair$
DECLARE v_def text; v_old text; v_new text;
BEGIN
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version='20261022222000')
 THEN RAISE EXCEPTION 'PAZO onboarding migration already installed'; END IF;
 SELECT pg_catalog.pg_get_functiondef(
  'public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure)
 INTO v_def;
 IF v_def IS NULL OR md5(v_def)<>'c5987b54c119d192f7480d624fb6522e'
 THEN RAISE EXCEPTION 'A03 create_pet_profile baseline differs'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies
  WHERE schemaname='public' AND tablename='profiles' AND
   policyname='profiles_owner_update' AND cmd='UPDATE'
   AND qual LIKE '%auth.uid()%')
 THEN RAISE EXCEPTION 'Owner-scoped profile update policy missing'; END IF;
 IF has_function_privilege('anon',
   'public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure,
   'EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected anonymous pet creation permission'; END IF;
 v_old:=E'  RETURN v_pet_id;\nEND;';
 v_new:=E'  -- The pet now exists under this authenticated owner. Record A03 as\n'||
        E'  -- completed, without granting subscriptions or any financial status.\n'||
        E'  UPDATE public.profiles SET onboarding_completed=true\n'||
        E'  WHERE id=v_user_id AND onboarding_completed IS DISTINCT FROM true\n'||
        E'    AND EXISTS(SELECT 1 FROM public.pets WHERE owner_id=v_user_id);\n\n'||
        E'  RETURN v_pet_id;\nEND;';
 IF v_def NOT LIKE '%'||v_old||'%'
 THEN RAISE EXCEPTION 'A03 completion marker missing'; END IF;
 EXECUTE replace(v_def,v_old,v_new);
 IF has_function_privilege('anon',
  'public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure,
  'EXECUTE')
 THEN RAISE EXCEPTION 'Anonymous access changed unexpectedly'; END IF;
END $repair$;

-- Set completion only for accounts with a committed pet, not for newly
-- registered users who have not finished A03. Scope to existing auth users.
UPDATE public.profiles p SET onboarding_completed=true
WHERE p.onboarding_completed IS DISTINCT FROM true
AND EXISTS(SELECT 1 FROM public.pets pet WHERE pet.owner_id=p.id)
AND EXISTS(SELECT 1 FROM auth.users a WHERE a.id=p.id);

DO $postflight$
BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users a ON a.id=p.id
  WHERE p.onboarding_completed IS DISTINCT FROM true
    AND EXISTS(SELECT 1 FROM public.pets pet WHERE pet.owner_id=p.id))
 THEN RAISE EXCEPTION 'Authentic pet owners remain unmarked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='create_pet_profile'
    AND position('onboarding_completed=true' in pg_get_functiondef(p.oid))>0)
 THEN RAISE EXCEPTION 'Future A03 writes will not mark onboarding'; END IF;
END $postflight$;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements)
VALUES ('20261022222000','pazo_f17_pet_onboarding_integrity',
 ARRAY['Authenticated pet creation now marks onboarding; historical verified owners reconciled.']);
COMMIT;
