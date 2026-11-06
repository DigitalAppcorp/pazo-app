CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $roles$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $roles$;
CREATE SCHEMA auth;
CREATE SCHEMA marketing_private;
CREATE SCHEMA admin_private;
CREATE SCHEMA supporter_private;
CREATE SCHEMA net;
CREATE SCHEMA cron;
CREATE TABLE auth.users(
 id uuid PRIMARY KEY,
 email text,
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 confirmation_sent_at timestamptz,
 email_confirmed_at timestamptz,
 is_anonymous boolean NOT NULL DEFAULT false,
 raw_app_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE admin_private.admin_grants(user_id uuid PRIMARY KEY);
CREATE TABLE supporter_private.gradual_qa_accounts(owner_id uuid PRIMARY KEY);
CREATE TABLE supporter_private.f16_sandbox_qa_owners(owner_id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION marketing_private.is_reporting_owner(p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT p_owner IS NOT NULL
  AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_owner)
  AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_owner AND coalesce(u.raw_app_meta_data->>'pazo_marketing_qa','false')='true')
  AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts q WHERE q.owner_id=p_owner)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q WHERE q.owner_id=p_owner)
  AND NOT EXISTS(SELECT 1 FROM admin_private.admin_grants a WHERE a.user_id=p_owner)
$fn$;
CREATE TABLE cron.job(jobid bigserial PRIMARY KEY,jobname text UNIQUE NOT NULL,schedule text NOT NULL,command text NOT NULL);
CREATE OR REPLACE FUNCTION cron.schedule(jobname text,schedule text,command text)
RETURNS bigint LANGUAGE plpgsql AS $fn$
DECLARE v_id bigint;
BEGIN
 INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3)
 ON CONFLICT(jobname) DO UPDATE SET schedule=excluded.schedule,command=excluded.command
 RETURNING jobid INTO v_id;
 RETURN v_id;
END $fn$;
CREATE OR REPLACE FUNCTION net.http_post(url text,headers jsonb DEFAULT '{}'::jsonb,body jsonb DEFAULT NULL,timeout_milliseconds integer DEFAULT 2000)
RETURNS bigint LANGUAGE sql AS $fn$ SELECT 1::bigint $fn$;

-- Existing accounts at migration time: only one real, old email signup is eligible.
INSERT INTO auth.users(id,email,created_at,confirmation_sent_at,raw_app_meta_data) VALUES
 ('10000000-0000-4000-8000-000000000001','existing@example.test',statement_timestamp()-interval '25 hours',statement_timestamp()-interval '25 hours','{"provider":"email"}'),
 ('10000000-0000-4000-8000-000000000002','google@example.test',statement_timestamp()-interval '25 hours',NULL,'{"provider":"google"}'),
 ('10000000-0000-4000-8000-000000000003','qa@example.test',statement_timestamp()-interval '25 hours',statement_timestamp()-interval '25 hours','{"provider":"email","pazo_marketing_qa":true}'),
 ('10000000-0000-4000-8000-000000000004','admin@example.test',statement_timestamp()-interval '25 hours',statement_timestamp()-interval '25 hours','{"provider":"email"}'),
 ('10000000-0000-4000-8000-000000000005','anonymous@example.test',statement_timestamp()-interval '25 hours',statement_timestamp()-interval '25 hours','{"provider":"email"}') ;
UPDATE auth.users SET is_anonymous=true WHERE id='10000000-0000-4000-8000-000000000005';
INSERT INTO admin_private.admin_grants VALUES('10000000-0000-4000-8000-000000000004');
