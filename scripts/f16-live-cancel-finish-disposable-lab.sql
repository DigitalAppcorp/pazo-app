-- PAZO F16 cancellation finish: disposable PG17 only, no hosted writes.
-- This lab runs after base Live gateway seeded one bound owner + claimed
-- cancellation and after the original owner-slot migration rehearsal.
\i supabase/migrations/20261021193000_pazo_f16_live_cancel_finish.sql

DO $acl$
BEGIN
 IF has_function_privilege('anon',
  'public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)','EXECUTE')
 OR has_function_privilege('authenticated',
  'public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)','EXECUTE')
 OR NOT has_function_privilege('service_role',
  'public.pazo_f16_live_service_cancel_finish(uuid,text,bigint,text)','EXECUTE')
 THEN RAISE EXCEPTION 'cancel-finish ACL violated'; END IF;
END $acl$;

BEGIN;
SET LOCAL request.jwt.claims='{"role":"service_role"}';
DO $cancel$
DECLARE i text:='intent-12345678-1234-4234-8234-123456789abc';
 own uuid:='12345678-1234-4234-8234-123456789abc';
 wrong uuid:='12345678-1234-4234-8234-123456789def';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims
  WHERE intent_id=i AND merchant_generation=1 AND state='claimed')
 THEN RAISE EXCEPTION 'synthetic cancellation claim missing'; END IF;
 IF public.pazo_f16_live_service_cancel_finish(wrong,i,1,'confirmed') IS NOT FALSE
 OR public.pazo_f16_live_service_cancel_finish(own,i,2,'confirmed') IS NOT FALSE
 OR public.pazo_f16_live_service_cancel_finish(own,i,1,NULL) IS NOT FALSE
 THEN RAISE EXCEPTION 'unauthorized owner/generation/outcome finalized'; END IF;
 IF public.pazo_f16_live_service_cancel_finish(own,i,1,'review_required') IS NOT TRUE
 THEN RAISE EXCEPTION 'cannot mark ambiguous cancellation as review'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims
  WHERE intent_id=i AND provider_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'review must not fabricate provider confirmation'; END IF;
 IF public.pazo_f16_live_service_cancel_finish(own,i,1,'confirmed') IS NOT TRUE
 OR public.pazo_f16_live_service_cancel_finish(own,i,1,'confirmed') IS NOT TRUE
 THEN RAISE EXCEPTION 'independent verification cannot confirm idempotently'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims
  WHERE intent_id=i AND state='confirmed' AND provider_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'confirmed cancellation not durable'; END IF;
 IF public.pazo_f16_live_service_cancel_finish(own,i,1,'review_required') IS NOT FALSE
 THEN RAISE EXCEPTION 'confirmed cancellation was demoted'; END IF;
END $cancel$;
SET LOCAL request.jwt.claims='{"role":"anon"}';
DO $deny$
BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_cancel_finish(
   '12345678-1234-4234-8234-123456789abc',
   'intent-12345678-1234-4234-8234-123456789abc',1,'confirmed');
  RAISE EXCEPTION 'anon-like JWT could finalize cancellation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny$;
ROLLBACK;

DO $post$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims
  WHERE intent_id='intent-12345678-1234-4234-8234-123456789abc'
   AND state='claimed' AND provider_confirmed_at IS NULL)
 THEN RAISE EXCEPTION 'lab left cancellation state changed'; END IF;
 RAISE NOTICE 'F16_LIVE_CANCEL_DISPOSABLE_PG17_PASS_ZERO_HOSTED_WRITES';
END $post$;
