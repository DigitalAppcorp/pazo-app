-- P25 postgres 17 disposable only. All review rows rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $setup$
DECLARE t timestamptz:=pg_catalog.clock_timestamp();
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
  OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P25 disposable only'; END IF;
 IF NOT has_function_privilege('service_role',
  'public.f16_p25_draft_reserve_first_obligation_review(text,uuid,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
  'public.f16_p25_draft_reserve_first_obligation_review(text,uuid,text,text,text)','EXECUTE')
 OR has_function_privilege('anon',
  'public.f16_p25_draft_reserve_first_obligation_review(text,uuid,text,text,text)','EXECUTE')
 OR has_table_privilege('service_role',
  'supporter_private.p25_first_obligation_reviews','SELECT')
 OR has_table_privilege('anon',
  'supporter_private.p25_first_obligation_reviews','SELECT')
 OR NOT EXISTS(SELECT 1 FROM pg_class c
   WHERE c.oid='supporter_private.p25_first_obligation_reviews'::regclass
    AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'P25 leaked private review access'; END IF;
 INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
 VALUES
 ('intent-77777777-7777-4777-8777-777777777777',
  '11111111-1111-4111-8111-111111111111',
  'paypal','P-14V25407JP6850922NLHMDKI','bound','I-P25-SUB-ONE',t-interval '1 hour'),
 ('intent-88888888-8888-4888-8888-888888888888',
  '22222222-2222-4222-8222-222222222222',
  'paypal','P-14V25407JP6850922NLHMDKI','bound','I-P25-SUB-TWO',t-interval '1 hour'),
 ('intent-99999999-9999-4999-8999-999999999999',
  '33333333-3333-4333-8333-333333333333',
  'paypal','P-14V25407JP6850922NLHMDKI','bound','I-P25-LEGACY',t-interval '1 hour');
 INSERT INTO supporter_private.paypal_p06_offers
 (version,locale,sha256,plan_id,price_minor,currency,cadence,published_at)
 VALUES('pazo-supporter-p25lab','es',repeat('a',64),
  'P-14V25407JP6850922NLHMDKI',299,'USD','MONTH_1',t-interval '4 hours');
 INSERT INTO supporter_private.paypal_p06_checkout_attempts
 (owner_id,request_key,intent_id,locale,terms_version,terms_sha256,
  consented_at,created_at,provider_create_claimed_at,retention_hold)
 VALUES
 ('11111111-1111-4111-8111-111111111111',pg_catalog.gen_random_uuid(),
  'intent-77777777-7777-4777-8777-777777777777','es',
  'pazo-supporter-p25lab',repeat('a',64),
  t-interval '3 hours',t-interval '170 minutes',t-interval '2 hours',true),
 ('22222222-2222-4222-8222-222222222222',pg_catalog.gen_random_uuid(),
  'intent-88888888-8888-4888-8888-888888888888','es',
  'pazo-supporter-p25lab',repeat('a',64),
  t-interval '3 hours',t-interval '170 minutes',t-interval '2 hours',true);
 INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at)
 VALUES ('P25-SALE-001','PAYMENT.SALE.COMPLETED',t);
END $setup$;

SET LOCAL ROLE service_role;
DO $worker$
DECLARE claim jsonb; out jsonb; blocked bool:=false;
BEGIN
 -- P21 disabled gate = no claim or review reservation possible.
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P25 claimed while OFF'; END IF;
 BEGIN
  PERFORM public.f16_p25_draft_reserve_first_obligation_review(
   'P25-SALE-001',pg_catalog.gen_random_uuid(),'I-P25-SUB-ONE',
   'intent-77777777-7777-4777-8777-777777777777','SALE-P25-001');
 EXCEPTION WHEN invalid_parameter_value THEN blocked:=true;END;
 IF NOT blocked THEN RAISE EXCEPTION 'P25 reserved without claim';END IF;
END $worker$;
SET LOCAL ROLE postgres;
UPDATE supporter_private.p05_inbox_worker_gate
 SET enabled=true,not_before=pg_catalog.clock_timestamp()-interval '2 minutes'
 WHERE id=1;
SET LOCAL ROLE service_role;

DO $verify$
DECLARE
 a jsonb;b jsonb;c jsonb;d jsonb;
 denied bool;
