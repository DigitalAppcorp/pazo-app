-- PAZO F16 claim/lease/retry lab-only invariants. ROLLBACK all fixture writes.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Unsafe lease QA database'; END IF;
 IF EXISTS(
  SELECT 1 FROM pg_catalog.pg_proc p
  WHERE p.oid IN (
    'public.f16_lab_claim_verified_inbox(text,integer)'::regprocedure,
    'public.f16_lab_ack_lifecycle(text,uuid)'::regprocedure,
    'public.f16_lab_release_claim(text,uuid,text,boolean)'::regprocedure,
    'public.f16_lab_recover_expired(integer)'::regprocedure
  ) AND (NOT p.prosecdef OR pg_catalog.pg_get_userbyid(p.proowner)<>'postgres'
    OR NOT ('search_path=""'=ANY(p.proconfig))))
 THEN RAISE EXCEPTION 'Lease RPC is not hardened definer'; END IF;
 IF has_table_privilege('service_role',
    'supporter_private.paypal_verified_event_inbox','UPDATE')
 OR has_table_privilege('anon',
    'supporter_private.paypal_verified_event_inbox','SELECT')
 OR has_function_privilege('anon',
    'public.f16_lab_claim_verified_inbox(text,integer)','EXECUTE')
 OR has_function_privilege('authenticated',
    'public.f16_lab_claim_verified_inbox(text,integer)','EXECUTE')
 OR NOT has_function_privilege('service_role',
    'public.f16_lab_claim_verified_inbox(text,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'Unauthorized claim access'; END IF;
END $guard$;
CREATE TEMP TABLE before_finance ON COMMIT DROP AS SELECT
 (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries) AS sales,
 (SELECT COUNT(*) FROM supporter_private.paypal_payment_reversals) AS reversals;
SET LOCAL ROLE postgres;
INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type)
 VALUES
 ('WH-LEASE-LIFECYCLE','BILLING.SUBSCRIPTION.ACTIVATED'),
 ('WH-LEASE-SALE','PAYMENT.SALE.COMPLETED'),
 ('WH-LEASE-EXPIRE','PAYMENT.SALE.REVERSED'),
 ('WH-LEASE-TERMINAL','BILLING.SUBSCRIPTION.CANCELLED');
SET LOCAL ROLE service_role;
DO $tests$
DECLARE v jsonb; v2 jsonb; t uuid; wrong uuid:=pg_catalog.gen_random_uuid();
BEGIN
 v:=public.f16_lab_claim_verified_inbox('WH-LEASE-LIFECYCLE',60);
 IF v->>'event_type'<>'BILLING.SUBSCRIPTION.ACTIVATED'
 OR (v->>'attempt')::integer<>1
 OR v->>'lease_token' IS NULL
 THEN RAISE EXCEPTION 'First lifecycle lease invalid'; END IF;
 t:=(v->>'lease_token')::uuid;
 IF public.f16_lab_claim_verified_inbox('WH-LEASE-LIFECYCLE',60) IS NOT NULL
 THEN RAISE EXCEPTION 'Double claim succeeded'; END IF;
 IF public.f16_lab_ack_lifecycle('WH-LEASE-LIFECYCLE',wrong)
 OR NOT public.f16_lab_ack_lifecycle('WH-LEASE-LIFECYCLE',t)
 OR public.f16_lab_ack_lifecycle('WH-LEASE-LIFECYCLE',t)
 THEN RAISE EXCEPTION 'Ack did not enforce live unique token'; END IF;

 v:=public.f16_lab_claim_verified_inbox('WH-LEASE-SALE',60);
 t:=(v->>'lease_token')::uuid;
 IF public.f16_lab_ack_lifecycle('WH-LEASE-SALE',t)
 THEN RAISE EXCEPTION 'Sale event bypassed ledger atomicity'; END IF;
 IF public.f16_lab_release_claim('WH-LEASE-SALE',wrong,'owner_unbound')
 OR NOT public.f16_lab_release_claim('WH-LEASE-SALE',t,'owner_unbound')
 THEN RAISE EXCEPTION 'Retry token validation failed'; END IF;
 IF public.f16_lab_claim_verified_inbox('WH-LEASE-SALE',60) IS NOT NULL
 THEN RAISE EXCEPTION 'Backoff was bypassed'; END IF;

 v:=public.f16_lab_claim_verified_inbox('WH-LEASE-TERMINAL',60);
 t:=(v->>'lease_token')::uuid;
 IF NOT public.f16_lab_release_claim(
   'WH-LEASE-TERMINAL',t,'permanent_invalid',true)
 THEN RAISE EXCEPTION 'Terminal quarantine failed'; END IF;
 IF public.f16_lab_claim_verified_inbox('WH-LEASE-TERMINAL',60) IS NOT NULL
 THEN RAISE EXCEPTION 'Quarantined event became claimable'; END IF;
END $tests$;
SET LOCAL ROLE postgres;
-- Simulate two dead workers without waiting for real time.
UPDATE supporter_private.paypal_verified_event_inbox
SET processing_state='processing',attempt_count=3,
 f16_lease_token=pg_catalog.gen_random_uuid(),
 f16_lease_expires_at=pg_catalog.clock_timestamp()-interval '2 seconds'
WHERE provider_event_id='WH-LEASE-EXPIRE';
UPDATE supporter_private.paypal_verified_event_inbox
SET processing_state='processing',attempt_count=5,
 f16_lease_token=pg_catalog.gen_random_uuid(),
 f16_lease_expires_at=pg_catalog.clock_timestamp()-interval '2 seconds'
WHERE provider_event_id='WH-LEASE-SALE';
SET LOCAL ROLE service_role;
DO $recovery$
BEGIN
 IF public.f16_lab_recover_expired(100)<>2
 OR public.f16_lab_recover_expired(100)<>0
 THEN RAISE EXCEPTION 'Expired lease recovery is not deterministic'; END IF;
 IF public.f16_lab_claim_verified_inbox('WH-LEASE-EXPIRE',60) IS NOT NULL
 THEN RAISE EXCEPTION 'Recovery skipped retry backoff'; END IF;
END $recovery$;
SET LOCAL ROLE postgres;
DO $outcomes$
BEGIN
 IF EXISTS (
 SELECT 1 FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id IN ('WH-LEASE-LIFECYCLE','WH-LEASE-SALE','WH-LEASE-EXPIRE','WH-LEASE-TERMINAL')
 AND (retention_hold IS DISTINCT FROM true OR
      f16_lease_token IS NOT NULL OR f16_lease_expires_at IS NOT NULL)
 ) THEN RAISE EXCEPTION 'Lease secrets or retention hold leaked'; END IF;
 IF (SELECT processing_state FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-LEASE-LIFECYCLE')<>'processed'
 OR (SELECT processing_state FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-LEASE-SALE')<>'quarantined'
 OR (SELECT processing_state FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-LEASE-EXPIRE')<>'pending'
 OR (SELECT processing_state FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-LEASE-TERMINAL')<>'quarantined'
 THEN RAISE EXCEPTION 'Recovery state transition mismatch'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>
    (SELECT sales FROM before_finance)
 OR (SELECT count(*) FROM supporter_private.paypal_payment_reversals)<>
    (SELECT reversals FROM before_finance)
 OR supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'Lease lab affected financial or entitlement state'; END IF;
END $outcomes$;
ROLLBACK;
SELECT 'PASS F16: lease token, ack lifecycle only, retry, expiry, quarantine, ACL and no money';
