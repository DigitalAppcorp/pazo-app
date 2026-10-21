-- F16: disposable PostgreSQL 17 only, multi-refund limitation proof.
\set ON_ERROR_STOP on
BEGIN;
DO $check$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Disposable DB required'; END IF;
END $check$;
SET LOCAL ROLE service_role;
DO $test$
DECLARE v jsonb; result text; rejected boolean:=false;
BEGIN
 PERFORM public.f16_paypal_record_verified_event('WH-PARTIAL-1-QA','PAYMENT.SALE.REFUNDED');
 PERFORM public.f16_paypal_record_verified_event('WH-PARTIAL-2-QA','PAYMENT.SALE.REFUNDED');
 v:=public.f16_lab_claim_verified_inbox('WH-PARTIAL-1-QA',60);
 result:=public.f16_lab_commit_claimed_reversal(
  'WH-PARTIAL-1-QA',(v->>'lease_token')::uuid,
  'PAY-PARTIAL-QA','partially_refunded','2026-10-14T12:00:00Z');
 IF result<>'reversal_recorded' THEN RAISE EXCEPTION 'First event not recorded'; END IF;
 v:=public.f16_lab_claim_verified_inbox('WH-PARTIAL-2-QA',60);
 BEGIN
  PERFORM public.f16_lab_commit_claimed_reversal(
   'WH-PARTIAL-2-QA',(v->>'lease_token')::uuid,
   'PAY-PARTIAL-QA','refunded','2026-10-14T12:10:00Z');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Second refund incorrectly accepted'; END IF;
END $test$;
SET LOCAL ROLE postgres;
DO $verify$
BEGIN
 IF NOT EXISTS (
 SELECT 1 FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-PARTIAL-2-QA'
 AND processing_state='processing' AND retention_hold=true)
 THEN RAISE EXCEPTION 'Second refund silently acknowledged'; END IF;
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'Entitlement bypass'; END IF;
END $verify$;
ROLLBACK;
SELECT 'PASS F16 multi refund unsupported, held, no entitlement';
