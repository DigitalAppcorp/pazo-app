-- F16-P39 registration + P38 read, rollback all synthetic rows.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'P39 LAB ONLY'; END IF;
END $guard$;
INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
VALUES('intent-99999999-9999-4999-8999-999999999999',
 '11111111-1111-4111-8111-111111111111','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P39-SUB-ONE',clock_timestamp()),
 ('intent-88888888-8888-4888-8888-888888888888',
 '22222222-2222-4222-8222-222222222222','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P39-SUB-TWO',clock_timestamp());
INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at,retention_hold)
VALUES('P39-ACT-ONE','BILLING.SUBSCRIPTION.ACTIVATED',clock_timestamp(),true),
 ('P39-SALE-INVALID','PAYMENT.SALE.COMPLETED',clock_timestamp(),true);
SET LOCAL ROLE service_role;
DO $test$
DECLARE accepted boolean;
BEGIN
 IF public.f16_p39_lab_register_signed_activation('P39-ACT-ONE','I-P39-SUB-ONE','caller_claim')
 OR public.f16_p39_lab_register_signed_activation('P39-SALE-INVALID','I-P39-SUB-ONE','postback_verified_sandbox_activation')
 OR public.f16_p39_lab_register_signed_activation('P39-ACT-ONE','I-UNKNOWN','postback_verified_sandbox_activation')
 THEN RAISE EXCEPTION 'P39 accepted wrong event/origin/subscription'; END IF;
 accepted:=public.f16_p39_lab_register_signed_activation(
 'P39-ACT-ONE','I-P39-SUB-ONE','postback_verified_sandbox_activation');
 IF NOT accepted THEN RAISE EXCEPTION 'P39 refused valid test registration'; END IF;
 IF NOT public.f16_p39_lab_register_signed_activation(
 'P39-ACT-ONE','I-P39-SUB-ONE','postback_verified_sandbox_activation')
 THEN RAISE EXCEPTION 'P39 exact replay not idempotent'; END IF;
 IF public.f16_p39_lab_register_signed_activation(
 'P39-ACT-ONE','I-P39-SUB-TWO','postback_verified_sandbox_activation')
 THEN RAISE EXCEPTION 'P39 event transferred to another account'; END IF;
 IF pg_catalog.has_table_privilege('service_role',
 'supporter_private.p38_lab_verified_activation_binding','INSERT')
 OR pg_catalog.has_table_privilege('service_role',
 'supporter_private.p38_lab_verified_activation_binding','SELECT')
 THEN RAISE EXCEPTION 'P39 service_role private table grant exposed'; END IF;
END $test$;
SET LOCAL ROLE postgres;
DO $assert$
BEGIN
 IF (SELECT count(*) FROM supporter_private.p38_lab_verified_activation_binding)<>1
 OR EXISTS(SELECT 1 FROM supporter_private.p38_lab_verified_activation_binding
 WHERE subscription_id<>'I-P39-SUB-ONE'
 OR owner_id<>'11111111-1111-4111-8111-111111111111')
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
 THEN RAISE EXCEPTION 'P39 changed ownership or booked payment'; END IF;
END $assert$;
ROLLBACK;
