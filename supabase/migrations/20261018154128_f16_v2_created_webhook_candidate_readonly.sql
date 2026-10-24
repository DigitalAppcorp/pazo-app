-- F16 Sandbox QA V2. PREPARED ONLY: do not apply without a separate PO
-- migration GO. Read-only candidate lookup, not an event disposition/grant.
-- An event close in time is NEVER proof it belongs to this subscription:
-- the server MUST GET the event from PayPal and match resource.id+custom_id.
BEGIN;
CREATE OR REPLACE FUNCTION public.f16_qa_v2_read_created_webhook_candidate(
 p_owner_id uuid,p_intent_id text
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 WITH eligible AS (
  SELECT a.created_at,i.intent_id
  FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
  JOIN supporter_private.paypal_subscription_intents i
   ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
  JOIN supporter_private.f16_sandbox_qa_owners q
   ON q.owner_id=a.owner_id
  WHERE a.owner_id=p_owner_id AND a.intent_id=p_intent_id
   AND i.state='bound' AND i.external_subscription_id IS NOT NULL
   AND q.status='enabled' AND q.expires_at>pg_catalog.clock_timestamp()
  LIMIT 1
 ), candidates AS (
  SELECT e.provider_event_id,e.verified_at
  FROM eligible a
  JOIN supporter_private.paypal_verified_event_inbox e
   ON e.event_type='BILLING.SUBSCRIPTION.CREATED'
   AND e.processing_state='pending'
   AND e.retention_hold IS TRUE
   AND e.verified_at >= a.created_at - INTERVAL '30 seconds'
   AND e.verified_at < a.created_at + INTERVAL '5 minutes'
 ), counted AS (
  SELECT count(*) AS count_candidate,max(provider_event_id) AS event_id,
   max(verified_at) AS event_verified_at FROM candidates
 )
 SELECT CASE WHEN (SELECT count(*) FROM eligible)=1
  AND counted.count_candidate=1 THEN pg_catalog.jsonb_build_object(
  'eventId',counted.event_id,'eventType','BILLING.SUBSCRIPTION.CREATED',
  'verifiedAt',counted.event_verified_at)
 ELSE NULL END
 FROM counted
$fn$;
REVOKE ALL ON FUNCTION public.f16_qa_v2_read_created_webhook_candidate(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_read_created_webhook_candidate(uuid,text)
 TO service_role;
-- Verify no user-facing data plane and no mutable financial authority.
DO $assert$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
    'public.f16_qa_v2_read_created_webhook_candidate(uuid,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
    'public.f16_qa_v2_read_created_webhook_candidate(uuid,text)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
    'public.f16_qa_v2_read_created_webhook_candidate(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 created webhook read privilege mismatch'; END IF;
END $assert$;
COMMIT;
