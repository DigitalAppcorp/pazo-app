-- PAZO F16 V2 verified CREATED candidate, isolated PG17 only.
\set ON_ERROR_STOP on
BEGIN;
CREATE SCHEMA supporter_private;
DO $roles$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $roles$;
CREATE TABLE supporter_private.f16_sandbox_qa_owners (
 owner_id uuid PRIMARY KEY,status text NOT NULL,expires_at timestamptz NOT NULL
);
CREATE TABLE supporter_private.paypal_subscription_intents (
 intent_id text PRIMARY KEY,owner_id uuid NOT NULL,state text NOT NULL,
 external_subscription_id text
);
CREATE TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts (
 owner_id uuid NOT NULL,intent_id text NOT NULL,created_at timestamptz NOT NULL
);
CREATE TABLE supporter_private.paypal_verified_event_inbox (
 provider_event_id text PRIMARY KEY,event_type text NOT NULL,
 verified_at timestamptz NOT NULL,processing_state text NOT NULL,
 retention_hold boolean NOT NULL
);
ALTER TABLE supporter_private.paypal_verified_event_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_verified_event_inbox FORCE ROW LEVEL SECURITY;
INSERT INTO supporter_private.f16_sandbox_qa_owners VALUES
 ('11111111-1111-4111-8111-111111111111','enabled','2030-01-01');
INSERT INTO supporter_private.paypal_subscription_intents VALUES
 ('intent-33333333-3333-4333-8333-333333333333',
 '11111111-1111-4111-8111-111111111111','bound','I-TEST-SUB-ONE');
INSERT INTO supporter_private.f16_sandbox_qa_v2_checkout_attempts VALUES
 ('11111111-1111-4111-8111-111111111111',
 'intent-33333333-3333-4333-8333-333333333333',
 '2026-10-17T19:41:37+00:00');
INSERT INTO supporter_private.paypal_verified_event_inbox VALUES
 ('WH-VERIFIED-TEST-ONE','BILLING.SUBSCRIPTION.CREATED',
  '2026-10-17T19:41:47+00:00','pending',true),
 ('WH-OLD-TEST','BILLING.SUBSCRIPTION.CREATED',
  '2026-10-14T00:00:00+00:00','pending',true),
 ('WH-NEW-LATE-TEST','BILLING.SUBSCRIPTION.CREATED',
  '2026-10-17T19:48:47+00:00','pending',true),
 ('WH-PAYMENT-TEST','PAYMENT.SALE.COMPLETED',
  '2026-10-17T19:41:48+00:00','pending',true);
COMMIT;
\i supabase/migrations/20261018154128_f16_v2_created_webhook_candidate_readonly.sql

-- Exactly ONE signed-created candidate, not a proof of ownership until GET.
DO $check$
DECLARE result jsonb;
BEGIN
 SELECT public.f16_qa_v2_read_created_webhook_candidate(
 '11111111-1111-4111-8111-111111111111',
 'intent-33333333-3333-4333-8333-333333333333') INTO result;
 IF result->>'eventId' IS DISTINCT FROM 'WH-VERIFIED-TEST-ONE'
 OR result->>'eventType' IS DISTINCT FROM 'BILLING.SUBSCRIPTION.CREATED'
 THEN RAISE EXCEPTION 'Expected exactly one signed CREATED candidate'; END IF;
 IF public.f16_qa_v2_read_created_webhook_candidate(
 '44444444-4444-4444-8444-444444444444',
 'intent-33333333-3333-4333-8333-333333333333') IS NOT NULL
 THEN RAISE EXCEPTION 'Foreign owner received a signed event'; END IF;
 IF public.f16_qa_v2_read_created_webhook_candidate(
 '11111111-1111-4111-8111-111111111111',
 'intent-55555555-5555-4555-8555-555555555555') IS NOT NULL
 THEN RAISE EXCEPTION 'Foreign intent received a signed event'; END IF;
END $check$;

-- Two candidates close in time are AMBIGUOUS. Never pick one by date.
INSERT INTO supporter_private.paypal_verified_event_inbox VALUES
 ('WH-SECOND-PENDING','BILLING.SUBSCRIPTION.CREATED',
  '2026-10-17T19:41:48+00:00','pending',true);
DO $check$
BEGIN
 IF public.f16_qa_v2_read_created_webhook_candidate(
 '11111111-1111-4111-8111-111111111111',
 'intent-33333333-3333-4333-8333-333333333333') IS NOT NULL
 THEN RAISE EXCEPTION 'Two nearby CREATED events were falsely considered unambiguous'; END IF;
END $check$;

-- Events that are not pending signed inbox references are NEVER claimed.
UPDATE supporter_private.paypal_verified_event_inbox
 SET processing_state='review' WHERE provider_event_id='WH-SECOND-PENDING';
UPDATE supporter_private.paypal_verified_event_inbox
 SET processing_state='review' WHERE provider_event_id='WH-VERIFIED-TEST-ONE';
DO $check$
BEGIN
 IF public.f16_qa_v2_read_created_webhook_candidate(
 '11111111-1111-4111-8111-111111111111',
 'intent-33333333-3333-4333-8333-333333333333') IS NOT NULL
 THEN RAISE EXCEPTION 'Inactive CREATED event was incorrectly accepted'; END IF;
END $check$;

-- No direct browser RPC execution (and the inbox stays FORCE RLS).
DO $check$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
   'public.f16_qa_v2_read_created_webhook_candidate(uuid,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
   'public.f16_qa_v2_read_created_webhook_candidate(uuid,text)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
   'public.f16_qa_v2_read_created_webhook_candidate(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Unexpected function permissions'; END IF;
END $check$;
\echo F16_V2_CREATED_WEBHOOK_CANDIDATE_READONLY_LAB_PASS
