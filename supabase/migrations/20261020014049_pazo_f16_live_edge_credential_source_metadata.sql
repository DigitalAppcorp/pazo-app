-- PAZO F16 — Product Owner approved Edge merchant generation metadata only.
-- Authorized only to switch the merchant
-- metadata schema from mandatory Vault refs to Edge-secret generation pinning.
-- Preserves existing non-NULL Vault refs for all current rows.
-- Does NOT read/write credentials, grant ACL, enable Live or publish Edge.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL OR
  EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='admin_private' AND table_name='pazo_paypal_merchant_generations'
    AND column_name='credential_source') OR
  NOT EXISTS(SELECT 1 FROM admin_private.paypal_gateway_runtime
   WHERE singleton=true AND active_environment='sandbox'
    AND live_checkout_enabled=false) OR
  EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND (environment<>'sandbox' OR live_enabled OR
    NOT kill_switch OR active_generation IS NOT NULL))
 THEN RAISE EXCEPTION 'F16 edge generation hosted preflight unavailable'
  USING ERRCODE='42501'; END IF;
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

-- Final state invariant: old rows stay valid, new Edge generation has NULL refs.
DO $postflight$
BEGIN
 IF EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
  WHERE (credential_source='vault' AND
    (client_id_vault IS NULL OR client_secret_vault IS NULL))
  OR (credential_source='edge_secrets' AND
    (client_id_vault IS NOT NULL OR client_secret_vault IS NOT NULL)))
 THEN RAISE EXCEPTION 'Invalid F16 merchant generation source'; END IF;
END $postflight$;

-- Preserve FORCE RLS, ACLs and disabled Live selectors transactionally.
DO $acl_postflight$
DECLARE relation_oid oid;
BEGIN
 SELECT c.oid INTO relation_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='admin_private' AND c.relname='pazo_paypal_merchant_generations';
 IF relation_oid IS NULL
   OR NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=relation_oid
       AND c.relrowsecurity AND c.relforcerowsecurity)
   OR has_table_privilege('anon',relation_oid,'SELECT')
   OR has_table_privilege('authenticated',relation_oid,'SELECT')
   OR has_table_privilege('service_role',relation_oid,'SELECT')
   OR NOT EXISTS(SELECT 1 FROM admin_private.paypal_gateway_runtime
        WHERE singleton AND active_environment='sandbox' AND live_checkout_enabled=false)
   OR EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
        WHERE singleton AND (environment<>'sandbox' OR live_enabled
         OR NOT kill_switch OR active_generation IS NOT NULL))
 THEN RAISE EXCEPTION 'F16 Edge metadata postflight blocked' USING ERRCODE='42501'; END IF;
END $acl_postflight$;
COMMIT;
