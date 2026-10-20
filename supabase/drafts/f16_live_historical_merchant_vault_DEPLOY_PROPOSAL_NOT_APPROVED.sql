-- PAZO F16 — PROPOSED read-only original PayPal Live Vault RPC.
-- CANDIDATE for a future standalone versioned migration, NOT AUTHORIZED.
-- Do NOT run on hosted PAZO without an explicit Product Owner GO.
-- Sensitive: returns client credentials to server-side service_role ONLY.
-- No SQL writes, merchant switching or checkout activation.
BEGIN;
DO $preflight$
BEGIN
 IF to_regclass('vault.decrypted_secrets') IS NULL
  OR to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
  OR to_regprocedure('public.pazo_f16_live_historical_merchant_secrets(bigint)') IS NOT NULL
  OR NOT EXISTS (SELECT 1 FROM admin_private.paypal_gateway_runtime
    WHERE singleton=true AND active_environment='sandbox'
      AND live_checkout_enabled=false)
 THEN RAISE EXCEPTION 'PAZO F16 historical merchant Vault preflight unavailable'
  USING ERRCODE='42501'; END IF;
END $preflight$;

CREATE FUNCTION public.pazo_f16_live_historical_merchant_secrets(
 p_generation bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE output jsonb;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
   IS DISTINCT FROM 'service_role'
  OR p_generation IS NULL OR p_generation<1
 THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'provider','paypal','environment','live','generation',g.generation,
  'planId',g.plan_id,'webhookId',g.webhook_id,
  'merchantFingerprint',g.merchant_fingerprint_sha256,
  'clientId',id.decrypted_secret,'clientSecret',secret.decrypted_secret
 ) INTO output
 FROM admin_private.pazo_paypal_merchant_generations g
 JOIN vault.decrypted_secrets id ON id.id=g.client_id_vault
 JOIN vault.decrypted_secrets secret ON secret.id=g.client_secret_vault
 WHERE g.generation=p_generation AND g.environment='live'
  AND id.decrypted_secret IS NOT NULL AND
      pg_catalog.length(id.decrypted_secret) BETWEEN 8 AND 512
  AND secret.decrypted_secret IS NOT NULL AND
      pg_catalog.length(secret.decrypted_secret) BETWEEN 8 AND 512
  AND EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents i
   WHERE i.merchant_generation=g.generation AND i.state='bound'
    AND i.source_environment='live' AND i.plan_id=g.plan_id
    AND i.provider_subscription_id IS NOT NULL
  );
 -- Retired generations remain readable for status/cancel of ORIGINAL
 -- members; this must NEVER create a new subscription with retired creds.
 RETURN output;
END $f$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_historical_merchant_secrets(bigint)
 FROM PUBLIC,anon,authenticated,service_role;
-- Only trusted server service_role: no direct Vault or table SELECT grants.
GRANT EXECUTE ON FUNCTION
 public.pazo_f16_live_historical_merchant_secrets(bigint) TO service_role;
COMMIT;
