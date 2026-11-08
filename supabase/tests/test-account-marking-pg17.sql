\set ON_ERROR_STOP on
-- Run only on the dedicated, disposable database.
DO $$ BEGIN
  IF current_database() <> 'pazo_test_account_marking_test' THEN RAISE EXCEPTION 'Disposable test-account database required'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA marketing_private;
CREATE SCHEMA admin_private;
GRANT USAGE ON SCHEMA admin_private TO authenticated;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, created_at timestamptz DEFAULT now() NOT NULL,
  is_anonymous boolean DEFAULT false NOT NULL, raw_app_meta_data jsonb DEFAULT '{}' NOT NULL);
CREATE TABLE admin_private.admin_grants (user_id uuid PRIMARY KEY REFERENCES auth.users);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE FUNCTION public.pazo_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.pazo_is_admin() TO authenticated;
-- Same projection shape and marker as production, reduced to the columns this test reads.
CREATE FUNCTION public.pazo_admin_users(p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
declare result jsonb;
begin
 if not public.pazo_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb)
 into result from (
  select u.id::text as user_id,u.email,u.created_at,
   0 as pet_count
  from auth.users u order by u.created_at desc limit p_limit offset p_offset
 ) x;
 return result;
end $function$;
GRANT EXECUTE ON FUNCTION public.pazo_admin_users(integer,integer) TO authenticated;

-- An AFTER INSERT trigger stands in for admin pushes, reminders and measurement:
-- it must already see the classification.
CREATE TABLE public.seen_at_insert (id uuid PRIMARY KEY, qa boolean NOT NULL);
CREATE FUNCTION public.record_seen() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.seen_at_insert VALUES (NEW.id, coalesce(NEW.raw_app_meta_data->>'pazo_marketing_qa','false')='true');
  RETURN NEW;
END $$;
CREATE TRIGGER a_record_seen AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.record_seen();

-- One pre-existing account with a reserved address, created before the migration.
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000a1','appdigital.corp+old@gmail.com','{"provider":"email"}');

\ir ../migrations/20261109090000_pazo_test_account_marking.sql

DO $$
DECLARE r record;
BEGIN
  -- Backfill marked the pre-existing reserved account and kept its other keys.
  SELECT raw_app_meta_data INTO r FROM auth.users WHERE id='00000000-0000-0000-0000-0000000000a1';
  IF r.raw_app_meta_data->>'pazo_marketing_qa' <> 'true' OR r.raw_app_meta_data->>'provider' <> 'email' THEN
    RAISE EXCEPTION 'Backfill failed: %', r.raw_app_meta_data;
  END IF;

  -- Address classification.
  IF NOT marketing_private.reserved_test_address('AppDigital.Corp+QA1@Gmail.com') THEN RAISE EXCEPTION 'Mailbox alias not reserved'; END IF;
  IF NOT marketing_private.reserved_test_address('appdigitalcorp+x@gmail.com') THEN RAISE EXCEPTION 'Dotless mailbox alias not reserved'; END IF;
  IF NOT marketing_private.reserved_test_address('someone@example.com') THEN RAISE EXCEPTION 'example.com not reserved'; END IF;
  IF NOT marketing_private.reserved_test_address('a@pazo.test') THEN RAISE EXCEPTION '.test not reserved'; END IF;
  IF NOT marketing_private.reserved_test_address('a@foo.invalid') THEN RAISE EXCEPTION '.invalid not reserved'; END IF;
  IF marketing_private.reserved_test_address('appdigital.corp@gmail.com') THEN RAISE EXCEPTION 'Main mailbox must not be reserved'; END IF;
  IF marketing_private.reserved_test_address('person+news@gmail.com') THEN RAISE EXCEPTION 'Other aliases must not be reserved'; END IF;
  IF marketing_private.reserved_test_address('appdigital.corp+x@gmail.com.evil.io') THEN RAISE EXCEPTION 'Suffix trick must not match'; END IF;
  IF marketing_private.reserved_test_address('someone@example.com.mx') THEN RAISE EXCEPTION 'Real domain must not match'; END IF;
  IF marketing_private.reserved_test_address(NULL) THEN RAISE EXCEPTION 'NULL must not match'; END IF;
END $$;

-- New sign-ups: reserved addresses are marked before AFTER triggers run.
INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000b1','appdigital.corp+qa2@gmail.com','{"provider":"email","providers":["email"]}'),
  ('00000000-0000-0000-0000-0000000000b2','real.person@gmail.com','{"provider":"email","providers":["email"]}'),
  ('00000000-0000-0000-0000-0000000000b3','tester@example.org','{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000c1','owner@realmail.com','{}');
