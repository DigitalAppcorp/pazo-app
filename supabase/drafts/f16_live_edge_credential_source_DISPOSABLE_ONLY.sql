-- F16 DISPOSABLE ONLY: remove mandatory Vault refs for EDGE generation.
-- This does not read/write credentials, and cannot activate Live checkout.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
  OR to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL
 THEN RAISE EXCEPTION 'F16 edge generation disposable only' USING ERRCODE='42501'; END IF;
END $guard$;
ALTER TABLE admin_private.pazo_paypal_merchant_generations
 ADD COLUMN credential_source text NOT NULL DEFAULT 'vault'
 CHECK(credential_source IN('vault','edge_secrets'));
ALTER TABLE admin_private.pazo_paypal_merchant_generations
 ALTER COLUMN client_id_vault DROP NOT NULL,
 ALTER COLUMN client_secret_vault DROP NOT NULL;
ALTER TABLE admin_private.pazo_paypal_merchant_generations
 ADD CONSTRAINT pazo_paypal_generation_credential_source_check
 CHECK(
  (credential_source='vault'
   AND client_id_vault IS NOT NULL AND client_secret_vault IS NOT NULL)
  OR
  (credential_source='edge_secrets'
   AND client_id_vault IS NULL AND client_secret_vault IS NULL)
 );

COMMIT;
