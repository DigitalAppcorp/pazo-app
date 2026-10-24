-- F16 Sandbox QA: owner-bound, READ-ONLY preflight before a user explicitly
-- requests cancellation of an unapproved PayPal subscription.
-- Does NOT grant retry, close a merchant subscription, or record payments.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'postgres'
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_retry_attempts') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_payment_entries') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_paid_periods') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_read_owner_account(uuid,text)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_abandonment_preflight(uuid,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 abandonment preflight baseline mismatch'
  USING ERRCODE='55000'; END IF;
END $guard$;

-- A local ledger preflight is a necessary, never sufficient, condition:
-- PayPal GET must additionally establish APPROVAL_PENDING with exact plan
-- and custom_id, and POST cancel must be followed by GET CANCELLED.
CREATE FUNCTION public.f16_qa_v2_abandonment_preflight(
 p_owner_id uuid,p_intent_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT p_owner_id IS NOT NULL AND p_intent_id IS NOT NULL AND
  p_intent_id ~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND EXISTS(
   SELECT 1
   FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
   JOIN supporter_private.paypal_subscription_intents i
    ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
   JOIN supporter_private.f16_sandbox_qa_owners q
    ON q.owner_id=a.owner_id
   JOIN auth.users u ON u.id=a.owner_id
   WHERE a.owner_id=p_owner_id AND a.intent_id=p_intent_id
     AND a.provider_create_claimed_at IS NOT NULL
     AND i.state='bound' AND i.provider='paypal'
     AND i.plan_id='P-14V25407JP6850922NLHMDKI'
     AND i.external_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'
     AND q.status='enabled' AND q.expires_at>pg_catalog.clock_timestamp()
     AND u.email_confirmed_at IS NOT NULL
     AND u.is_anonymous IS DISTINCT FROM true
     AND NOT EXISTS(
      SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts r
      WHERE r.owner_id=a.owner_id)
     AND NOT EXISTS(
      SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p
      WHERE p.owner_id=a.owner_id)
     AND NOT EXISTS(
      SELECT 1 FROM supporter_private.paypal_payment_entries p
      WHERE p.owner_id=a.owner_id)
     AND NOT EXISTS(
      SELECT 1 FROM supporter_private.paypal_verified_activation_bindings b
      WHERE b.owner_id=a.owner_id)
  )
$fn$;

ALTER FUNCTION public.f16_qa_v2_abandonment_preflight(uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_abandonment_preflight(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_abandonment_preflight(uuid,text)
 TO service_role;

DO $post$
BEGIN
 IF pg_catalog.has_function_privilege('anon',
  'public.f16_qa_v2_abandonment_preflight(uuid,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
  'public.f16_qa_v2_abandonment_preflight(uuid,text)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
  'public.f16_qa_v2_abandonment_preflight(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 abandonment preflight ACL mismatch'
  USING ERRCODE='42501'; END IF;
END $post$;
COMMIT;
