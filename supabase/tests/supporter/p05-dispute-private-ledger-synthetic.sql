-- F16-P05: sale=>owner/sub=>BOUND intent, disposable SQL only.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 plan text:='P-14V25407JP6850922NLHMDKI';
 owner_a uuid:='11111111-1111-4111-8111-111111111111';
 owner_b uuid:='22222222-2222-4222-8222-222222222222';
 p jsonb;i jsonb;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
   OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'F16 tests restricted to disposable DB'; END IF;
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-ABSENT-001')
  IS NOT NULL
 THEN RAISE EXCEPTION 'empty ledger must never show evidence'; END IF;
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
 VALUES
  ('intent-owner-a-eligible',owner_a,'paypal',plan,'bound',
   'I-OWNER-A-BOUND001',pg_catalog.clock_timestamp()-interval '1 hour'),
  ('intent-owner-b-eligible',owner_b,'paypal',plan,'bound',
   'I-OWNER-B-BOUND001',pg_catalog.clock_timestamp()-interval '1 hour'),
  ('intent-owner-a-pending',owner_a,'paypal',plan,'pending',NULL,NULL);
 INSERT INTO supporter_private.paypal_payment_entries
  (external_payment_id,external_subscription_id,owner_id,
   plan_id,gross_minor_units,currency,entry_state,completed_at)
 VALUES
  ('SALE-OWNER-A-001','I-OWNER-A-BOUND001',owner_a,plan,
   299,'USD','uncredited',pg_catalog.clock_timestamp()-interval '1 minute'),
  ('SALE-OWNER-B-001','I-OWNER-B-BOUND001',owner_b,plan,
   299,'USD','blocked_reversal',pg_catalog.clock_timestamp()-interval '1 minute'),
  ('SALE-NO-INTENT-001','I-UNBOUND-NO-INTENT',owner_a,plan,
   299,'USD','uncredited',pg_catalog.clock_timestamp()-interval '1 minute'),
  ('SALE-FOREIGN-OWNER','I-OWNER-A-BOUND001',owner_b,plan,
   299,'USD','uncredited',pg_catalog.clock_timestamp()-interval '1 minute');

 p:=public.f16_p05_draft_read_pazo_payment_by_sale('SALE-OWNER-A-001');
 IF p IS NULL OR p->>'externalPaymentId'<>'SALE-OWNER-A-001'
  OR p->>'externalSubscriptionId'<>'I-OWNER-A-BOUND001'
  OR p->>'ownerId'<>owner_a::text
  OR p->>'currency'<>'USD'
  OR (p->>'grossMinorUnits')::int<>299
  OR p->>'entryState'<>'uncredited'
 THEN RAISE EXCEPTION 'correct payment owner lookup failed'; END IF;
 i:=public.f16_p05_draft_read_bound_intent_for_sale(
   'I-OWNER-A-BOUND001',owner_a);
 IF i IS NULL OR i->>'ownerId'<>owner_a::text
  OR i->>'subscriptionId'<>'I-OWNER-A-BOUND001'
  OR i->>'intentId'<>'intent-owner-a-eligible'
  OR i->>'state'<>'bound'
 THEN RAISE EXCEPTION 'bound intent projection mismatch'; END IF;
 IF public.f16_p05_draft_read_bound_intent_for_sale(
   'I-OWNER-A-BOUND001',owner_b) IS NOT NULL
 THEN RAISE EXCEPTION 'cross-owner BOUND intent leaked'; END IF;
 IF public.f16_p05_draft_read_bound_intent_for_sale(
   'I-OWNER-B-BOUND001',owner_a) IS NOT NULL
 THEN RAISE EXCEPTION 'cross-subscription owner mismatch'; END IF;
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-FOREIGN-OWNER')
    IS NOT NULL
 THEN RAISE EXCEPTION 'seller sale from wrong owner was attributed'; END IF;
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-NO-INTENT-001')
    IS NOT NULL
 THEN RAISE EXCEPTION 'unbound orphaned ledger sale was attributed'; END IF;
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-DOES-NOT-EXIST')
    IS NOT NULL
 THEN RAISE EXCEPTION 'missing sale incorrectly attributed'; END IF;
 IF public.f16_p05_draft_read_pazo_payment_by_sale('../SALE-OWNER-A-001')
    IS NOT NULL
 THEN RAISE EXCEPTION 'untrusted sale format accepted'; END IF;
 IF public.f16_p05_draft_read_pazo_payment_by_sale(NULL) IS NOT NULL
 THEN RAISE EXCEPTION 'null sale lookup incorrectly attributed'; END IF;
 IF public.f16_p05_draft_read_bound_intent_for_sale(
   'I-OWNER-A-BOUND001',NULL) IS NOT NULL
 THEN RAISE EXCEPTION 'null owner exposed intent'; END IF;

 p:=public.f16_p05_draft_read_pazo_payment_by_sale('SALE-OWNER-B-001');
 IF p IS NULL OR p->>'entryState'<>'blocked_reversal'
 THEN RAISE EXCEPTION 'reversal-blocked payment identity must be visible'; END IF;

 UPDATE supporter_private.paypal_subscription_intents SET bound_at=NULL
 WHERE intent_id='intent-owner-a-eligible';
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-OWNER-A-001')
  IS NOT NULL
 THEN RAISE EXCEPTION 'missing bound_at was treated as authenticated'; END IF;
 IF public.f16_p05_draft_read_bound_intent_for_sale(
  'I-OWNER-A-BOUND001',owner_a) IS NOT NULL
 THEN RAISE EXCEPTION 'missing bound_at leaked intent'; END IF;
 UPDATE supporter_private.paypal_subscription_intents
 SET bound_at=pg_catalog.clock_timestamp()
 WHERE intent_id='intent-owner-a-eligible';

 UPDATE supporter_private.paypal_payment_entries SET gross_minor_units=598
 WHERE external_payment_id='SALE-OWNER-A-001';
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-OWNER-A-001')
  IS NOT NULL
 THEN RAISE EXCEPTION 'wrong amount was accepted'; END IF;
 UPDATE supporter_private.paypal_payment_entries SET gross_minor_units=299,
 currency='EUR' WHERE external_payment_id='SALE-OWNER-A-001';
 IF public.f16_p05_draft_read_pazo_payment_by_sale('SALE-OWNER-A-001')
  IS NOT NULL
 THEN RAISE EXCEPTION 'wrong currency was accepted'; END IF;
 -- The synthetic schema, like hosted, constrains entry_state.
 BEGIN
  UPDATE supporter_private.paypal_payment_entries
   SET entry_state='not_paid' WHERE external_payment_id='SALE-OWNER-A-001';
  RAISE EXCEPTION 'synthetic ledger accepted invalid financial state';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_first_period_reviews)
 THEN RAISE EXCEPTION 'attribution reader generated paid-period review'; END IF;
END
$test$;
ROLLBACK;