BEGIN
 a:=public.f16_p05_draft_claim_next_verified_event();
 IF a->>'eventId'<>'P25-SALE-001' THEN
 RAISE EXCEPTION 'P25 first signed sale claim missing';END IF;
 b:=public.f16_p25_draft_reserve_first_obligation_review(
  'P25-SALE-001',(a->>'leaseToken')::uuid,'I-P25-SUB-ONE',
  'intent-77777777-7777-4777-8777-777777777777','SALE-P25-001');
 IF b->>'phase'<>'FIRST_OBLIGATION_RESERVED_FOR_REVIEW'
 OR b->>'mayRecordPayment'<>'false'
 OR b->>'mayGrantBenefits'<>'false'
 OR b->>'mayCreatePaidPeriod'<>'false'
 OR b->>'paidThrough' IS NOT NULL
 OR b::text LIKE '%SALE-P25-001%' THEN
 RAISE EXCEPTION 'P25 first reservation not private/review-only';END IF;
 b:=public.f16_p25_draft_reserve_first_obligation_review(
  'P25-SALE-001',(a->>'leaseToken')::uuid,'I-P25-SUB-ONE',
  'intent-77777777-7777-4777-8777-777777777777','SALE-P25-001');
 IF b->>'phase'<>'FIRST_OBLIGATION_ALREADY_RESERVED'
 THEN RAISE EXCEPTION 'P25 exact replay not idempotent';END IF;

 -- Missing P06 legacy record cannot reserve any review obligation.
 SET CONSTRAINTS ALL IMMEDIATE;
 denied:=false;
 BEGIN
  PERFORM public.f16_p25_draft_reserve_first_obligation_review(
   'P25-SALE-001',(a->>'leaseToken')::uuid,'I-P25-LEGACY',
   'intent-99999999-9999-4999-8999-999999999999','SALE-P25-OTHER');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'P25 legacy without consent accepted';END IF;

 IF NOT public.f16_p05_draft_finish_claimed_event(
  'P25-SALE-001',(a->>'leaseToken')::uuid,'review','cycle_unproven')
 THEN RAISE EXCEPTION 'P25 failed to quarantine first event';END IF;
 denied:=false;
 BEGIN
  PERFORM public.f16_p25_draft_reserve_first_obligation_review(
   'P25-SALE-001',(a->>'leaseToken')::uuid,'I-P25-SUB-ONE',
   'intent-77777777-7777-4777-8777-777777777777','SALE-P25-001');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'P25 reused stale finished lease';END IF;
END $verify$;
SET LOCAL ROLE postgres;

INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at)
 VALUES('P25-SALE-002','PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp());
SET LOCAL ROLE service_role;
DO $different_sale$
DECLARE c jsonb; denied bool:=false;
BEGIN
 c:=public.f16_p05_draft_claim_next_verified_event();
 IF c->>'eventId'<>'P25-SALE-002' THEN RAISE EXCEPTION 'P25 second claim absent';END IF;
 BEGIN
 PERFORM public.f16_p25_draft_reserve_first_obligation_review(
  'P25-SALE-002',(c->>'leaseToken')::uuid,'I-P25-SUB-ONE',
  'intent-77777777-7777-4777-8777-777777777777','SALE-P25-002');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'P25 double-credit same first obligation';END IF;
END $different_sale$;
SET LOCAL ROLE postgres;

INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at)
 VALUES('P25-SALE-003','PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp());
SET LOCAL ROLE service_role;
DO $cross_sub$
DECLARE c jsonb; denied bool:=false;
BEGIN
 c:=public.f16_p05_draft_claim_next_verified_event();
 IF c->>'eventId'<>'P25-SALE-003' THEN RAISE EXCEPTION 'P25 third claim absent';END IF;
 BEGIN
 PERFORM public.f16_p25_draft_reserve_first_obligation_review(
  'P25-SALE-003',(c->>'leaseToken')::uuid,'I-P25-SUB-TWO',
  'intent-88888888-8888-4888-8888-888888888888','SALE-P25-001');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'P25 sale reused on foreign subscriber';END IF;
END $cross_sub$;
SET LOCAL ROLE postgres;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM supporter_private.p25_first_obligation_reviews)<>1
 OR EXISTS(SELECT 1 FROM supporter_private.p25_first_obligation_reviews
  WHERE obligation_ordinal<>0 OR review_state<>'review_required'
    OR NOT retention_hold OR owner_id<>'11111111-1111-4111-8111-111111111111')
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR (SELECT count(*) FROM supporter_private.paypal_payment_reversals)<>0
 THEN RAISE EXCEPTION 'P25 leaked credits or duplicated review';END IF;
END $assert$;
ROLLBACK;
