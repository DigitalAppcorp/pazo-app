import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {sql} from './marketing-sql-lab.mjs'
// Reuse the historical function source and original F17 transform, rather than
// inventing a simplified implementation that could miss its ACL regression.
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n')
const baseline=read('supabase/tests/f14/catalog-baseline.sql').match(/CREATE OR REPLACE FUNCTION public\.create_pet_profile\([\s\S]*?\$function\$\s*;/)?.[0]
const originalPatch=read('supabase/migrations/20261022222000_pazo_f17_pet_onboarding_integrity.sql').match(/DO \$repair\$[\s\S]*?END \$repair\$;/)?.[0]
const fix=read('supabase/migrations/20261026234503_pazo_marketing_onboarding_invoker_fix.sql').replace(/\nBEGIN;/,'').replace(/COMMIT;\s*$/,'')
assert.ok(baseline&&originalPatch)
const owner='97000000-0000-4000-8000-000000000001',other='97000000-0000-4000-8000-000000000002'
const output=sql(`BEGIN;
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations(version text);
GRANT USAGE ON SCHEMA auth TO authenticated;
ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_public_read ON public.profiles FOR SELECT USING(true);
CREATE POLICY profiles_owner_update ON public.profiles FOR UPDATE USING(id=auth.uid()) WITH CHECK(id=auth.uid());
GRANT SELECT(id) ON public.profiles TO authenticated;
GRANT UPDATE(onboarding_completed) ON public.profiles TO authenticated;
ALTER TABLE public.pets ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pets ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.pets ADD COLUMN name text,ADD COLUMN species text,ADD COLUMN age text,ADD COLUMN photo_url text,ADD COLUMN bio text,ADD COLUMN breed text,ADD COLUMN gender text;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY qa_pet_owner ON public.pets TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
GRANT SELECT,INSERT ON public.pets TO authenticated;
CREATE TABLE public.pet_private_details(pet_id uuid,zone text,interests text[]);
GRANT INSERT ON public.pet_private_details TO authenticated;
${baseline}
REVOKE ALL ON FUNCTION public.create_pet_profile(text,text,text,text,text,text[],text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_pet_profile(text,text,text,text,text,text[],text,text,text) TO authenticated;
${originalPatch}
INSERT INTO public.profiles(id) VALUES('${owner}'),('${other}');
SELECT set_config('request.jwt.claim.sub','${owner}',true) IS NOT NULL;
SET LOCAL ROLE authenticated;
DO $expect$ BEGIN
 BEGIN PERFORM public.create_pet_profile('QA only','gato','3',NULL); RAISE EXCEPTION 'Baseline unexpectedly worked';
 EXCEPTION WHEN insufficient_privilege THEN IF SQLERRM NOT LIKE '%profiles%' THEN RAISE; END IF; END;
END $expect$;
RESET ROLE;
${fix}
SET LOCAL ROLE authenticated;
SELECT public.create_pet_profile('QA only','gato','3',NULL) IS NOT NULL;
RESET ROLE;
SELECT (SELECT onboarding_completed FROM public.profiles WHERE id='${owner}')
 AND NOT (SELECT onboarding_completed FROM public.profiles WHERE id='${other}')
 AND NOT has_column_privilege('authenticated','public.profiles','onboarding_completed','SELECT')
 AND NOT has_function_privilege('anon','public.create_pet_profile(text,text,text,text,text,text[],text,text,text)','EXECUTE')
 AND (SELECT NOT prosecdef FROM pg_proc WHERE oid='public.create_pet_profile(text,text,text,text,text,text[],text,text,text)'::regprocedure);
ROLLBACK;`)
assert.deepEqual(output.split('\n').filter(Boolean),['t','t','t'])
console.log('PASS actual A03 baseline fails before fix; owner succeeds after; other owner/private flag/anon/invoker preserved; rolled back')