INSERT INTO admin_private.admin_grants VALUES ('00000000-0000-0000-0000-0000000000c1');

DO $$ BEGIN
  IF (SELECT qa FROM public.seen_at_insert WHERE id='00000000-0000-0000-0000-0000000000b1') IS NOT TRUE THEN RAISE EXCEPTION 'Alias sign-up not marked before AFTER triggers'; END IF;
  IF (SELECT qa FROM public.seen_at_insert WHERE id='00000000-0000-0000-0000-0000000000b3') IS NOT TRUE THEN RAISE EXCEPTION 'Reserved domain sign-up not marked'; END IF;
  IF (SELECT qa FROM public.seen_at_insert WHERE id='00000000-0000-0000-0000-0000000000b2') IS NOT FALSE THEN RAISE EXCEPTION 'Real sign-up was marked'; END IF;
  IF (SELECT raw_app_meta_data->'providers' FROM auth.users WHERE id='00000000-0000-0000-0000-0000000000b1') <> '["email"]'::jsonb THEN RAISE EXCEPTION 'Auth metadata lost'; END IF;
  IF (SELECT raw_app_meta_data->>'pazo_qa_reason' FROM auth.users WHERE id='00000000-0000-0000-0000-0000000000b1') <> 'reserved_address' THEN RAISE EXCEPTION 'Reason not recorded'; END IF;
END $$;

-- Permissions: nobody but an authenticated administrator may change the flag.
DO $$ BEGIN
  IF has_function_privilege('anon','public.pazo_admin_set_test_account(uuid,boolean)','execute') THEN RAISE EXCEPTION 'anon can execute'; END IF;
  IF has_function_privilege('service_role','public.pazo_admin_set_test_account(uuid,boolean)','execute') THEN RAISE EXCEPTION 'service_role can execute'; END IF;
  IF has_function_privilege('authenticated','marketing_private.mark_reserved_test_signup()','execute') THEN RAISE EXCEPTION 'trigger function exposed'; END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b2',false);
DO $$ BEGIN
  PERFORM public.pazo_admin_set_test_account('00000000-0000-0000-0000-0000000000b2',true);
  RAISE EXCEPTION 'Non-admin was allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- Administrator marks, lists and unmarks.
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',false);
DO $$
DECLARE list jsonb;
BEGIN
  IF public.pazo_admin_set_test_account('00000000-0000-0000-0000-0000000000b2',true) IS NOT TRUE THEN RAISE EXCEPTION 'Mark failed'; END IF;
  list := public.pazo_admin_users(30,0);
  IF (SELECT (e->>'test_account')::boolean FROM jsonb_array_elements(list) e WHERE e->>'user_id'='00000000-0000-0000-0000-0000000000b2') IS NOT TRUE THEN RAISE EXCEPTION 'List does not show the mark'; END IF;
  IF (SELECT (e->>'test_account')::boolean FROM jsonb_array_elements(list) e WHERE e->>'user_id'='00000000-0000-0000-0000-0000000000c1') IS NOT FALSE THEN RAISE EXCEPTION 'Unmarked account shown as test'; END IF;
  IF (SELECT e ? 'pet_count' FROM jsonb_array_elements(list) e LIMIT 1) IS NOT TRUE THEN RAISE EXCEPTION 'Existing columns lost'; END IF;
  IF public.pazo_admin_set_test_account('00000000-0000-0000-0000-0000000000b2',false) IS NOT TRUE THEN RAISE EXCEPTION 'Unmark failed'; END IF;
  IF public.pazo_admin_set_test_account('00000000-0000-0000-0000-00000000ffff',true) IS NOT FALSE THEN RAISE EXCEPTION 'Unknown account reported as changed'; END IF;
END $$;
RESET ROLE;

DO $$ BEGIN
  IF (SELECT raw_app_meta_data ? 'pazo_marketing_qa' OR raw_app_meta_data ? 'pazo_qa_reason' FROM auth.users WHERE id='00000000-0000-0000-0000-0000000000b2') THEN RAISE EXCEPTION 'Unmark left keys behind'; END IF;
  IF (SELECT raw_app_meta_data->>'provider' FROM auth.users WHERE id='00000000-0000-0000-0000-0000000000b2') <> 'email' THEN RAISE EXCEPTION 'Unmark removed Auth metadata'; END IF;
END $$;

SELECT 'test-account-marking PASS' AS result;
