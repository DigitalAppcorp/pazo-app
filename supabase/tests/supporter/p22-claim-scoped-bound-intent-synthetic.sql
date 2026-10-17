-- P22 mock PG; all changes rolled back. No PayPal, real users or credits.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 owner uuid:='11111111-1111-4111-8111-111111111111';
 ident text:='intent-77777777-7777-4777-8777-777777777777';
 sub text:='I-P22-TEST-BOUND001';
 claim jsonb;
 received jsonb;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P22 disposable test only'; END IF;
 IF has_function_privilege('anon','public.f16_p22_resolve_bound_under_claim(text,uuid,text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p22_resolve_bound_under_claim(text,uuid,text,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_p22_resolve_bound_under_claim(text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P22 resolver not service only'; END IF;
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id,provider,state,external_subscription_id)
 VALUES (ident,owner,'P-14V25407JP6850922NLHMDKI','paypal','bound',sub);
 INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type,verified_at)
 VALUES ('P22-SALE-CORRELATED','PAYMENT.SALE.COMPLETED',
  pg_catalog.clock_timestamp());
 IF public.f16_p22_resolve_bound_under_claim(
  'P22-SALE-CORRELATED',pg_catalog.gen_random_uuid(),sub,ident) IS NOT NULL
 THEN RAISE EXCEPTION 'P22 resolver ignored disabled gate'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate
 SET enabled=true,not_before=pg_catalog.clock_timestamp()-interval '1 minute'
 WHERE id=1;
 claim:=public.f16_p05_draft_claim_next_verified_event();
 IF claim->>'eventId'<>'P22-SALE-CORRELATED'
 THEN RAISE EXCEPTION 'P22 claim missing'; END IF;
 received:=public.f16_p22_resolve_bound_under_claim(
  'P22-SALE-CORRELATED',(claim->>'leaseToken')::uuid,sub,ident);
 IF received->>'ownerId'<>owner::text OR received->>'state'<>'bound'
  OR received->>'subscriptionId'<>sub OR received->>'intentId'<>ident
 THEN RAISE EXCEPTION 'P22 bound identity not recovered'; END IF;
 IF public.f16_p22_resolve_bound_under_claim(
  'P22-SALE-CORRELATED',pg_catalog.gen_random_uuid(),sub,ident) IS NOT NULL
 OR public.f16_p22_resolve_bound_under_claim(
  'P22-SALE-CORRELATED',(claim->>'leaseToken')::uuid,'I-P22-FOREIGN01',ident) IS NOT NULL
 OR public.f16_p22_resolve_bound_under_claim(
  'P22-SALE-CORRELATED',(claim->>'leaseToken')::uuid,sub,'intent-99999999-9999-4999-8999-999999999999') IS NOT NULL
 THEN RAISE EXCEPTION 'P22 leaked foreign or unclaimed subscription'; END IF;
 IF NOT public.f16_p05_draft_finish_claimed_event(
  'P22-SALE-CORRELATED',(claim->>'leaseToken')::uuid,'review','cycle_unproven')
 THEN RAISE EXCEPTION 'P22 review disposition missing'; END IF;
 IF public.f16_p22_resolve_bound_under_claim(
  'P22-SALE-CORRELATED',(claim->>'leaseToken')::uuid,sub,ident) IS NOT NULL
 THEN RAISE EXCEPTION 'P22 resolver permitted expired/reviewed claim'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P22 wrongly recorded payment'; END IF;
END
$test$;
ROLLBACK;
