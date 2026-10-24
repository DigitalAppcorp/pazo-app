-- Isolated PostgreSQL 17 ONLY. No remote users, sessions or credentials.
BEGIN;
DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN;END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN;END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN;END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA supporter_private;
CREATE SCHEMA admin_private;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,
 created_at timestamptz NOT NULL,
 email_confirmed_at timestamptz,
 is_anonymous boolean NOT NULL DEFAULT false
);
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY,
 is_founder boolean NOT NULL DEFAULT false
);
CREATE TABLE public.pets (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL,
 created_at timestamptz NOT NULL
);
CREATE TABLE admin_private.admin_grants (user_id uuid PRIMARY KEY);
CREATE TABLE admin_private.app_activity_daily (
 user_id uuid NOT NULL, activity_day date NOT NULL, module_key text NOT NULL
);
CREATE TABLE supporter_private.gradual_qa_accounts (
 owner_id uuid PRIMARY KEY,
 reason text NOT NULL
);
CREATE TABLE supporter_private.f16_sandbox_qa_owners (
 owner_id uuid PRIMARY KEY,
 status text NOT NULL
);
-- Disposable stand-ins for the ALREADY INSTALLED PAZO admin predicate,
-- matching its verified Auth UID + admin_grants authorization contract.
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SET search_path = ''
AS $mock_auth_uid$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$mock_auth_uid$;
CREATE FUNCTION public.pazo_is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $mock_is_admin$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM admin_private.admin_grants g WHERE g.user_id=auth.uid()
 );
$mock_is_admin$;
COMMIT;
