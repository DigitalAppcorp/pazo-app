-- PAZO F16-P05 | merchant subscription -> private BOUND intent.
-- DRAFT ONLY: never apply to hosted Supabase. Disposable f14_synthetic CI.
-- Requires p05-inbox-claim-v1 draft to have been installed in CI first.
-- IMPORTANT: the merchant_subscription_id argument is NOT provider-attested
-- by SQL. Only an authenticated PayPal GET of this exact signed-inbox event
-- may supply it in a future trusted server process.
\set ON_ERROR_STOP on
BEGIN;
DO $gate$
BEGIN
 IF current_database()<>'f14_synthetic'
  OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'F16 P05 INVERSE LOOKUP DRAFT: disposable DB only'
 USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_subscription_intents') IS NULL
  OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
  OR to_regclass('supporter_private.p05_inbox_worker_gate') IS NULL
 THEN RAISE EXCEPTION 'F16 P05 prior claim/intent draft missing'; END IF;
END
$gate$;

-- A NULL response is a DENY; the service cannot list or enumerate intents.
-- The claim is indispensable, so an event outside the approved prospective
-- rollout window or a reclaimed/expired lease cannot resolve a subscription.
-- This is an INTERNAL lookup only. Never accept subscription ID from a user.
CREATE FUNCTION public.f16_p05_draft_resolve_claimed_subscription(
 p_event_id text,
 p_claim_token uuid,
 p_merchant_subscription_id text,
 p_merchant_custom_intent_id text)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $lookup$
 SELECT pg_catalog.jsonb_build_object(
  'intentId',s.intent_id,
  'ownerId',s.owner_id,
  'planId',s.plan_id,
  'subscriptionId',s.external_subscription_id,
  'state',s.state
 )
 FROM supporter_private.paypal_verified_event_inbox e
 JOIN supporter_private.p05_inbox_worker_gate g
 ON g.id=1 AND g.enabled AND g.not_before IS NOT NULL
 JOIN supporter_private.paypal_subscription_intents s
 ON s.external_subscription_id=p_merchant_subscription_id
 WHERE p_event_id ~ '^[A-Za-z0-9._-]{3,128}$'
  AND p_claim_token IS NOT NULL
  AND p_merchant_custom_intent_id ~ '^intent-[A-Za-z0-9_-]{12,90}
  AND p_merchant_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
  AND e.provider_event_id=p_event_id
  AND e.event_type='PAYMENT.SALE.COMPLETED'
  AND e.verified_at>=g.not_before
  AND e.processing_state='processing'
  AND e.p05_claim_token=p_claim_token
  AND e.next_attempt_at>pg_catalog.clock_timestamp()
  AND s.intent_id=p_merchant_custom_intent_id
  AND s.provider='paypal'
  AND s.state='bound'
  AND s.bound_at IS NOT NULL
  AND s.plan_id='P-14V25407JP6850922NLHMDKI'
  AND s.owner_id IS NOT NULL
 LIMIT 1
$lookup$;

REVOKE ALL ON FUNCTION public.f16_p05_draft_resolve_claimed_subscription(
 text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p05_draft_resolve_claimed_subscription(
 text,uuid,text,text) TO service_role;
COMMIT;

  AND p_merchant_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
  AND e.provider_event_id=p_event_id
  AND e.event_type='PAYMENT.SALE.COMPLETED'
  AND e.verified_at>=g.not_before
  AND e.processing_state='processing'
  AND e.p05_claim_token=p_claim_token
  AND e.next_attempt_at>pg_catalog.clock_timestamp()
  AND s.provider='paypal'
  AND s.state='bound'
  AND s.bound_at IS NOT NULL
  AND s.plan_id='P-14V25407JP6850922NLHMDKI'
  AND s.owner_id IS NOT NULL
 LIMIT 1
$lookup$;

REVOKE ALL ON FUNCTION public.f16_p05_draft_resolve_claimed_subscription(
 text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p05_draft_resolve_claimed_subscription(
 text,uuid,text) TO service_role;
COMMIT;
