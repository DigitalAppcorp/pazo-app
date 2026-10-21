-- F16 gateway generation/inbox rehearsal, PostgreSQL 17 DISPOSABLE ONLY.
-- This script creates a local, throwaway database and roles for the SQL draft.
CREATE DATABASE f14_synthetic;
\connect f14_synthetic
DO $roles$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $roles$;
CREATE SCHEMA IF NOT EXISTS admin_private;
CREATE SCHEMA IF NOT EXISTS supporter_private;
-- Model the two existing hosted admin dependencies in a disposable DB.
CREATE TABLE admin_private.admin_grants(user_id uuid PRIMARY KEY);
CREATE TABLE admin_private.paypal_gateway_runtime(
 singleton bool PRIMARY KEY,active_environment text,live_checkout_enabled bool);
INSERT INTO admin_private.paypal_gateway_runtime VALUES(true,'sandbox',false);
\i supabase/migrations/20261019235351_pazo_f16_live_gateway_inert_private_staging.sql
DO $check$
DECLARE tables_count integer;
BEGIN
 SELECT count(*) INTO tables_count
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname LIKE 'pazo_paypal_%' AND c.relkind='r'
  AND n.nspname IN('admin_private','supporter_private')
  AND c.relrowsecurity AND c.relforcerowsecurity;
 IF tables_count<>9 THEN
  RAISE EXCEPTION 'expected 9 FORCE RLS private tables, got %',tables_count;
 END IF;
 IF has_table_privilege('anon','supporter_private.pazo_paypal_live_paid_periods','SELECT')
  OR has_table_privilege('authenticated','supporter_private.pazo_paypal_live_checkout_intents','SELECT')
  OR has_table_privilege('service_role','supporter_private.pazo_paypal_live_event_inbox','INSERT')
  OR has_table_privilege('authenticated','admin_private.pazo_paypal_new_checkout_switch','UPDATE')
 THEN RAISE EXCEPTION 'unauthorized frontend/service table grant'; END IF;
 IF EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE live_enabled<>false OR kill_switch<>true OR environment<>'sandbox'
   OR active_generation IS NOT NULL)
 THEN RAISE EXCEPTION 'LIVE gateway unexpectedly enabled'; END IF;
END $check$;

-- An attempt to toggle Live must fail even for the postgres role in draft.
DO $off$
BEGIN
 BEGIN
  UPDATE admin_private.pazo_paypal_new_checkout_switch SET live_enabled=true;
  RAISE EXCEPTION 'FAIL live enable must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE admin_private.pazo_paypal_new_checkout_switch SET kill_switch=false;
  RAISE EXCEPTION 'FAIL kill switch disable must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $off$;

INSERT INTO admin_private.pazo_paypal_merchant_generations(
 environment,merchant_fingerprint_sha256,plan_id,webhook_id,
 client_id_vault,client_secret_vault
) VALUES('live',repeat('a',64),'P-ABCDEFGHIJKLMN','WH-12345678900',
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222');
-- Install a sandbox generation and prove it cannot be attached to a Live intent.
INSERT INTO admin_private.pazo_paypal_merchant_generations(
 environment,merchant_fingerprint_sha256,plan_id,webhook_id,
 client_id_vault,client_secret_vault
) VALUES('sandbox',repeat('c',64),'P-ABCDEFGHIJKLMN','WH-12345678999',
 '33333333-3333-4333-8333-333333333333',
 '44444444-4444-4444-8444-444444444444');
DO $cross$
BEGIN
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
   intent_id,owner_id,request_key,merchant_generation,plan_id,locale,
   terms_version,terms_digest,affirmative_consent
  ) VALUES('intent-45678901-1234-4234-8234-123456789abc',
   '12345678-1234-4234-8234-123456789abc',
   '45678901-1234-4234-8234-123456789abc',2,'P-ABCDEFGHIJKLMN',
   'es','pazo-supporter-live.offer-v1',repeat('b',64),true);
  RAISE EXCEPTION 'FAIL Sandbox merchant generation accepted into Live intent';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $cross$;
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
 intent_id,owner_id,request_key,merchant_generation,plan_id,locale,
 terms_version,terms_digest,affirmative_consent
) VALUES('intent-12345678-1234-4234-8234-123456789abc',
 '12345678-1234-4234-8234-123456789abc',
 '23456789-1234-4234-8234-123456789abc',
 1,'P-ABCDEFGHIJKLMN','es','pazo-supporter-live.offer-v1',repeat('b',64),true);

-- The same owner and request cannot generate another provider subscription.
DO $duplicate$
BEGIN
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
   intent_id,owner_id,request_key,merchant_generation,plan_id,locale,
   terms_version,terms_digest,affirmative_consent
  ) VALUES('intent-34567890-1234-4234-8234-123456789abc',
   '12345678-1234-4234-8234-123456789abc',
   '23456789-1234-4234-8234-123456789abc',
   1,'P-ABCDEFGHIJKLMN','es','pazo-supporter-live.offer-v1',repeat('b',64),true);
  RAISE EXCEPTION 'FAIL duplicate idempotency allowed';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $duplicate$;

