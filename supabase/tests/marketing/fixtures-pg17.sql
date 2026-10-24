-- Isolated PostgreSQL 17 ONLY. No remote users, sessions or credentials.
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
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
COMMIT;
