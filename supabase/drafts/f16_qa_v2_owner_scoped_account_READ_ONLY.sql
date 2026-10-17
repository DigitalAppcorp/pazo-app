-- PAZO F16 QA V2: owner-and-intent-scoped account receipt/status read.
-- Independently query the NEW V2 checkout attempt, never a historical P06
-- subscription that happens to share this Auth owner.
-- Service-role only. Provider status/cancellation still requires PayPal GET.
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database() NOT IN ('f14_synthetic','postgres')
 OR to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NULL
 OR to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR to_regclass('supporter_private.paypal_p06_offers') IS NULL
 OR to_regprocedure('public.f16_qa_v2_read_owner_account(uuid,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 V2 owner-scoped read preflight refused'
  USING ERRCODE='55000'; END IF;
END $guard$;

CREATE FUNCTION public.f16_qa_v2_read_owner_account(
 p_owner_id uuid,p_intent_id text
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $read$
 SELECT pg_catalog.jsonb_build_object(
   'ownerId',a.owner_id,
   'intentId',i.intent_id,
   'provider','paypal',
   'planId',i.plan_id,
   'state',i.state,
   'externalSubscriptionId', CASE WHEN i.state='bound'
      THEN i.external_subscription_id ELSE NULL END,
   'locale',a.locale,
   'termsVersion',a.terms_version,
   'termsDigest',a.terms_sha256,
   'exactCopy',o.exact_copy,
   'consentedAt',a.consented_at,
   'priceMinor',o.price_minor,
   'currency',o.currency,
   'cadence',o.cadence,
   'providerCreateClaimed',a.provider_create_claimed_at IS NOT NULL
 )
 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
 INNER JOIN supporter_private.paypal_subscription_intents i
   ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
 INNER JOIN supporter_private.paypal_p06_offers o
   ON o.version=a.terms_version AND o.locale=a.locale
   AND o.sha256=a.terms_sha256
 WHERE p_owner_id IS NOT NULL
  AND p_intent_id IS NOT NULL
  AND p_intent_id ~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND a.owner_id=p_owner_id AND a.intent_id=p_intent_id
  AND a.terms_version='pazo-supporter-sandbox.benefits-v2'
  AND i.provider='paypal' AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND i.state IN ('pending','bound')
  AND o.currency='USD' AND o.price_minor=299 AND o.cadence='MONTH_1'
 LIMIT 1
$read$;
ALTER FUNCTION public.f16_qa_v2_read_owner_account(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_read_owner_account(uuid,text)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_read_owner_account(uuid,text)
 TO service_role;

DO $post$
BEGIN
 IF has_function_privilege('anon','public.f16_qa_v2_read_owner_account(uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_qa_v2_read_owner_account(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_qa_v2_read_owner_account(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 V2 account read ACL mismatch'
  USING ERRCODE='42501'; END IF;
END $post$;
COMMIT;
