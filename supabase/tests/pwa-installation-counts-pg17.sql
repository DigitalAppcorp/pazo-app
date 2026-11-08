\set ON_ERROR_STOP on
-- Run only on the dedicated, disposable database.
DO $$ BEGIN
  IF current_database() <> 'pazo_pwa_installation_test' THEN RAISE EXCEPTION 'Disposable PWA database required'; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA marketing_private;
CREATE SCHEMA admin_private;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email_confirmed_at timestamptz, is_anonymous boolean DEFAULT false NOT NULL,
  raw_app_meta_data jsonb DEFAULT '{}' NOT NULL);
CREATE TABLE admin_private.admin_grants (user_id uuid PRIMARY KEY REFERENCES auth.users);
CREATE TABLE supporter_qa (owner_id uuid PRIMARY KEY REFERENCES auth.users);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE FUNCTION public.pazo_is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=auth.uid());
$$;
CREATE FUNCTION public.pazo_maintenance_data_allowed() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true; $$;
CREATE FUNCTION marketing_private.is_reporting_owner(owner uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id=owner AND raw_app_meta_data->>'pazo_marketing_qa' IS DISTINCT FROM 'true')
    AND NOT EXISTS (SELECT 1 FROM admin_private.admin_grants WHERE user_id=owner)
    AND NOT EXISTS (SELECT 1 FROM public.supporter_qa WHERE owner_id=owner);
$$;
\ir ../migrations/20261108130000_pazo_pwa_observed_usage.sql

INSERT INTO auth.users(id,email_confirmed_at,is_anonymous,raw_app_meta_data) VALUES
  ('00000000-0000-0000-0000-000000000001',now(),false,'{}'),
  ('00000000-0000-0000-0000-000000000002',now(),false,'{}'),
  ('00000000-0000-0000-0000-000000000003',now(),false,'{"pazo_marketing_qa":true}'),
  ('00000000-0000-0000-0000-000000000004',now(),false,'{}'),
  ('00000000-0000-0000-0000-000000000005',NULL,false,'{}'),
  ('00000000-0000-0000-0000-000000000006',now(),true,'{}');
INSERT INTO admin_private.admin_grants VALUES ('00000000-0000-0000-0000-000000000004');

DO $$ BEGIN
  IF has_function_privilege('anon','public.pazo_record_pwa_installation(uuid)','EXECUTE')
    OR has_function_privilege('anon','public.pazo_admin_pwa_installation_counts()','EXECUTE')
    OR has_table_privilege('authenticated','pwa_private.detected_installations','SELECT,INSERT,DELETE') THEN
    RAISE EXCEPTION 'Client privilege too broad';
  END IF;
END $$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF public.pazo_record_pwa_installation('00000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Off gate recorded an installation'; END IF;
  BEGIN
    PERFORM public.pazo_admin_pwa_installation_counts();
    RAISE EXCEPTION 'Non-admin received the aggregate';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000004';
DO $$ BEGIN
  IF public.pazo_admin_pwa_installation_counts() <> '{"enabled":false}'::jsonb THEN RAISE EXCEPTION 'Disabled counts must not imply zero installations'; END IF;
END $$;
RESET ROLE;
UPDATE pwa_private.collection_gate SET enabled=true;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF public.pazo_record_pwa_installation('00000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Cross-account recording accepted'; END IF;
  IF NOT public.pazo_record_pwa_installation('00000000-0000-0000-0000-000000000001')
     OR NOT public.pazo_record_pwa_installation('00000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Own recording or retry rejected'; END IF;
END $$;
DO $$ DECLARE candidate uuid; BEGIN
  FOREACH candidate IN ARRAY ARRAY['00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006']::uuid[] LOOP
    PERFORM set_config('request.jwt.claim.sub',candidate::text,true);
    IF public.pazo_record_pwa_installation(candidate) THEN RAISE EXCEPTION 'Ineligible account counted'; END IF;
  END LOOP;
END $$;
SET "request.jwt.claim.sub"='00000000-0000-0000-0000-000000000004';
DO $$ BEGIN
  IF public.pazo_admin_pwa_installation_counts() <> '{"enabled":true,"detected":1,"not_detected":1}'::jsonb THEN
    RAISE EXCEPTION 'Expected exactly two totals for eligible accounts';
  END IF;
END $$;
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pwa_private.detected_installations) THEN RAISE EXCEPTION 'Account deletion left an installation mark'; END IF;
END $$;
\echo PWA installation counts: PASS
