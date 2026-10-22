// Extract unchanged installed prerequisite SQL for a DISPOSABLE database only.
// Auth/users/pets are minimal synthetic models, never hosted data.
import {readFileSync,writeFileSync} from 'node:fs'
const read=p=>readFileSync(p,'utf8')
const between=(s,start,end)=>{
 if(s.split(start).length!==2||s.split(end).length!==2)throw Error('prerequisite source drift')
 return start+s.split(start)[1].split(end)[0]
}
const foundation=read('supabase/migrations/20261013215221_f16_supporter_wall_consents_foundation.sql')
const tables=read('supabase/migrations/20261017160619_f16_sandbox_benefits_v2_private_qa_staging.sql')
const reads=read('supabase/migrations/20261017161221_f16_sandbox_qa_verified_benefits_reads.sql')
const admin=read('supabase/migrations/20261018234721_pazo_admin_observability_dashboard_20261018.sql')
const sql=`-- GENERATED: exact prerequisite definitions; auth models are synthetic.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
BEGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE TABLE public.pets(id uuid PRIMARY KEY,owner_id uuid REFERENCES auth.users(id),name text,photo_url text);
${between(admin,'create or replace function public.pazo_is_admin()','-- Daily module usage')}
REVOKE ALL ON FUNCTION public.pazo_is_admin() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_is_admin() TO authenticated;
${between(foundation,'CREATE TABLE supporter_private.wall_consents','COMMIT;')}
${between(tables,'CREATE TABLE supporter_private.f16_sandbox_qa_owners','-- V2 is staged')}
${between(reads,'CREATE FUNCTION supporter_private.f16_sandbox_qa_projection','DO $post$')}
CREATE FUNCTION public.pazo_supporter_my_account_status() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb; $$;
REVOKE ALL ON FUNCTION public.pazo_supporter_my_account_status() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_supporter_my_account_status() TO authenticated;
COMMIT;
`
writeFileSync('supabase/tests/supporter/fixtures/f16-live-benefits-prerequisites.generated.sql',sql)
console.log('F16_LIVE_BENEFITS_PREREQUISITES_STAGED_DISPOSABLE_ONLY')
