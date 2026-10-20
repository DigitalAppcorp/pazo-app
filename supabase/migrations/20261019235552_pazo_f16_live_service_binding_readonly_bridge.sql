-- PAZO F16 — MINIMAL READ-ONLY Live private-binding bridge.
-- Prepared in feature branch ONLY; explicit PO SQL gate required before APPLY.
-- No writer, no charge, no webhook registration, no checkout switch.
-- Intended for Supabase Edge service_role after trusted provider event signature.
BEGIN;
DO $g$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
 OR to_regclass('admin_private.pazo_paypal_merchant_generations') IS NULL
 THEN RAISE EXCEPTION 'F16 Live private binding prereqs not installed'
  USING ERRCODE='42501'; END IF;
END $g$;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_binding_read(
 p_subscription_id text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE v jsonb;
BEGIN
 -- JWT claim is imposed by PostgREST. This defense is IN ADDITION TO
 -- EXECUTE being exclusively granted to service_role below.
 IF pg_catalog.current_setting('request.jwt.claim.role',true)
  IS DISTINCT FROM 'service_role'
 THEN RETURN NULL; END IF;
 IF p_subscription_id IS NULL OR
  p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'provider','paypal',
  'sourceEnvironment','live',
  'subscriptionId',i.provider_subscription_id,
  'ownerId',i.owner_id,
  'intentId',i.intent_id,
  'planId',i.plan_id,
  'merchantGeneration',i.merchant_generation,
  'state',i.state,
  'consentVerified',true
 ) INTO v
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 JOIN admin_private.pazo_paypal_merchant_generations g
  ON g.generation=i.merchant_generation
 WHERE i.provider_subscription_id=p_subscription_id
  AND i.source_environment='live' AND i.state='bound'
  AND i.affirmative_consent AND i.provider_create_claimed_at IS NOT NULL
  AND g.environment='live' AND g.plan_id=i.plan_id
 LIMIT 1;
 RETURN v;
END $f$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_binding_read(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_binding_read(text)
 TO service_role;
-- No table SELECT is granted to service_role; a short, audited projection is
-- the only public-API exposure. Excludes user email, buyer identity, Vault IDs,
-- access tokens, payment payloads and dates.
COMMIT;
