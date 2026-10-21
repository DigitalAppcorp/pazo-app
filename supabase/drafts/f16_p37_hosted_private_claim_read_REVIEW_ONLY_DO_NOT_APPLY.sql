-- PAZO F16-P37 — HOSTED-COMPATIBLE READ-ONLY CANDIDATE. DO NOT APPLY.
-- A trusted PayPal-signed ingress must first persist a P40 binding via P42.
-- This SQL does not establish that signature independently.
-- This file has NEVER been approved for hosted execution and is NOT a migration.
-- No ledger, payment, entitlement, key, writer, worker or webhook changes.
BEGIN;
SET LOCAL lock_timeout='4s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
 IF current_user<>'postgres'
 OR NOT (
  (pg_catalog.current_database()='f14_synthetic'
     AND session_user='f14_admin')
  OR
  (pg_catalog.current_database()='postgres'
   AND pg_catalog.current_setting('pazo.f16_p37_ro_install_go',true)
     ='specific_po_sql_gate')
 )
 THEN RAISE EXCEPTION 'P37 private read installation requires specific GO'
  USING ERRCODE='42501'; END IF;
 IF pg_catalog.to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p05_inbox_worker_gate') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_p37_read_claimed_activation(text,uuid)') IS NOT NULL
 THEN RAISE EXCEPTION 'P37 prerequisite missing or function exists'
  USING ERRCODE='55000'; END IF;
 IF (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1)
    IS DISTINCT FROM false
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_activation_bindings)<>0
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P37 candidate requires OFF worker, empty bindings/ledger'
  USING ERRCODE='55000'; END IF;
 IF pg_catalog.to_regclass('supporter_private.p42_activation_writer_gate') IS NOT NULL
 THEN
  IF (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1)
     IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'P37 cannot install with P42 writer active'
   USING ERRCODE='55000'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c
   WHERE c.oid='supporter_private.paypal_verified_activation_bindings'::pg_catalog.regclass
   AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'P37 requires FORCE RLS P40'
  USING ERRCODE='55000'; END IF;
END $preflight$;

-- pgcrypto signature does NOT reside here; the P42 writer must prove
-- ingress provenance before creating the P40 event->owner binding.
-- This function is limited to a live, prospective, signed-source inbox
-- reference + exactly one PAZO BOUND intent and no payer data.
CREATE FUNCTION public.f16_p37_read_claimed_activation(
 p_event_id text,p_claim_token uuid
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
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
  AND g.enabled IS TRUE AND g.not_before IS NOT NULL
  AND e.provider_event_id=p_event_id
  AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
  AND e.verified_at IS NOT NULL
  AND e.verified_at>=g.not_before
  AND e.verified_at<=pg_catalog.clock_timestamp()
  AND b.created_at>=e.verified_at
  AND b.created_at>=g.not_before
  AND e.processing_state='processing'
  AND e.p05_claim_token=p_claim_token
  AND e.attempt_count BETWEEN 1 AND 5
  AND e.next_attempt_at>pg_catalog.clock_timestamp()
  AND e.retention_hold IS TRUE
  AND i.provider='paypal' AND i.state='bound'
  AND i.plan_id='P-14V25407JP6850922NLHMDKI'
  AND i.bound_at IS NOT NULL
  AND (SELECT pg_catalog.count(*)
    FROM supporter_private.paypal_subscription_intents j
    WHERE j.external_subscription_id=b.subscription_id
      AND j.provider='paypal')=1
 LIMIT 1;
$read$;

-- A SECURITY DEFINER in public MUST not inherit default PUBLIC execute.
REVOKE ALL ON FUNCTION public.f16_p37_read_claimed_activation(text,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_p37_read_claimed_activation(text,uuid)
 TO service_role;
COMMENT ON FUNCTION public.f16_p37_read_claimed_activation(text,uuid)
 IS 'F16-P37: service-role-only claim-scoped P40 association read. No payment or signature verification. Requires prospective trusted P42 ingress and P21 lease.';
COMMIT;
