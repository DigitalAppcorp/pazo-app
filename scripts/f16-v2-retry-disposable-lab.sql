-- PAZO F16: isolated PG17 fixture; no hosted Supabase or PayPal access.
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
CREATE TABLE supporter_private.f16_sandbox_qa_owners(owner_id uuid PRIMARY KEY REFERENCES auth.users(id),
 status text NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE supporter_private.paypal_subscription_intents(
 intent_id text PRIMARY KEY,owner_id uuid NOT NULL,provider text NOT NULL DEFAULT 'paypal',
 plan_id text NOT NULL DEFAULT 'P-14V25407JP6850922NLHMDKI',
 state text NOT NULL DEFAULT 'pending',external_subscription_id text
);
CREATE TABLE supporter_private.paypal_p06_offers(
 version text NOT NULL,locale text NOT NULL,sha256 text NOT NULL,
 plan_id text NOT NULL,currency text NOT NULL,price_minor integer NOT NULL,
 cadence text NOT NULL,published_at timestamptz,PRIMARY KEY(version,locale)
);
CREATE TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts(
 owner_id uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 request_key uuid NOT NULL,intent_id text UNIQUE NOT NULL REFERENCES supporter_private.paypal_subscription_intents(intent_id),
 locale text NOT NULL,terms_version text NOT NULL,terms_sha256 text NOT NULL,
 provider_create_claimed_at timestamptz, PRIMARY KEY(owner_id,request_key),UNIQUE(owner_id));
CREATE TABLE supporter_private.f16_sandbox_qa_paid_periods(
 owner_id uuid NOT NULL,provider_subscription_id text NOT NULL);
CREATE TABLE supporter_private.paypal_payment_entries(
 owner_id uuid NOT NULL,external_subscription_id text NOT NULL);
CREATE TABLE supporter_private.paypal_verified_activation_bindings(
 owner_id uuid NOT NULL,subscription_id text NOT NULL);
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO supporter_private.f16_sandbox_qa_owners VALUES
('11111111-1111-4111-8111-111111111111','enabled','2030-01-01');
INSERT INTO supporter_private.paypal_subscription_intents VALUES
('intent-33333333-3333-4333-8333-333333333333',
'11111111-1111-4111-8111-111111111111','paypal',
'P-14V25407JP6850922NLHMDKI','bound','I-TEST-ORIGINAL01');
INSERT INTO supporter_private.f16_sandbox_qa_v2_checkout_attempts VALUES
('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
'intent-33333333-3333-4333-8333-333333333333','es',
'pazo-supporter-sandbox.benefits-v2',repeat('f',64),pg_catalog.clock_timestamp());
INSERT INTO supporter_private.paypal_p06_offers
SELECT 'pazo-supporter-sandbox.benefits-v2',lang,repeat('f',64),
'P-14V25407JP6850922NLHMDKI','USD',299,'MONTH_1',pg_catalog.clock_timestamp()
FROM (VALUES ('es'),('en')) AS l(lang);
COMMIT;

\i supabase/migrations/20261018132808_f16_sandbox_v2_append_only_checkout_retries.sql

-- The first V2 owner exists, but NO reviewed grant exists: retry must fail.
DO $test$
DECLARE v boolean; rejected boolean:=false;
BEGIN
 SELECT public.f16_qa_v2_retry_eligibility('11111111-1111-4111-8111-111111111111') INTO v;
 IF v THEN RAISE EXCEPTION 'Ungated retry unexpectedly eligible'; END IF;
 BEGIN
  PERFORM public.f16_qa_v2_retry_begin_checkout(
   '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
   'es','pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Ungated begin not rejected'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_subscription_intents)<>1
 THEN RAISE EXCEPTION 'Ungated retry changed intent count'; END IF;
END $test$;

-- Incomplete evidence must never authorize retry.
DO $test$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  INSERT INTO supporter_private.f16_sandbox_qa_v2_retry_grants
   (owner_id,predecessor_intent_id,predecessor_subscription_id,resolution,
   evidence_digest,provider_checked_at,reconciliation_checked_at,approved_at)
  VALUES ('11111111-1111-4111-8111-111111111111',
   'intent-33333333-3333-4333-8333-333333333333','I-TEST-ORIGINAL01',
   'MERCHANT_CONFIRMED_ABSENT',repeat('a',64),
   pg_catalog.clock_timestamp(),pg_catalog.clock_timestamp(),pg_catalog.clock_timestamp());
 EXCEPTION WHEN check_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Unverified grant was accepted'; END IF;
END $test$;

-- Only synthetic merchant reconciliation evidence is staged in disposable PG.
INSERT INTO supporter_private.f16_sandbox_qa_v2_retry_grants
 (owner_id,predecessor_intent_id,predecessor_subscription_id,resolution,
  merchant_scope_verified,merchant_terminal_verified,all_transactions_reconciled,
  webhook_inbox_reconciled,no_outstanding_charge,no_collectible_subscription,
  evidence_digest,provider_checked_at,reconciliation_checked_at,approved_at)
VALUES ('11111111-1111-4111-8111-111111111111',
 'intent-33333333-3333-4333-8333-333333333333','I-TEST-ORIGINAL01',
 'MERCHANT_CONFIRMED_ABSENT',true,true,true,true,true,true,repeat('a',64),
 '2026-10-18 15:00:00+00','2026-10-18 15:00:00+00','2026-10-18 15:01:00+00');

DO $test$
DECLARE
 a jsonb; again jsonb; first_claim boolean; second_claim boolean;
 blocked boolean:=false;
BEGIN
 IF NOT public.f16_qa_v2_retry_eligibility('11111111-1111-4111-8111-111111111111')
 THEN RAISE EXCEPTION 'Audited synthetic grant is not eligible'; END IF;
 a:=public.f16_qa_v2_retry_begin_checkout(
 '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
 'es','pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 IF a->>'state'<>'pending' OR a->>'intentId' NOT LIKE 'intent-%'
 THEN RAISE EXCEPTION 'Invalid retry intent result'; END IF;
 again:=public.f16_qa_v2_retry_begin_checkout(
 '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
 'es','pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 IF a->>'intentId'<>again->>'intentId' THEN RAISE EXCEPTION 'Replay created another intent'; END IF;
 first_claim:=public.f16_qa_v2_retry_claim_provider_create(
 '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
 a->>'intentId');
 second_claim:=public.f16_qa_v2_retry_claim_provider_create(
 '11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444',
 a->>'intentId');
 IF NOT first_claim OR second_claim THEN RAISE EXCEPTION 'PayPal provider-create claim not one-shot'; END IF;
 BEGIN
  PERFORM public.f16_qa_v2_retry_begin_checkout(
  '11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555',
  'es','pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 EXCEPTION WHEN insufficient_privilege OR unique_violation THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Second unreconciled retry was not blocked'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_subscription_intents)<>2
 THEN RAISE EXCEPTION 'Unexpected number of intents'; END IF;
 IF (SELECT count(*) FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts)<>1
 THEN RAISE EXCEPTION 'Historical V2 attempt mutated'; END IF;
END $test$;

-- Late payment evidence arriving AFTER consent but BEFORE merchant-create
-- must prevent a second billable subscription despite a previously approved grant.
INSERT INTO auth.users VALUES ('66666666-6666-4666-8666-666666666666');
INSERT INTO supporter_private.f16_sandbox_qa_owners VALUES
('66666666-6666-4666-8666-666666666666','enabled','2030-01-01');
INSERT INTO supporter_private.paypal_subscription_intents VALUES
('intent-77777777-7777-4777-8777-777777777777',
 '66666666-6666-4666-8666-666666666666','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-TEST-LATE01');
INSERT INTO supporter_private.f16_sandbox_qa_v2_checkout_attempts VALUES
('66666666-6666-4666-8666-666666666666','88888888-8888-4888-8888-888888888888',
 'intent-77777777-7777-4777-8777-777777777777','es',
 'pazo-supporter-sandbox.benefits-v2',repeat('f',64),pg_catalog.clock_timestamp());
INSERT INTO supporter_private.f16_sandbox_qa_v2_retry_grants
 (owner_id,predecessor_intent_id,predecessor_subscription_id,resolution,
  merchant_scope_verified,merchant_terminal_verified,all_transactions_reconciled,
  webhook_inbox_reconciled,no_outstanding_charge,no_collectible_subscription,
  evidence_digest,provider_checked_at,reconciliation_checked_at,approved_at)
 VALUES ('66666666-6666-4666-8666-666666666666',
 'intent-77777777-7777-4777-8777-777777777777','I-TEST-LATE01',
 'MERCHANT_CONFIRMED_ABSENT',true,true,true,true,true,true,repeat('b',64),
 '2026-10-18 15:00:00+00','2026-10-18 15:00:00+00','2026-10-18 15:01:00+00');
DO $test$
DECLARE attempt jsonb;
BEGIN
 attempt:=public.f16_qa_v2_retry_begin_checkout(
  '66666666-6666-4666-8666-666666666666','99999999-9999-4999-8999-999999999999',
  'es','pazo-supporter-sandbox.benefits-v2',repeat('f',64),true);
 INSERT INTO supporter_private.paypal_payment_entries(owner_id,external_subscription_id)
 VALUES('66666666-6666-4666-8666-666666666666','I-TEST-LATE01');
 IF public.f16_qa_v2_retry_claim_provider_create(
   '66666666-6666-4666-8666-666666666666','99999999-9999-4999-8999-999999999999',
   attempt->>'intentId')
 THEN RAISE EXCEPTION 'Late original payment did NOT stop provider-create claim'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
   WHERE owner_id='66666666-6666-4666-8666-666666666666'
   AND provider_create_claimed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Late payment falsely marked provider-create claimed'; END IF;
END $test$;

-- Grantee checks (without impersonating a hosted account).
DO $test$
BEGIN
 IF pg_catalog.has_table_privilege('service_role','supporter_private.f16_sandbox_qa_v2_retry_grants','INSERT')
 OR pg_catalog.has_table_privilege('authenticated','supporter_private.f16_sandbox_qa_v2_retry_attempts','SELECT')
 OR pg_catalog.has_function_privilege('authenticated','public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role','public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Role permissions leaked'; END IF;
END $test$;
\echo F16_SANDBOX_V2_RETRY_DISPOSABLE_POSTGRES_PASS
