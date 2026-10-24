-- PG17 synthetic test of automatic local-only Sandbox QA admission.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA auth;
CREATE SCHEMA supporter_private;
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $roles$;
CREATE TABLE auth.users(
 id uuid PRIMARY KEY,
 email_confirmed_at timestamptz,
 is_anonymous boolean NOT NULL DEFAULT false);
CREATE TABLE supporter_private.f16_sandbox_qa_owners(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id),
 authorized_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 expires_at timestamptz NOT NULL,status text NOT NULL,
 test_purpose text NOT NULL CHECK(test_purpose='f16_four_benefits_sandbox'));
CREATE TABLE supporter_private.f16_sandbox_qa_v2_retry_grants(grant_id uuid);
CREATE TABLE supporter_private.paypal_payment_entries(sale_id text);
CREATE TABLE supporter_private.f16_sandbox_qa_paid_periods(sale_id text);
CREATE TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts(owner_id uuid);
INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111','2026-10-17',false),
 ('22222222-2222-4222-8222-222222222222','2026-10-17',false),
 ('33333333-3333-4333-8333-333333333333','2026-10-17',false),
 ('44444444-4444-4444-8444-444444444444',null,false),
 ('55555555-5555-4555-8555-555555555555','2026-10-17',true);
INSERT INTO supporter_private.f16_sandbox_qa_owners(owner_id,expires_at,status,test_purpose) VALUES
 ('11111111-1111-4111-8111-111111111111','2030-01-01','enabled','f16_four_benefits_sandbox'),
 ('22222222-2222-4222-8222-222222222222','2030-01-01','disabled','f16_four_benefits_sandbox');
CREATE FUNCTION public.f16_qa_v2_owner_can_checkout(p_owner_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $fn$
 SELECT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
 JOIN auth.users u ON q.owner_id=u.id
 WHERE q.owner_id=p_owner_id AND q.status='enabled'
 AND q.expires_at>pg_catalog.clock_timestamp())
 $fn$;
CREATE FUNCTION public.f16_qa_v2_begin_checkout(
 p_owner_id uuid,p_request_key uuid,p_locale text,
 p_terms_version text,p_terms_digest text,p_affirmative boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
 AS $fn$ BEGIN RETURN NULL; END $fn$;
COMMIT;
\i supabase/migrations/20261018170858_f16_local_sandbox_automatic_qa_admission.sql

DO $assert$
DECLARE x boolean;
BEGIN
 x:=public.f16_qa_v2_auto_admit_local_sandbox_owner('33333333-3333-4333-8333-333333333333');
 IF x IS DISTINCT FROM true
 OR public.f16_qa_v2_owner_can_checkout('33333333-3333-4333-8333-333333333333') IS DISTINCT FROM true
 OR (SELECT expires_at FROM supporter_private.f16_sandbox_qa_owners
     WHERE owner_id='33333333-3333-4333-8333-333333333333') <> 'infinity'::timestamptz
 THEN RAISE EXCEPTION 'Confirmed PAZO Auth user was not automatically admitted'; END IF;
 IF public.f16_qa_v2_auto_admit_local_sandbox_owner('33333333-3333-4333-8333-333333333333') IS DISTINCT FROM true
 OR (SELECT COUNT(*) FROM supporter_private.f16_sandbox_qa_owners)<>3
 THEN RAISE EXCEPTION 'Repeated admission changed row count'; END IF;
 IF public.f16_qa_v2_auto_admit_local_sandbox_owner('11111111-1111-4111-8111-111111111111') IS DISTINCT FROM true
 OR (SELECT expires_at FROM supporter_private.f16_sandbox_qa_owners
      WHERE owner_id='11111111-1111-4111-8111-111111111111') <> '2030-01-01'::timestamptz
 THEN RAISE EXCEPTION 'Historical test owner was changed'; END IF;
 IF public.f16_qa_v2_auto_admit_local_sandbox_owner('22222222-2222-4222-8222-222222222222') IS DISTINCT FROM false
 OR (SELECT status FROM supporter_private.f16_sandbox_qa_owners
     WHERE owner_id='22222222-2222-4222-8222-222222222222')<>'disabled'
 THEN RAISE EXCEPTION 'Administrative disabled owner must remain disabled'; END IF;
 IF public.f16_qa_v2_auto_admit_local_sandbox_owner('44444444-4444-4444-8444-444444444444') IS DISTINCT FROM false
 OR public.f16_qa_v2_auto_admit_local_sandbox_owner('55555555-5555-4555-8555-555555555555') IS DISTINCT FROM false
 OR public.f16_qa_v2_auto_admit_local_sandbox_owner('66666666-6666-4666-8666-666666666666') IS DISTINCT FROM false
 OR public.f16_qa_v2_auto_admit_local_sandbox_owner(NULL) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Unconfirmed anonymous foreign owner was admitted'; END IF;
 IF pg_catalog.has_function_privilege('anon',
 'public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
 'public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'QA auto-admission RPC leaked to browser'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)
 THEN RAISE EXCEPTION 'Admission must never write payment/attempt'; END IF;
END $assert$;
\echo F16_LOCAL_SANDBOX_AUTO_QA_OWNER_PG17_PASS
