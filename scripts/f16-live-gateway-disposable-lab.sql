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
\i supabase/drafts/f16_live_gateway_generation_inbox_DISPOSABLE_ONLY.sql
DO $check$
DECLARE tables_count integer;
BEGIN
 SELECT count(*) INTO tables_count
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname LIKE 'pazo_paypal_%' AND c.relkind='r'
  AND n.nspname IN('admin_private','supporter_private')
  AND c.relrowsecurity AND c.relforcerowsecurity;
 IF tables_count<>7 THEN
  RAISE EXCEPTION 'expected 7 FORCE RLS private tables, got %',tables_count;
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
DO $done$
BEGIN
 RAISE NOTICE 'F16_LIVE_GATEWAY_DISPOSABLE_PG17_PASS_NO_HOSTED_CHANGES';
END $done$;
