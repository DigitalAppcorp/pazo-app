-- F16-P24 PRIVATE LAB ONLY: claim + P06 immutable offer/consent lineage.
-- NEVER APPLY HOSTED without separate PO approval and migration versioning.
-- A matching event reference is NOT proof of cycle coverage or paid benefits.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
    OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P24 disposable PG17 only' USING ERRCODE='42501';
 END IF;
 IF to_regclass('supporter_private.p05_inbox_worker_gate') IS NULL
 OR to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NULL
 OR to_regclass('supporter_private.paypal_p06_offers') IS NULL THEN
  RAISE EXCEPTION 'P24 requires P21 claim and P06 consent schema'
   USING ERRCODE='55000';
 END IF;
END
$guard$;
CREATE FUNCTION public.f16_p24_read_claimed_original_consent(
 p_event_id text,p_claim_token uuid,p_subscription_id text,p_intent_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $lineage$
 SELECT pg_catalog.jsonb_build_object(
  'intentId',i.intent_id,
  'ownerId',i.owner_id,
  'subscriptionId',i.external_subscription_id,
  'acceptedAt',a.consented_at,
  'checkoutCreatedAt',a.created_at,
  'providerClaimedAt',a.provider_create_claimed_at,
  'boundAt',i.bound_at,
  'termsVersion',a.terms_version,
  'termsDigest',a.terms_sha256,
  'locale',a.locale,
  'priceMinor',o.price_minor,
  'currency',o.currency,
  'cadence',o.cadence,
  'publishedAt',o.published_at)
 FROM supporter_private.paypal_verified_event_inbox e
 JOIN supporter_private.p05_inbox_worker_gate g
  ON g.id=1 AND g.enabled AND g.not_before IS NOT NULL
 JOIN supporter_private.paypal_subscription_intents i
  ON i.intent_id=p_intent_id
  AND i.external_subscription_id=p_subscription_id
 JOIN supporter_private.paypal_p06_checkout_attempts a
  ON a.intent_id=i.intent_id AND a.owner_id=i.owner_id
 JOIN supporter_private.paypal_p06_offers o
  ON o.version=a.terms_version
  AND o.locale=a.locale AND o.sha256=a.terms_sha256
 WHERE p_event_id ~ '^[A-Za-z0-9._-]{3,128}$'
  AND p_claim_token IS NOT NULL
  AND p_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
  AND p_intent_id ~ '^intent-[A-Za-z0-9_-]{12,90}$'
  AND e.provider_event_id=p_event_id
  AND e.event_type='PAYMENT.SALE.COMPLETED'
  AND e.processing_state='processing'
  AND e.p05_claim_token=p_claim_token
  AND e.next_attempt_at>pg_catalog.clock_timestamp()
  AND e.verified_at>=g.not_before
  AND e.retention_hold=true
  AND i.provider='paypal' AND i.state='bound'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND o.plan_id=i.plan_id
  AND o.price_minor=299 AND o.currency='USD' AND o.cadence='MONTH_1'
  AND a.retention_hold=true
  AND a.provider_create_claimed_at IS NOT NULL
  AND o.published_at IS NOT NULL
  AND o.published_at<=a.consented_at
  AND a.consented_at<=a.created_at
  AND a.created_at<=a.provider_create_claimed_at
  AND a.provider_create_claimed_at<=i.bound_at
  AND i.bound_at<=e.verified_at
 LIMIT 1
$lineage$;
-- Function body has NO INSERT/UPDATE/DELETE and returns no terms text/payer info.
REVOKE ALL ON FUNCTION
 public.f16_p24_read_claimed_original_consent(text,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.f16_p24_read_claimed_original_consent(text,uuid,text,text)
 TO service_role;
COMMIT;