UPDATE supporter_private.pazo_paypal_live_checkout_intents
 SET provider_create_claimed_at=pg_catalog.clock_timestamp(),
  provider_subscription_id='I-LIVE-SYNTHETIC1234',state='bound'
 WHERE intent_id='intent-12345678-1234-4234-8234-123456789abc';

INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
 merchant_generation,provider_event_id,event_type
) VALUES(1,'WH-EVENT-123','PAYMENT.SALE.COMPLETED');
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
 merchant_generation,provider_event_id,event_type
) VALUES(1,'WH-EVENT-123','PAYMENT.SALE.COMPLETED') ON CONFLICT DO NOTHING;

DO $inbox$
BEGIN
 IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_event_inbox)<>1
 THEN RAISE EXCEPTION 'LIVE inbox is not idempotent'; END IF;
END $inbox$;

INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
 sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
 service_start,service_end,merchant_verified_at
) VALUES('SALE-LIVE-ONE','intent-12345678-1234-4234-8234-123456789abc',
 1,'WH-EVENT-123','CYCLE-ONE','2026-10-19T00:00:00Z',
 '2026-11-19T00:00:00Z','2026-10-19T00:00:00Z');

DO $money$
BEGIN
 IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods)<>1
 THEN RAISE EXCEPTION 'LIVE period was not persisted'; END IF;
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
   sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
   amount_minor,service_start,service_end,merchant_verified_at
  ) VALUES('SALE-LIVE-TWO','intent-12345678-1234-4234-8234-123456789abc',
   1,'WH-EVENT-123','CYCLE-TWO',499,
   '2026-10-19T00:00:00Z','2026-11-19T00:00:00Z','2026-10-19T00:00:00Z');
  RAISE EXCEPTION 'FAIL unauthorized price accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
   sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
   service_start,service_end,merchant_verified_at
  ) VALUES('SALE-LIVE-THREE','intent-12345678-1234-4234-8234-123456789abc',
   1,'WH-EVENT-123','CYCLE-THREE','2026-10-19T00:00:00Z',
   '2026-12-19T00:00:00Z','2026-10-19T00:00:00Z');
  RAISE EXCEPTION 'FAIL oversized period accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $money$;
-- A signed CREATED event cannot create a paid period; one verified SALE
-- event also cannot be used to mint two paid periods.
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
 merchant_generation,provider_event_id,event_type
) VALUES(1,'WH-EVENT-CREATED','BILLING.SUBSCRIPTION.CREATED');
DO $negative$
BEGIN
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
   sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
   service_start,service_end,merchant_verified_at
  ) VALUES('SALE-BAD-CREATED','intent-12345678-1234-4234-8234-123456789abc',
   1,'WH-EVENT-CREATED','CYCLE-BAD-CREATED',
   '2026-10-19T00:00:00Z','2026-11-19T00:00:00Z','2026-10-19T00:00:00Z');
  RAISE EXCEPTION 'FAIL CREATED event yielded paid period';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
   sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
   service_start,service_end,merchant_verified_at
  ) VALUES('SALE-BAD-DUPLICATE','intent-12345678-1234-4234-8234-123456789abc',
   1,'WH-EVENT-123','CYCLE-BAD-DUPLICATE',
   '2026-11-19T00:00:00Z','2026-12-19T00:00:00Z','2026-11-19T00:00:00Z');
  RAISE EXCEPTION 'FAIL duplicate use of signed sale event';
 EXCEPTION WHEN unique_violation THEN NULL; END;
