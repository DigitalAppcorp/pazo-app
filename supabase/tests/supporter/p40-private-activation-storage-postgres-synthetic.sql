-- F16-P40 storage design test. Runs only in f14_synthetic and ROLLBACKs rows.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P40 disposable PostgreSQL only'; END IF;
END $guard$;

INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
VALUES('intent-12345678-1234-4234-8234-123456789012',
 '11111111-1111-4111-8111-111111111111','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P40-OWNER',pg_catalog.clock_timestamp()),
 ('intent-23456789-1234-4234-8234-123456789012',
 '22222222-2222-4222-8222-222222222222','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P40-OTHER',pg_catalog.clock_timestamp());
INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at)
VALUES('P40-ACTIVATION-ONE','BILLING.SUBSCRIPTION.ACTIVATED',pg_catalog.clock_timestamp()),
 ('P40-SALE-NOT-ACTIVATION','PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp());

DO $tests$
DECLARE rejected boolean;
BEGIN
 IF pg_catalog.has_table_privilege('anon'::name,
  'supporter_private.paypal_verified_activation_bindings'::regclass,'SELECT')
 OR pg_catalog.has_table_privilege('authenticated'::name,
  'supporter_private.paypal_verified_activation_bindings'::regclass,'SELECT')
 OR pg_catalog.has_table_privilege('service_role'::name,
  'supporter_private.paypal_verified_activation_bindings'::regclass,'INSERT')
 OR pg_catalog.has_table_privilege('service_role'::name,
  'supporter_private.paypal_verified_activation_bindings'::regclass,'UPDATE')
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c
   WHERE c.oid='supporter_private.paypal_verified_activation_bindings'::regclass
   AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'P40 RLS or table permissions too permissive'; END IF;

 rejected:=false;
 BEGIN
 INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
 VALUES('P40-ACTIVATION-ONE','I-P40-OTHER','11111111-1111-4111-8111-111111111111');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'P40 cross owner binding accepted'; END IF;

 rejected:=false;
 BEGIN
 INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
 VALUES('P40-SALE-NOT-ACTIVATION','I-P40-OWNER','11111111-1111-4111-8111-111111111111');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'P40 non-activation accepted'; END IF;

 INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
 VALUES('P40-ACTIVATION-ONE','I-P40-OWNER','11111111-1111-4111-8111-111111111111');

 rejected:=false;
 BEGIN
 INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
 VALUES('P40-ACTIVATION-ONE','I-P40-OTHER','22222222-2222-4222-8222-222222222222');
 EXCEPTION WHEN unique_violation THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'P40 duplicate event reassigned'; END IF;

 rejected:=false;
 BEGIN
 UPDATE supporter_private.paypal_verified_activation_bindings
 SET subscription_id='I-P40-OTHER' WHERE provider_event_id='P40-ACTIVATION-ONE';
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'P40 reassignment update permitted'; END IF;

 rejected:=false;
 BEGIN
 DELETE FROM supporter_private.paypal_verified_activation_bindings
 WHERE provider_event_id='P40-ACTIVATION-ONE';
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'P40 deletion before retention approval permitted'; END IF;

 IF (SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_activation_bindings)<>1
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'P40 mutated payments or worker gate'; END IF;
END $tests$;
ROLLBACK;
