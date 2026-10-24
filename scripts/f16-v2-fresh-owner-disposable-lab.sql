-- Isolated PG17 laboratory, synthetic Auth owners, zero external PayPal.
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
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE supporter_private.f16_sandbox_qa_owners(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id),
 status text NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE supporter_private.paypal_p06_checkout_attempts(
 owner_id uuid NOT NULL,terms_version text NOT NULL);
CREATE TABLE supporter_private.paypal_p06_offers(
 version text NOT NULL,locale text NOT NULL,sha256 text NOT NULL,
 published_at timestamptz,plan_id text NOT NULL,
 currency text NOT NULL,price_minor integer NOT NULL,
 cadence text NOT NULL,PRIMARY KEY(version,locale));
CREATE TABLE supporter_private.paypal_subscription_intents(
 intent_id text PRIMARY KEY,owner_id uuid NOT NULL,provider text NOT NULL,
 plan_id text NOT NULL,state text NOT NULL,external_subscription_id text);
CREATE TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts(
 owner_id uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 request_key uuid NOT NULL,intent_id text NOT NULL UNIQUE,
 locale text NOT NULL,terms_version text NOT NULL,
 terms_sha256 text NOT NULL,created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(owner_id,request_key),UNIQUE(owner_id));
CREATE TABLE supporter_private.f16_sandbox_qa_v2_retry_grants(grant_id uuid);
CREATE TABLE supporter_private.paypal_payment_entries(sale_id text);
CREATE TABLE supporter_private.f16_sandbox_qa_paid_periods(sale_id text);
INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
INSERT INTO supporter_private.f16_sandbox_qa_owners VALUES
 ('11111111-1111-4111-8111-111111111111','enabled','2030-01-01'),
 ('22222222-2222-4222-8222-222222222222','enabled','2030-01-01');
INSERT INTO supporter_private.paypal_p06_checkout_attempts VALUES
 ('11111111-1111-4111-8111-111111111111','pazo-supporter-sandbox.qa20261016-v1');
INSERT INTO supporter_private.paypal_subscription_intents VALUES
 ('intent-aaaa3333-3333-4333-8333-333333333333',
 '11111111-1111-4111-8111-111111111111','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-ORIGINAL-RETAINED');
INSERT INTO supporter_private.f16_sandbox_qa_v2_checkout_attempts(
 owner_id,request_key,intent_id,locale,terms_version,terms_sha256)
 VALUES('11111111-1111-4111-8111-111111111111',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'intent-aaaa3333-3333-4333-8333-333333333333',
 'es','pazo-supporter-sandbox.benefits-v2',repeat('f',64));
INSERT INTO supporter_private.paypal_p06_offers
 SELECT 'pazo-supporter-sandbox.benefits-v2',locale,repeat('f',64),
 pg_catalog.clock_timestamp(),'P-14V25407JP6850922NLHMDKI',
 'USD',299,'MONTH_1' FROM (VALUES('es'),('en')) l(locale);
CREATE FUNCTION public.f16_qa_v2_owner_can_checkout(p_owner_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $fn$
 SELECT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
 JOIN auth.users u ON u.id=q.owner_id
 WHERE q.owner_id=p_owner_id AND q.status='enabled'
 AND q.expires_at>pg_catalog.clock_timestamp()
 AND EXISTS(SELECT 1 FROM supporter_private.paypal_p06_checkout_attempts old
 WHERE old.owner_id=q.owner_id))
 $fn$;
CREATE FUNCTION public.f16_qa_v2_begin_checkout(
 p_owner_id uuid,p_request_key uuid,p_locale text,
 p_terms_version text,p_terms_digest text,p_affirmative boolean
 ) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
 AS $fn$
 BEGIN
 RAISE EXCEPTION 'Existing-owner v2 requires an intact historical v1 record';
 END $fn$;
COMMIT;
\i supabase/migrations/20261018163723_f16_sandbox_fresh_owner_qa_admission.sql

DO $test$
DECLARE first jsonb; second jsonb; original text; rejected boolean:=false;
BEGIN
 IF NOT public.f16_qa_v2_owner_can_checkout('22222222-2222-4222-8222-222222222222')
 OR NOT public.f16_qa_v2_owner_can_checkout('11111111-1111-4111-8111-111111111111')
 OR public.f16_qa_v2_owner_can_checkout('33333333-3333-4333-8333-333333333333')
 THEN RAISE EXCEPTION 'Fresh Auth owner private allowlist eligibility is broken'; END IF;
 first:=public.f16_qa_v2_begin_checkout(
 '22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','es',
 'pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 IF first->>'ownerId' IS DISTINCT FROM '22222222-2222-4222-8222-222222222222'
 OR first->>'state' IS DISTINCT FROM 'pending'
 THEN RAISE EXCEPTION 'Fresh owner consent/intent not created properly'; END IF;
 original:=first->>'intentId';
 second:=public.f16_qa_v2_begin_checkout(
 '22222222-2222-4222-8222-222222222222',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','es',
 'pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 IF second->>'intentId' IS DISTINCT FROM original
 THEN RAISE EXCEPTION 'Same request ID must be idempotent'; END IF;
 BEGIN
 PERFORM public.f16_qa_v2_begin_checkout(
 '22222222-2222-4222-8222-222222222222',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc','es',
 'pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Second intent of same owner was not blocked'; END IF;
 rejected:=false;
 BEGIN
 PERFORM public.f16_qa_v2_begin_checkout(
 '33333333-3333-4333-8333-333333333333',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc','es',
 'pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Non-allowlisted owner created an intent'; END IF;
 IF (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)<>2
 OR (SELECT count(*) FROM supporter_private.paypal_subscription_intents)<>2
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR (SELECT count(*) FROM supporter_private.f16_sandbox_qa_paid_periods)<>0
 THEN RAISE EXCEPTION 'Financial state or old intent unexpectedly modified'; END IF;
 IF (SELECT external_subscription_id FROM supporter_private.paypal_subscription_intents
 WHERE owner_id='11111111-1111-4111-8111-111111111111') <> 'I-ORIGINAL-RETAINED'
 THEN RAISE EXCEPTION 'Old V2 preserved subscription changed'; END IF;
END $test$;
DO $acl$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
 'public.f16_qa_v2_owner_can_checkout(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected client privileges'; END IF;
END $acl$;
\echo F16_FRESH_DISPOSABLE_QA_OWNER_GATES_PASS_ZERO_PAYPAL
