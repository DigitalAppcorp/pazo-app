-- PAZO F16 — APPLIED HOSTED 20261021060506. Read-only release remains OFF.
-- Single-entry Live PayPal credentials in Supabase Vault, NO Supabase Management PAT.
-- Does not activate checkout or change sandbox. Verify security/CI first.
-- service_role-only RPCs; all decrypted secrets returned ONLY to backend Edge.

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_vault_prepare(
 p_actor uuid,p_generation bigint,p_plan text,p_webhook text,
 p_client_id text,p_client_secret text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v_reservation admin_private.pazo_paypal_live_bootstrap_reservations%ROWTYPE;
 v_draft admin_private.paypal_gateway_settings%ROWTYPE;
 v_id uuid;v_secret uuid;v_hash text;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
  IS DISTINCT FROM 'service_role'
  OR p_actor IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_plan !~ '^P-[A-Z0-9]{12,40}$'
  OR p_webhook !~ '^[A-Za-z0-9_-]{8,100}$'
  OR p_client_id !~ '^[A-Za-z0-9_-]{20,256}$'
  OR p_client_secret !~ '^[A-Za-z0-9_-]{20,512}$'
  OR NOT EXISTS(SELECT 1 FROM admin_private.admin_grants WHERE user_id=p_actor)
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM admin_private.pazo_paypal_new_checkout_switch
 WHERE singleton=true AND environment='sandbox' AND live_enabled=false
  AND kill_switch=true AND active_generation IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('prepared',false); END IF;
 SELECT * INTO v_reservation FROM admin_private.pazo_paypal_live_bootstrap_reservations
 WHERE generation=p_generation FOR UPDATE;
 SELECT * INTO v_draft FROM admin_private.paypal_gateway_settings
 WHERE environment='live' FOR UPDATE;
 IF v_reservation.generation IS NULL OR v_reservation.state<>'reserved'
  OR v_reservation.actor_id IS DISTINCT FROM p_actor
  OR v_reservation.plan_id IS DISTINCT FROM p_plan
  OR v_draft.plan_id IS DISTINCT FROM p_plan
  OR v_draft.webhook_id IS DISTINCT FROM p_webhook
  OR v_draft.price_minor<>299 OR v_draft.currency<>'USD'
  OR v_draft.interval_unit<>'MONTH'
  OR v_draft.return_origin<>'https://pazo-app-t83r.vercel.app'
  OR v_draft.client_id_vault IS NOT NULL OR v_draft.client_secret_vault IS NOT NULL
  OR EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations
    WHERE generation=p_generation OR (environment='live' AND retired_at IS NULL))
 THEN RETURN pg_catalog.jsonb_build_object('prepared',false); END IF;
 -- This fingerprints the ORIGINAL verified PayPal application credential,
 -- not a merchant account ID. Independent payee/signed settlement proof
 -- remains mandatory before granting money-related entitlements.
 v_hash:=pg_catalog.encode(extensions.digest('paypal:live-app:'||p_client_id,'sha256'),'hex');
 v_id:=vault.create_secret(p_client_id,NULL,'PAZO F16 immutable Live Client ID');
 v_secret:=vault.create_secret(p_client_secret,NULL,'PAZO F16 immutable Live Client Secret');
 INSERT INTO admin_private.pazo_paypal_merchant_generations(
  generation,environment,merchant_fingerprint_sha256,
  plan_id,webhook_id,credential_source,client_id_vault,client_secret_vault)
 OVERRIDING SYSTEM VALUE VALUES(p_generation,'live',v_hash,p_plan,p_webhook,
  'vault',v_id,v_secret);
 UPDATE admin_private.pazo_paypal_live_bootstrap_reservations
 SET state='finalized',finalized_at=pg_catalog.clock_timestamp()
 WHERE generation=p_generation AND state='reserved';
 UPDATE admin_private.paypal_gateway_settings SET
  client_id_vault=v_id,client_secret_vault=v_secret,
  validation_status='valid',validated_at=pg_catalog.clock_timestamp(),
  updated_at=pg_catalog.clock_timestamp(),updated_by=p_actor
 WHERE environment='live';
 INSERT INTO admin_private.paypal_gateway_change_log(environment,actor_id,kind,details)
 VALUES('live',p_actor,'credentials',pg_catalog.jsonb_build_object(
  'generation',p_generation,'vault_encrypted',true,'activation',false,
  'merchant_account_verified',false));
 RETURN pg_catalog.jsonb_build_object('prepared',true,'generation',p_generation,
  'vaultStored',true,'mayCharge',false,'merchantIdentityVerified',false);
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_vault_status(
 p_generation bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
  IS DISTINCT FROM 'service_role' OR p_generation NOT BETWEEN 1 AND 9999
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object('generation',g.generation,
  'planId',g.plan_id,'webhookId',g.webhook_id,
  'vaultStored',g.client_id_vault IS NOT NULL AND g.client_secret_vault IS NOT NULL,
  'credentialSource',g.credential_source,'isRetired',g.retired_at IS NOT NULL,
  'environment',g.environment) INTO v
 FROM admin_private.pazo_paypal_merchant_generations g
 WHERE g.generation=p_generation AND g.environment='live'
  AND g.credential_source='vault';
 RETURN v;
END $f$;

CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_vault_read(
 p_generation bigint
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
  IS DISTINCT FROM 'service_role' OR p_generation NOT BETWEEN 1 AND 9999
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'generation',g.generation,'environment',g.environment,
  'provider','paypal','sourceEnvironment','live',
  'credentialSource',g.credential_source,
  'merchantFingerprint',g.merchant_fingerprint_sha256,
  'planId',g.plan_id,'webhookId',g.webhook_id,
  'clientId',ci.decrypted_secret,'clientSecret',cs.decrypted_secret,
  'isRetired',g.retired_at IS NOT NULL)
 INTO v
 FROM admin_private.pazo_paypal_merchant_generations g
 JOIN vault.decrypted_secrets ci ON ci.id=g.client_id_vault
 JOIN vault.decrypted_secrets cs ON cs.id=g.client_secret_vault
 WHERE g.generation=p_generation AND g.environment='live'
  AND g.credential_source='vault';
 RETURN v;
END $f$;

-- Old admin direct RPC must never rotate Live Vault IDs and corrupt a
-- generation's historical verification/cancellation source. Sandbox only.
CREATE OR REPLACE FUNCTION public.pazo_admin_paypal_save_credentials(
 p_environment text,p_client_id text,p_client_secret text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $f$
DECLARE actor uuid:=auth.uid(); old_id uuid;old_secret uuid;new_id uuid;new_secret uuid;
BEGIN
 IF p_environment IS DISTINCT FROM 'sandbox'
  OR actor IS NULL OR NOT EXISTS(
    SELECT 1 FROM admin_private.admin_grants WHERE user_id=actor)
  OR p_client_id IS NULL OR p_client_id !~ '^[A-Za-z0-9_-]{20,256}$'
  OR p_client_secret IS NULL OR p_client_secret !~ '^[A-Za-z0-9_-]{20,512}$'
 THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT client_id_vault,client_secret_vault INTO old_id,old_secret
 FROM admin_private.paypal_gateway_settings WHERE environment='sandbox' FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF old_id IS NULL THEN new_id:=vault.create_secret(p_client_id,NULL,'PAZO Sandbox gateway');
 ELSE PERFORM vault.update_secret(old_id,p_client_id);new_id:=old_id; END IF;
 IF old_secret IS NULL THEN new_secret:=vault.create_secret(p_client_secret,NULL,'PAZO Sandbox gateway');
 ELSE PERFORM vault.update_secret(old_secret,p_client_secret);new_secret:=old_secret; END IF;
 UPDATE admin_private.paypal_gateway_settings
 SET client_id_vault=new_id,client_secret_vault=new_secret,
  validation_status='not_verified',validated_at=NULL,
  updated_at=pg_catalog.clock_timestamp(),updated_by=actor
 WHERE environment='sandbox';
 INSERT INTO admin_private.paypal_gateway_change_log(environment,actor_id,kind)
 VALUES('sandbox',actor,'credentials');
 RETURN true;
END $f$;

REVOKE ALL ON FUNCTION public.pazo_f16_live_service_vault_prepare(uuid,bigint,text,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_vault_status(bigint)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_vault_read(bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_vault_prepare(uuid,bigint,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_vault_status(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_vault_read(bigint) TO service_role;
-- Checkout source is selected ONLY after a future separate gated Live switch.
-- Keep the existing sandbox/kill CHECK constraints unchanged.
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_active_route()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE output jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb ->> 'role')
  IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'service authorization required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'sourceEnvironment','live','merchantGeneration',g.generation,
  'planId',g.plan_id,'credentialSource',g.credential_source,
  'returnOrigin',c.return_origin)
 INTO output
 FROM admin_private.pazo_paypal_new_checkout_switch s
 JOIN admin_private.pazo_paypal_merchant_generations g ON g.generation=s.active_generation
 JOIN admin_private.paypal_gateway_settings c ON c.environment='live'
  AND c.plan_id=g.plan_id AND c.webhook_id=g.webhook_id
 WHERE s.singleton=true AND s.environment='live' AND s.live_enabled=true
  AND s.kill_switch=false AND g.environment='live'
  AND g.retired_at IS NULL AND g.credential_source IN ('vault','edge_secrets')
  AND c.return_origin='https://pazo-app-t83r.vercel.app';
 RETURN output;
END $f$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_active_route()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_active_route()
 TO service_role;