END $negative$;
-- cancel claim installed by the staging migration
DO $cancel_claim$
DECLARE first_claim boolean; second_claim boolean; wrong_owner boolean;
BEGIN
 first_claim:=supporter_private.pazo_live_claim_cancel_once(
  '12345678-1234-4234-8234-123456789abc',
  'intent-12345678-1234-4234-8234-123456789abc',1);
 second_claim:=supporter_private.pazo_live_claim_cancel_once(
  '12345678-1234-4234-8234-123456789abc',
  'intent-12345678-1234-4234-8234-123456789abc',1);
 wrong_owner:=supporter_private.pazo_live_claim_cancel_once(
  '33333333-3333-4333-8333-333333333333',
  'intent-12345678-1234-4234-8234-123456789abc',1);
 IF first_claim<>true OR second_claim<>false OR wrong_owner<>false OR
  (SELECT count(*) FROM supporter_private.pazo_paypal_live_cancel_claims)<>1
 THEN RAISE EXCEPTION 'Live owner cancellation claim is not unique or owner-scoped'; END IF;
 IF has_function_privilege('anon',
  'supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)','EXECUTE') OR
  has_function_privilege('authenticated',
  'supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)','EXECUTE') OR
  has_function_privilege('service_role',
  'supporter_private.pazo_live_claim_cancel_once(uuid,text,bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Unreleased cancellation RPC has executable grants'; END IF;
END $cancel_claim$;
-- projection installed by the staging migration
DO $projection$
DECLARE v jsonb;
BEGIN
 v:=supporter_private.pazo_live_project_paid_periods(
  '12345678-1234-4234-8234-123456789abc','2026-10-20T00:00:00Z');
 IF v->>'active'<>'true' OR (v->>'completedCycles')::int<>0 OR
  v->>'sourceEnvironment'<>'live'
 THEN RAISE EXCEPTION 'Live period not reflected by projection'; END IF;
 v:=supporter_private.pazo_live_project_paid_periods(
  '33333333-3333-4333-8333-333333333333','2026-10-20T00:00:00Z');
 IF v->>'active'<>'false' OR (v->>'completedCycles')::int<>0
 THEN RAISE EXCEPTION 'Another owner received benefits'; END IF;
END $projection$;
INSERT INTO supporter_private.pazo_paypal_live_period_holds(
 sale_id,hold_id,kind,verified_at
) VALUES('SALE-LIVE-ONE','HOLD-REFUND-ONE','refunded','2026-10-20T00:00:00Z');
DO $hold$
DECLARE v jsonb;
BEGIN
 v:=supporter_private.pazo_live_project_paid_periods(
  '12345678-1234-4234-8234-123456789abc','2026-10-20T01:00:00Z');
 IF v->>'active'<>'false' OR v->>'paidThrough'<>''
  AND v->>'paidThrough' IS NOT NULL
 THEN RAISE EXCEPTION 'Held sale still grants Live period'; END IF;
END $hold$;
UPDATE supporter_private.pazo_paypal_live_period_holds
 SET released_at='2026-10-21T00:00:00Z'
 WHERE sale_id='SALE-LIVE-ONE';
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
 merchant_generation,provider_event_id,event_type
) VALUES(1,'WH-EVENT-456','PAYMENT.SALE.COMPLETED');
INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
 sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
 service_start,service_end,merchant_verified_at
) VALUES('SALE-LIVE-SECOND','intent-12345678-1234-4234-8234-123456789abc',
 1,'WH-EVENT-456','CYCLE-SECOND','2026-11-19T00:00:00Z',
 '2026-12-19T00:00:00Z','2026-11-19T00:00:00Z');
DO $two$
DECLARE v jsonb;
BEGIN
 v:=supporter_private.pazo_live_project_paid_periods(
  '12345678-1234-4234-8234-123456789abc','2026-11-20T00:00:00Z');
 IF v->>'active'<>'true' OR (v->>'completedCycles')::int<>1
 THEN RAISE EXCEPTION 'Live payment cycle progression incorrect'; END IF;
END $two$;
INSERT INTO supporter_private.pazo_paypal_live_event_inbox(
 merchant_generation,provider_event_id,event_type
) VALUES(1,'WH-EVENT-789','PAYMENT.SALE.COMPLETED');
INSERT INTO supporter_private.pazo_paypal_live_paid_periods(
 sale_id,intent_id,merchant_generation,provider_event_id,cycle_key,
 service_start,service_end,merchant_verified_at
) VALUES('SALE-LIVE-OVERLAP','intent-12345678-1234-4234-8234-123456789abc',
 1,'WH-EVENT-789','CYCLE-OVERLAP','2026-11-01T00:00:00Z',
 '2026-12-01T00:00:00Z','2026-11-01T00:00:00Z');
DO $overlap$
DECLARE v jsonb;
BEGIN
 v:=supporter_private.pazo_live_project_paid_periods(
  '12345678-1234-4234-8234-123456789abc','2026-11-20T00:00:00Z');
 IF v->>'active'<>'false' OR (v->>'completedCycles')::int<>0 OR
  v->>'paidThrough' IS NOT NULL
 THEN RAISE EXCEPTION 'Overlapping payment windows granted benefits'; END IF;
 RAISE NOTICE 'F16_LIVE_GATEWAY_DISPOSABLE_PG17_PASS_NO_HOSTED_CHANGES';
END $overlap$;

\i scripts/f16-live-cutover-cas-lab.sql
\i scripts/f16-live-intent-rpc-disposable-lab.sql
\i scripts/f16-live-binding-receipt-disposable-lab.sql
\i scripts/f16-live-refund-disposable-lab.sql
\i scripts/f16-live-service-bridge-disposable-lab.sql
\i scripts/f16-live-historical-merchant-disposable-lab.sql
\i scripts/f16-live-edge-credential-generation-disposable-lab.sql
\i scripts/f16-live-service-rpc-bridge-disposable-lab.sql
\i scripts/f16-live-admin-origin-disposable-lab.sql
\i scripts/f16-live-secret-provision-disposable-lab.sql
\i scripts/f16-live-recorded-sale-read-disposable-lab.sql
\i scripts/f16-live-bootstrap-lease-disposable-lab.sql
\i scripts/f16-live-json-claims-disposable-lab.sql
\i scripts/f16-live-resource-inspection-disposable-lab.sql
