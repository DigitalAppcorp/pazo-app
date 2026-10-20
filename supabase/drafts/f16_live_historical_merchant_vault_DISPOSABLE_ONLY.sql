-- PAZO F16 — LIVE ORIGINAL MERCHANT CREDENTIAL READER LAB DRAFT.
-- DISPOSABLE PG17 ONLY. NEVER APPLY TO HOSTED PAZO. A separate versioned
-- deployment plus explicit PO GO and service-only grants would be required.
-- The service must first authenticate/verify the PayPal signature and read
-- owner scope. This is NOT an endpoint for a browser or active merchant switch.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
  OR to_regclass('vault.decrypted_secrets') IS NULL
  OR to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL
 THEN RAISE EXCEPTION 'F16 DISPOSABLE VAULT READ ONLY'
  USING ERRCODE='42501'; END IF;
END $guard$;

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
COMMIT;
