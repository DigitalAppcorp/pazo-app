-- Synthetic Vault data — local disposable DB only, not hosted credentials.
CREATE SCHEMA IF NOT EXISTS vault;
CREATE TABLE vault.decrypted_secrets(id uuid PRIMARY KEY,decrypted_secret text);
INSERT INTO vault.decrypted_secrets VALUES
 ('11111111-1111-4111-8111-111111111111','CLIENT_TEST_LIVE_ABCDEFG'),
 ('22222222-2222-4222-8222-222222222222','SECRET_TEST_LIVE_ABCDEFG'),
 ('33333333-3333-4333-8333-333333333333','CLIENT_SANDBOX_FAKE_ABCDEF'),
 ('44444444-4444-4444-8444-444444444444','SECRET_SANDBOX_FAKE_ABCDEF');
\i supabase/drafts/f16_live_historical_merchant_vault_DISPOSABLE_ONLY.sql
DO $historical_merchant$
DECLARE credential jsonb;
BEGIN
 IF has_function_privilege('anon','public.pazo_f16_live_historical_merchant_secrets(bigint)','EXECUTE') OR
  has_function_privilege('authenticated','public.pazo_f16_live_historical_merchant_secrets(bigint)','EXECUTE') OR
  has_function_privilege('service_role','public.pazo_f16_live_historical_merchant_secrets(bigint)','EXECUTE')
 THEN RAISE EXCEPTION 'Unreleased historic merchant secret RPC received grant'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','authenticated',true);
 credential:=public.pazo_f16_live_historical_merchant_secrets(1);
 IF credential IS NOT NULL THEN RAISE EXCEPTION 'Browser can read merchant secret'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','service_role',true);
 credential:=public.pazo_f16_live_historical_merchant_secrets(2);
 IF credential IS NOT NULL THEN RAISE EXCEPTION 'Sandbox generation returned as Live'; END IF;
 credential:=public.pazo_f16_live_historical_merchant_secrets(1);
 IF credential->>'clientSecret'<>'SECRET_TEST_LIVE_ABCDEFG' OR
  credential->>'merchantFingerprint'<>repeat('a',64) OR
  credential->>'planId'<>'P-ABCDEFGHIJKLMN'
 THEN RAISE EXCEPTION 'Live merchant original generation identity mismatch'; END IF;
 UPDATE admin_private.pazo_paypal_merchant_generations
  SET retired_at=pg_catalog.clock_timestamp() WHERE generation=1;
 credential:=public.pazo_f16_live_historical_merchant_secrets(1);
 IF credential->>'clientSecret'<>'SECRET_TEST_LIVE_ABCDEFG'
 THEN RAISE EXCEPTION 'Historical member lost original retired merchant'; END IF;
 IF has_table_privilege('service_role','vault.decrypted_secrets','SELECT')
 THEN RAISE EXCEPTION 'Service role gained direct Vault SELECT'; END IF;
 RAISE NOTICE 'F16_HISTORICAL_MERCHANT_DISPOSABLE_VAULT_PASS_NO_HOSTED';
END $historical_merchant$;
