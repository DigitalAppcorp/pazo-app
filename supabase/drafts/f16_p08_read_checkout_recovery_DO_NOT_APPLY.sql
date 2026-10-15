-- PAZO F16-P08: read-only recovery of a single private checkout.
-- DRAFT: ONLY for disposable PostgreSQL in CI. DO NOT APPLY to hosted.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P08 recovery SQL: disposable-only' USING ERRCODE='42501';
 END IF;
 IF to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NULL
 THEN RAISE EXCEPTION 'P08 checkout schema not installed'; END IF;
END
$guard$;

-- Auth is established independently by the Edge server using getUser().
-- Only the service-role caller passes the verified owner ID.
-- This returns references to SERVER code only, never a browser response.
CREATE FUNCTION public.f16_p08_read_checkout_recovery(
 p_owner_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $read$
 SELECT pg_catalog.jsonb_build_object(
  'ownerId',a.owner_id,'requestKey',a.request_key,
  'intentId',i.intent_id,'planId',i.plan_id,
  'state',i.state,
  'providerCreateClaimed',a.provider_create_claimed_at IS NOT NULL,
  'subscriptionId',CASE WHEN i.state='bound'
    THEN i.external_subscription_id ELSE NULL END
 )
 FROM supporter_private.paypal_p06_checkout_attempts a
 INNER JOIN supporter_private.paypal_subscription_intents i
 ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
 WHERE p_owner_id IS NOT NULL AND p_request_key IS NOT NULL
 AND a.owner_id=p_owner_id AND a.request_key=p_request_key
 AND i.plan_id='P-14V25407JP6850922NLHMDKI' AND i.provider='paypal'
 AND i.state IN('pending','bound')
 LIMIT 1
$read$;

REVOKE ALL ON FUNCTION public.f16_p08_read_checkout_recovery(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p08_read_checkout_recovery(uuid,uuid)
 TO service_role;
COMMIT;
