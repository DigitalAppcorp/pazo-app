-- PAZO F16 atomic provider-verified inbox -> private ledger contract.
-- PG17 disposable CI only; NO provider, PII, SQL hosted, or paid access.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'F16 atomic QA only in disposable fixture'; END IF;
END $guard$;

DO $permissions$
BEGIN
 IF has_function_privilege('anon','public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)','EXECUTE') OR
    has_function_privilege('authenticated','public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)','EXECUTE') OR
    has_function_privilege('anon','public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)','EXECUTE') OR
    has_function_privilege('authenticated','public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 financial commit RPC privileges wrong'; END IF;
END $permissions$;

SET LOCAL ROLE service_role;
DO $scenario$
DECLARE
 a uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
 b uuid:='8b134f73-5ee3-49a2-9a36-3e1592e5af81';
 intent text:='intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e';
 plan text:='P-14V25407JP6850922NLHMDKI';
 t timestamptz:='2026-10-13 19:00:00+00';
 decision text; rejected boolean; label text;
BEGIN
 IF public.f16_paypal_create_private_intent(a,intent) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'private intent fixture not created'; END IF;
 decision:=public.f16_paypal_bind_private_intent(intent,a,'I-ATOMIC-001',plan);
 IF decision <> 'new_binding' THEN RAISE EXCEPTION 'private bound intent missing'; END IF;
 -- Inbox already verifies signature before insert (separate verified listener).
 FOREACH label IN ARRAY ARRAY['WH-REV-EARLY','WH-SALE-LATE',
   'WH-SALE-FIRST','WH-REF-AFTER','WH-SALE-BAD','WH-SALE-OTHER',
   'WH-NOT-A-SALE'] LOOP
    IF public.f16_paypal_record_verified_event(label,
      CASE WHEN label LIKE 'WH-REV-%' THEN 'PAYMENT.SALE.REVERSED'
           WHEN label LIKE 'WH-REF-%' THEN 'PAYMENT.SALE.REFUNDED'
           WHEN label='WH-NOT-A-SALE' THEN 'BILLING.SUBSCRIPTION.ACTIVATED'
           ELSE 'PAYMENT.SALE.COMPLETED' END
    ) IS DISTINCT FROM true
    THEN RAISE EXCEPTION 'inbox event insertion failed'; END IF;
 END LOOP;
 -- Reversal first: persists tombstone even when original payment absent.
 decision:=public.f16_paypal_commit_verified_reversal(
  'WH-REV-EARLY','PAY-ATOMIC-1','reversed',t);
 IF decision <> 'reversal_recorded' THEN RAISE EXCEPTION 'early reversal not recorded'; END IF;
 decision:=public.f16_paypal_commit_verified_sale(
  'WH-SALE-LATE','PAY-ATOMIC-1','I-ATOMIC-001',a,plan,299,'USD',t);
 IF decision <> 'inserted_blocked' THEN RAISE EXCEPTION 'late sale escaped tombstone'; END IF;
 decision:=public.f16_paypal_commit_verified_sale(
  'WH-SALE-LATE','PAY-ATOMIC-1','I-ATOMIC-001',a,plan,299,'USD',t);
 IF decision <> 'already_processed' THEN RAISE EXCEPTION 'processed event retry not idempotent'; END IF;

 -- Sale first, refund afterwards, both provider events close atomically.
 decision:=public.f16_paypal_commit_verified_sale(
  'WH-SALE-FIRST','PAY-ATOMIC-2','I-ATOMIC-001',a,plan,299,'USD',t);
 IF decision <> 'inserted_uncredited' THEN RAISE EXCEPTION 'sale not persisted as uncredited'; END IF;
 decision:=public.f16_paypal_commit_verified_reversal(
  'WH-REF-AFTER','PAY-ATOMIC-2','refunded',t);
 IF decision <> 'reversal_recorded' THEN RAISE EXCEPTION 'later refund not recorded'; END IF;

 -- All failure branches must rollback both inbox-state and payment write.
 rejected:=false;
 BEGIN
  PERFORM public.f16_paypal_commit_verified_sale(
   'WH-SALE-BAD','PAY-ATOMIC-BAD','I-ATOMIC-001',a,plan,300,'USD',t);
 EXCEPTION WHEN invalid_parameter_value OR check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'wrong amount was committed'; END IF;
 rejected:=false;
 BEGIN
  PERFORM public.f16_paypal_commit_verified_sale(
   'WH-SALE-OTHER','PAY-ATOMIC-OTHER','I-ATOMIC-001',b,plan,299,'USD',t);
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'wrong owner was committed'; END IF;
 rejected:=false;
 BEGIN
  PERFORM public.f16_paypal_commit_verified_sale(
   'WH-NOT-A-SALE','PAY-ATOMIC-FAKE','I-ATOMIC-001',a,plan,299,'USD',t);
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'subscription status treated as paid'; END IF;
 rejected:=false;
 BEGIN
  PERFORM public.f16_paypal_commit_verified_sale(
   'WH-SALE-LATE','PAY-ATOMIC-SPOOF','I-ATOMIC-001',a,plan,299,'USD',t);
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'event reused for another payment'; END IF;

 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries
   WHERE external_payment_id LIKE 'PAY-ATOMIC-%') <> 2 OR
   (SELECT count(*) FROM supporter_private.paypal_payment_entries
   WHERE external_payment_id IN ('PAY-ATOMIC-1','PAY-ATOMIC-2')
     AND entry_state='blocked_reversal') <> 2 OR
   (SELECT count(*) FROM supporter_private.paypal_payment_reversals
   WHERE external_payment_id LIKE 'PAY-ATOMIC-%') <> 2
 THEN RAISE EXCEPTION 'financial ledger not atomic or idempotent'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id LIKE 'WH-%'
   AND provider_event_id IN ('WH-SALE-BAD','WH-SALE-OTHER','WH-NOT-A-SALE')
   AND (processing_state<>'pending' OR reconciled_payment_id IS NOT NULL))
 THEN RAISE EXCEPTION 'failed event has partial financial side effects'; END IF;
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id IN ('WH-REV-EARLY','WH-SALE-LATE',
 'WH-SALE-FIRST','WH-REF-AFTER')
 AND (processing_state<>'processed' OR reconciled_payment_id IS NULL
      OR retention_hold IS FALSE))
 THEN RAISE EXCEPTION 'processed payment event not safely persisted/held'; END IF;
 RAISE NOTICE 'PASS F16 atomic ledger: sale/refund ordering, rollback on invalid data, idempotent events, zero coverage';
END $scenario$;
RESET ROLE;
ROLLBACK;
