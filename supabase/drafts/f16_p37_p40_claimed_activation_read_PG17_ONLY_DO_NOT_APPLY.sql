-- F16-P37: P40 claim-scoped activation association read. DISPOSABLE PG17 ONLY.
-- Reads preexisting P40 binding, P21 lease and BOUND intent; no INSERT/UPDATE.
-- P40's existence is NOT cryptographic PayPal proof. Original ingress must be
-- verified independently and written only through a separately reviewed P42
-- signer; this read merely checks existing references under a live lease.
-- DO NOT copy into migrations or apply to hosted Supabase.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin' OR current_user<>'postgres'
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p05_inbox_worker_gate') IS NULL
 THEN RAISE EXCEPTION 'F16 P37 LAB PG17 ONLY' USING ERRCODE='42501'; END IF;
END $guard$;

CREATE FUNCTION public.f16_p37_lab_read_claimed_activation(p_event_id text,p_claim_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $read$
 SELECT pg_catalog.jsonb_build_object(
  'id',e.provider_event_id,
  'type','BILLING.SUBSCRIPTION.ACTIVATED',
  'processingState','processing',
  'subscriptionId',b.subscription_id,
  'source','p40_inbox_binding_claim',
  'leaseCurrent',true
 )
 FROM supporter_private.paypal_verified_event_inbox e
 JOIN supporter_private.p05_inbox_worker_gate g ON g.id=1
 JOIN supporter_private.paypal_verified_activation_bindings b
   ON b.provider_event_id=e.provider_event_id
 JOIN supporter_private.paypal_subscription_intents i
   ON i.external_subscription_id=b.subscription_id
   AND i.owner_id=b.owner_id
 WHERE p_event_id IS NOT NULL
  AND p_event_id ~ '^[A-Za-z0-9._-]{3,128}$'
  AND p_claim_token IS NOT NULL
  AND g.enabled IS TRUE
  AND g.not_before IS NOT NULL
  AND e.verified_at>=g.not_before
  AND e.provider_event_id=p_event_id
  AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
  AND e.verified_at IS NOT NULL
  AND e.processing_state='processing'
  AND e.p05_claim_token=p_claim_token
  AND e.next_attempt_at>pg_catalog.clock_timestamp()
  AND e.retention_hold IS TRUE
  AND i.provider='paypal' AND i.state='bound'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND i.bound_at IS NOT NULL
 LIMIT 1;
$read$;
REVOKE ALL ON FUNCTION public.f16_p37_lab_read_claimed_activation(text,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_p37_lab_read_claimed_activation(text,uuid)
 TO service_role;
COMMIT;
