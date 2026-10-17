-- PAZO F16: privileged-only paid-period ledger writer, synthetic PG17.
-- Never commits proof, holds or synthetic Auth users to any real environment.
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'f14_synthetic'
 OR session_user <> 'f14_admin'
 OR to_regprocedure('supporter_private.f16_mvp_record_verified_paid_period(text,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz)') IS NULL
 THEN RAISE EXCEPTION 'Not disposable PG17 writer test'; END IF;
END $guard$;
SET LOCAL ROLE postgres;
INSERT INTO auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
 VALUES ('57777777-7777-4777-8777-777777777777',
 'authenticated','authenticated','pazo-private-mvp@example.invalid','{}','{}');
DO $test$
DECLARE
 own uuid:='57777777-7777-4777-8777-777777777777';
 before_ts timestamptz:=pg_catalog.clock_timestamp();
 a timestamptz:=before_ts-interval '2 days';
 b timestamptz:=before_ts+interval '28 days';
 terms text:=repeat('f',64);
 result text;
 period jsonb;
BEGIN
 IF has_function_privilege('anon',
   'supporter_private.f16_mvp_record_verified_paid_period(text,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz)','EXECUTE')
 OR has_function_privilege('service_role',
   'supporter_private.f16_mvp_record_verified_paid_period(text,text,uuid,text,text,text,timestamptz,timestamptz,timestamptz)','EXECUTE')
 OR has_function_privilege('authenticated',
   'supporter_private.f16_mvp_record_merchant_hold(text,text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'Private writer ACL violated'; END IF;

 result:=supporter_private.f16_mvp_record_verified_paid_period(
  'PAYMENT-MVP-OPERATOR-01','I-MVP-OPERATOR-01',own,'cycle-operator-01',
  'WEBHOOK-MVP-OPERATOR-01',terms,a,b,before_ts);
 IF result <> 'F16_MVP_PAID_PERIOD_RECORDED_PRIVATE_ONLY'
 THEN RAISE EXCEPTION 'Private proof creation failed'; END IF;

 result:=supporter_private.f16_mvp_record_verified_paid_period(
  'PAYMENT-MVP-OPERATOR-01','I-MVP-OPERATOR-01',own,'cycle-operator-01',
  'WEBHOOK-MVP-OPERATOR-01',terms,a,b,before_ts);
 IF result <> 'F16_MVP_PAID_PERIOD_IDEMPOTENT_REPLAY'
 THEN RAISE EXCEPTION 'Replay created a duplicate'; END IF;
 IF (SELECT count(*) FROM supporter_private.f16_mvp_paid_period_proofs
   WHERE owner_id=own) <> 1
 THEN RAISE EXCEPTION 'Replay changed proof count'; END IF;

 BEGIN
  PERFORM supporter_private.f16_mvp_record_verified_paid_period(
   'PAYMENT-MVP-OPERATOR-01','I-MVP-OPERATOR-01',own,'cycle-operator-01',
   'WEBHOOK-MVP-OPERATOR-01',terms,a,b+interval '1 day',before_ts);
  RAISE EXCEPTION 'Conflicting sale replay was accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;

 BEGIN
  PERFORM supporter_private.f16_mvp_record_verified_paid_period(
   'PAYMENT-MVP-OPERATOR-02','I-MVP-OPERATOR-01',own,'cycle-operator-02',
   'WEBHOOK-MVP-OPERATOR-02',terms,a+interval '3 days',b+interval '3 days',before_ts);
  RAISE EXCEPTION 'Overlapping different sale was accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;

 BEGIN
  PERFORM supporter_private.f16_mvp_record_verified_paid_period(
   'PAYMENT-MVP-OPERATOR-03','I-MVP-OPERATOR-01',
   '56666666-6666-4666-8666-666666666666'::uuid,'cycle-operator-03',
   'WEBHOOK-MVP-OPERATOR-03',terms,a,b,before_ts);
  RAISE EXCEPTION 'Unknown owner obtained coverage';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 BEGIN
  PERFORM supporter_private.f16_mvp_record_verified_paid_period(
   'PAYMENT-MVP-OPERATOR-03','I-MVP-OPERATOR-01',own,'cycle-operator-03',
   'WEBHOOK-MVP-OPERATOR-03',terms,a,b,before_ts+interval '3 hours');
  RAISE EXCEPTION 'Future merchant verification accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

 period:=supporter_private.f16_mvp_private_period_projection(own,pg_catalog.clock_timestamp());
 IF period->>'active' <> 'true' OR period->>'completedCycles' <> '0'
 THEN RAISE EXCEPTION 'Paid coverage not correct before reversal'; END IF;

 result:=supporter_private.f16_mvp_record_merchant_hold(
   'PAYMENT-MVP-OPERATOR-01','REVERSE-MVP-OPERATOR-01','dispute',before_ts);
 IF result <> 'F16_MVP_MERCHANT_HOLD_RECORDED_PRIVATE_ONLY'
 THEN RAISE EXCEPTION 'Reversal failed'; END IF;
 result:=supporter_private.f16_mvp_record_merchant_hold(
   'PAYMENT-MVP-OPERATOR-01','REVERSE-MVP-OPERATOR-01','dispute',before_ts);
 IF result <> 'F16_MVP_HOLD_IDEMPOTENT_REPLAY'
 THEN RAISE EXCEPTION 'Reversal replay not idempotent'; END IF;
 period:=supporter_private.f16_mvp_private_period_projection(own,pg_catalog.clock_timestamp());
 IF period->>'active' <> 'false'
 THEN RAISE EXCEPTION 'Disputed proof still granted benefits'; END IF;

 BEGIN
  PERFORM supporter_private.f16_mvp_record_merchant_hold(
   'PAYMENT-MVP-OPERATOR-01','REVERSE-MVP-OPERATOR-01','refunded',before_ts);
  RAISE EXCEPTION 'Conflicting reversal identity accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 IF (SELECT count(*) FROM supporter_private.f16_mvp_paid_period_holds
  WHERE provider_sale_id='PAYMENT-MVP-OPERATOR-01') <> 1
 THEN RAISE EXCEPTION 'Reversal replay duplicated hold'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'F16_MVP_PRIVATE_PERIOD_WRITER_IDEMPOTENT_PG17_PASS';
