-- P26 isolated PostgreSQL integration contract; transaction always rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'disposable DB required'; END IF;
END $$;
INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
VALUES
 ('intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111','paypal',
  'P-14V25407JP6850922NLHMDKI','bound','I-P26-SUB-ONE',clock_timestamp()),
 ('intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222','paypal',
  'P-14V25407JP6850922NLHMDKI','bound','I-P26-SUB-TWO',clock_timestamp());
INSERT INTO supporter_private.p25_first_obligation_reviews
 (intent_id,subscription_id,external_sale_id,provider_event_id,owner_id)
VALUES
 ('intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'I-P26-SUB-ONE','SALE-P26-001','EVENT-P26-001',
  '11111111-1111-4111-8111-111111111111'),
 ('intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'I-P26-SUB-TWO','SALE-P26-002','EVENT-P26-002',
  '22222222-2222-4222-8222-222222222222');
DO $$
BEGIN
 IF has_table_privilege('service_role','supporter_private.p26_proposed_obligation_credits','INSERT')
 OR has_table_privilege('authenticated','supporter_private.p26_proposed_obligation_credits','SELECT')
 OR has_table_privilege('anon','supporter_private.p26_proposed_obligation_credits','INSERT')
 OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='supporter_private.p26_proposed_obligation_credits'::regclass
   AND relrowsecurity AND relforcerowsecurity)
 THEN RAISE EXCEPTION 'P26 permissions failed'; END IF;
END $$;
INSERT INTO supporter_private.p26_proposed_obligation_credits
 (intent_id,obligation_ordinal,external_sale_id,owner_id)
VALUES
 ('intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0,'SALE-P26-001',
  '11111111-1111-4111-8111-111111111111');
DO $$
DECLARE rejected boolean;
BEGIN
 -- All conflicts must be rejected without changing the original blocked row.
 rejected:=false;
 BEGIN
  INSERT INTO supporter_private.p26_proposed_obligation_credits
   (intent_id,obligation_ordinal,external_sale_id,owner_id)
  VALUES ('intent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0,'SALE-P26-001',
   '11111111-1111-4111-8111-111111111111');
 EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'duplicate obligation accepted'; END IF;
 rejected:=false;
 BEGIN
  INSERT INTO supporter_private.p26_proposed_obligation_credits
   (intent_id,obligation_ordinal,external_sale_id,owner_id)
  VALUES ('intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',0,'SALE-P26-001',
   '22222222-2222-4222-8222-222222222222');
 EXCEPTION WHEN unique_violation OR invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'cross-intent sale accepted'; END IF;
 rejected:=false;
 BEGIN
  INSERT INTO supporter_private.p26_proposed_obligation_credits
   (intent_id,obligation_ordinal,external_sale_id,owner_id)
  VALUES ('intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',0,'SALE-P26-002',
   '11111111-1111-4111-8111-111111111111');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'foreign owner accepted'; END IF;
 rejected:=false;
 BEGIN
  INSERT INTO supporter_private.p26_proposed_obligation_credits
   (intent_id,obligation_ordinal,external_sale_id,owner_id,credit_state)
  VALUES ('intent-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',0,'SALE-P26-002',
   '22222222-2222-4222-8222-222222222222','credited');
 EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'paid state accepted'; END IF;
 IF (SELECT count(*) FROM supporter_private.p26_proposed_obligation_credits)<>1
 OR EXISTS (SELECT 1 FROM supporter_private.p26_proposed_obligation_credits WHERE credit_state<>'blocked')
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P26 unauthorized credit'; END IF;
END $$;
ROLLBACK;
