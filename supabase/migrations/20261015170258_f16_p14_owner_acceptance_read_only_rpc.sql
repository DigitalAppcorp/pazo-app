-- PAZO F16-P14: owner-only immutable consent text reconstruction.
-- DO NOT APPLY in Supabase. Separate disposable-only DDL, no data insert.
BEGIN;
-- Never return a generic "current offer": the immutable pair MUST be
-- the original version/locale/digest accepted by this exact owner.
CREATE FUNCTION public.f16_p14_read_owner_checkout_acknowledgement(
 p_owner_id uuid,p_intent_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $ack$
 SELECT pg_catalog.jsonb_build_object(
  'ownerId',a.owner_id,'intentId',a.intent_id,
  'locale',a.locale,'termsVersion',a.terms_version,
  'termsDigest',a.terms_sha256,'consentedAt',a.consented_at,
  'exactCopy',o.exact_copy,'priceMinor',o.price_minor,
  'currency',o.currency,'cadence',o.cadence)
 FROM supporter_private.paypal_p06_checkout_attempts a
 JOIN supporter_private.paypal_p06_offers o
  ON o.version=a.terms_version AND o.locale=a.locale
 JOIN supporter_private.paypal_subscription_intents i
  ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
 WHERE p_owner_id IS NOT NULL
 AND p_intent_id IS NOT NULL
 AND p_intent_id ~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 AND a.owner_id=p_owner_id AND a.intent_id=p_intent_id
 AND a.terms_sha256=o.sha256
 AND o.published_at IS NOT NULL
 AND o.published_at<=a.consented_at
 AND o.plan_id='P-14V25407JP6850922NLHMDKI'
 AND o.price_minor=299 AND o.currency='USD'
 AND o.cadence='MONTH_1'
 LIMIT 1
$ack$;
REVOKE ALL ON FUNCTION
 public.f16_p14_read_owner_checkout_acknowledgement(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.f16_p14_read_owner_checkout_acknowledgement(uuid,text)
 TO service_role;
COMMIT;
