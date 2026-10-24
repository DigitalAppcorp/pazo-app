CREATE FUNCTION public.f16_p22_resolve_bound_under_claim(
 p_event_id text,p_claim_token uuid,p_subscription_id text,p_intent_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $read$
 SELECT pg_catalog.jsonb_build_object(
  'intentId',i.intent_id,'subscriptionId',i.external_subscription_id,
  'planId',i.plan_id,'state',i.state,'ownerId',i.owner_id)
 FROM supporter_private.paypal_verified_event_inbox e
 JOIN supporter_private.p05_inbox_worker_gate g ON g.id=1
 JOIN supporter_private.paypal_subscription_intents i ON
     i.intent_id=p_intent_id AND i.external_subscription_id=p_subscription_id
 WHERE p_event_id ~ '^[A-Za-z0-9._-]{3,128}$'
  AND p_claim_token IS NOT NULL
  AND p_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
  AND p_intent_id ~ '^intent-[A-Za-z0-9_-]{12,90}$'
  AND e.provider_event_id=p_event_id
  AND e.p05_claim_token=p_claim_token
  AND e.event_type='PAYMENT.SALE.COMPLETED'
  AND e.processing_state='processing'
  AND e.next_attempt_at>pg_catalog.clock_timestamp()
  AND e.retention_hold=true
  AND e.verified_at>=g.not_before
  AND g.enabled=true AND g.not_before IS NOT NULL
  AND i.state='bound' AND i.provider='paypal'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
 LIMIT 1
$read$;
REVOKE ALL ON FUNCTION public.f16_p22_resolve_bound_under_claim(text,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p22_resolve_bound_under_claim(text,uuid,text,text)
 TO service_role;