-- PAZO F16 P05: real SQL constraint tests on disposable PostgreSQL only.
-- Entire test rolls back. No actual PayPal/hosted data is ever queried.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 v_intent text := 'intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 v_second text := 'intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 v_sub text := 'I-SYNTHETIC111';
 v_sub2 text := 'I-SYNTHETIC222';
 v_start timestamptz := pg_catalog.clock_timestamp()-interval '1 day';
 v_end timestamptz := pg_catalog.clock_timestamp()+interval '27 days';
BEGIN
 IF current_database()<>'f14_synthetic'
  OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'F16 P05 synthetic only'; END IF;

 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id,state)
 VALUES (v_intent,'11111111-1111-4111-8111-111111111111',
  'P-SYNTHETICPLAN','pending');

 INSERT INTO supporter_private.paypal_terms_acceptances
  (intent_id,terms_version,terms_sha256,cancellation_notice_version,
  privacy_notice_version,displayed_language,presented_at,accepted_at)
 VALUES (v_intent,'offer-v1',repeat('a',64),'cancel-v1','privacy-v1',
  'es',v_start-interval '30 minutes',v_start-interval '25 minutes');

 BEGIN
  INSERT INTO supporter_private.paypal_terms_acceptances
  (intent_id,terms_version,terms_sha256,cancellation_notice_version,
   privacy_notice_version,displayed_language,presented_at,accepted_at)
  VALUES (v_intent,'offer-v1',repeat('a',64),'cancel-v1',
   'privacy-v1','es',v_start-interval '30 minutes',
   v_start-interval '25 minutes');
  RAISE EXCEPTION 'Duplicate consent unexpectedly succeeded';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;

 BEGIN
  INSERT INTO supporter_private.paypal_terms_acceptances
  (intent_id,terms_version,terms_sha256,cancellation_notice_version,
   privacy_notice_version,displayed_language,presented_at,accepted_at)
  VALUES (v_second,'offer-v1',repeat('a',64),'cancel-v1',
   'privacy-v1','en',v_start-interval '30 minutes',
   v_start-interval '25 minutes');
  RAISE EXCEPTION 'Orphan consent unexpectedly succeeded';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;

 UPDATE supporter_private.paypal_subscription_intents
 SET state='bound', external_subscription_id=v_sub
 WHERE intent_id=v_intent;
 INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type)
 VALUES ('WH-ACT-111','BILLING.SUBSCRIPTION.ACTIVATED'),
        ('WH-SALE-111','PAYMENT.SALE.COMPLETED'),
        ('WH-ACT-222','BILLING.SUBSCRIPTION.ACTIVATED'),
        ('WH-SALE-222','PAYMENT.SALE.COMPLETED');

 INSERT INTO supporter_private.paypal_activation_schedule_evidence
  (external_subscription_id,activation_event_id,activated_at,
   merchant_observed_at,observed_next_billing_at)
 VALUES (v_sub,'WH-ACT-111',v_start,v_start+interval '1 minute',v_end);

 BEGIN
  INSERT INTO supporter_private.paypal_activation_schedule_evidence
   (external_subscription_id,activation_event_id,activated_at,
    merchant_observed_at,observed_next_billing_at)
  VALUES (v_sub,'WH-ACT-222',v_start,v_end,v_end);
  RAISE EXCEPTION 'Invalid schedule chronology unexpectedly succeeded';
 EXCEPTION WHEN check_violation THEN NULL;
 END;

 INSERT INTO supporter_private.paypal_payment_entries
  (external_payment_id,external_subscription_id,entry_state)
 VALUES ('SALE-SYNTH-111',v_sub,'uncredited'),
        ('SALE-SYNTH-222',v_sub2,'uncredited');

 INSERT INTO supporter_private.paypal_first_period_reviews
  (external_subscription_id,external_payment_id,sale_event_id,
   candidate_start_at,candidate_end_exclusive_at)
 VALUES (v_sub,'SALE-SYNTH-111','WH-SALE-111',v_start,v_end);

 IF NOT EXISTS (
  SELECT 1 FROM supporter_private.paypal_first_period_reviews
  WHERE external_subscription_id=v_sub AND review_state='requires_review'
 ) THEN RAISE EXCEPTION 'First period incorrectly defaulted to approved'; END IF;

 BEGIN
  INSERT INTO supporter_private.paypal_first_period_reviews
   (external_subscription_id,external_payment_id,sale_event_id,
    candidate_start_at,candidate_end_exclusive_at,review_state)
  VALUES (v_sub,'SALE-SYNTH-222','WH-SALE-222',v_start,v_end,'approved');
  RAISE EXCEPTION 'Approved state unexpectedly succeeded';
 EXCEPTION WHEN check_violation THEN NULL;
 END;

 BEGIN
  INSERT INTO supporter_private.paypal_first_period_reviews
   (external_subscription_id,external_payment_id,sale_event_id,
    candidate_start_at,candidate_end_exclusive_at)
  VALUES (v_sub,'SALE-SYNTH-222','WH-SALE-222',v_end,v_start);
  RAISE EXCEPTION 'Nonpositive interval unexpectedly succeeded';
 EXCEPTION WHEN check_violation THEN NULL;
 END;

 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,plan_id,state,external_subscription_id)
 VALUES (v_second,'22222222-2222-4222-8222-222222222222',
  'P-SYNTHETICPLAN','bound',v_sub2);

 INSERT INTO supporter_private.paypal_activation_schedule_evidence
  (external_subscription_id,activation_event_id,activated_at,
   merchant_observed_at,observed_next_billing_at)
 VALUES (v_sub2,'WH-ACT-222',v_start,v_start+interval '1 minute',v_end);

 BEGIN
  INSERT INTO supporter_private.paypal_first_period_reviews
   (external_subscription_id,external_payment_id,sale_event_id,
    candidate_start_at,candidate_end_exclusive_at)
  VALUES (v_sub2,'SALE-SYNTH-111','WH-SALE-222',v_start,v_end);
  RAISE EXCEPTION 'Same sale applied to second first-cycle unexpectedly succeeded';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;

 BEGIN
  DELETE FROM supporter_private.paypal_subscription_intents
  WHERE intent_id=v_intent;
  RAISE EXCEPTION 'Consent source was erased despite FK RESTRICT';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;

 IF (SELECT count(*) FROM supporter_private.paypal_first_period_reviews)<>1
 THEN RAISE EXCEPTION 'Unexpected number of candidate records'; END IF;
END;
$test$;
ROLLBACK;
