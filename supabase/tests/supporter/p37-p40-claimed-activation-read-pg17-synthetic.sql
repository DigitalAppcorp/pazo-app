-- F16 P37 — staged P40 claim read against real P40 table in isolated PG17.
-- This test creates synthetic objects/rows inside a ROLLBACK transaction only.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P37 P40 PG17 LAB ONLY'; END IF;
 IF pg_catalog.has_function_privilege('anon',
 'public.f16_p37_lab_read_claimed_activation(text,uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_p37_lab_read_claimed_activation(text,uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
 'public.f16_p37_lab_read_claimed_activation(text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'P37 RPC ACL not service-only'; END IF;
 IF pg_catalog.has_table_privilege('service_role',
 'supporter_private.paypal_verified_activation_bindings','SELECT')
 THEN RAISE EXCEPTION 'P37 exposed private P40 table'; END IF;
END $guard$;

INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
VALUES
 ('intent-a1370000-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P37-OWNER',pg_catalog.clock_timestamp()),
 ('intent-b1370000-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '22222222-2222-4222-8222-222222222222','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P37-OTHER',pg_catalog.clock_timestamp());

INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at,processing_state,p05_claim_token,
  next_attempt_at,retention_hold)
VALUES
 ('P37-P40-ACT','BILLING.SUBSCRIPTION.ACTIVATED',pg_catalog.clock_timestamp(),
  'processing','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  pg_catalog.clock_timestamp()+interval '5 minutes',true),
 ('P37-P40-UNBOUND','BILLING.SUBSCRIPTION.ACTIVATED',pg_catalog.clock_timestamp(),
  'processing','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  pg_catalog.clock_timestamp()+interval '5 minutes',true),
 ('P37-P40-SALE','PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp(),
  'processing','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  pg_catalog.clock_timestamp()+interval '5 minutes',true);

INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
VALUES('P37-P40-ACT','I-P37-OWNER','11111111-1111-4111-8111-111111111111');

DO $checks$
DECLARE p jsonb;
BEGIN
 IF public.f16_p37_lab_read_claimed_activation('P37-P40-ACT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') IS NOT NULL
 THEN RAISE EXCEPTION 'P37 worker OFF accepted claim'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate
 SET enabled=true,not_before=pg_catalog.clock_timestamp()-interval '1 minute'
 WHERE id=1;
 p:=public.f16_p37_lab_read_claimed_activation('P37-P40-ACT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 IF p IS NULL OR p->>'subscriptionId'<>'I-P37-OWNER'
 OR p->>'source'<>'p40_inbox_binding_claim'
 OR p->>'type'<>'BILLING.SUBSCRIPTION.ACTIVATED'
 OR p->>'leaseCurrent'<>'true'
 OR p?'signatureVerified' OR p?'ownerId'
 THEN RAISE EXCEPTION 'P37 valid P40 claim invalid or forged signature flag'; END IF;
 IF public.f16_p37_lab_read_claimed_activation('P37-P40-ACT',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd') IS NOT NULL
 OR public.f16_p37_lab_read_claimed_activation('P37-P40-UNBOUND',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') IS NOT NULL
 OR public.f16_p37_lab_read_claimed_activation('P37-P40-SALE',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc') IS NOT NULL
 THEN RAISE EXCEPTION 'P37 mismatched lease, unbound or sale event passed'; END IF;
 UPDATE supporter_private.paypal_verified_event_inbox
 SET next_attempt_at=pg_catalog.clock_timestamp()-interval '10 seconds'
 WHERE provider_event_id='P37-P40-ACT';
 IF public.f16_p37_lab_read_claimed_activation('P37-P40-ACT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') IS NOT NULL
 THEN RAISE EXCEPTION 'P37 expired lease passed'; END IF;
 UPDATE supporter_private.paypal_verified_event_inbox
 SET next_attempt_at=pg_catalog.clock_timestamp()+interval '5 minutes',
  retention_hold=false WHERE provider_event_id='P37-P40-ACT';
 IF public.f16_p37_lab_read_claimed_activation('P37-P40-ACT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') IS NOT NULL
 THEN RAISE EXCEPTION 'P37 released retention hold passed'; END IF;
 UPDATE supporter_private.paypal_verified_event_inbox
 SET retention_hold=true WHERE provider_event_id='P37-P40-ACT';
 UPDATE supporter_private.p05_inbox_worker_gate
 SET not_before=pg_catalog.clock_timestamp()+interval '5 minutes'
 WHERE id=1;
 IF public.f16_p37_lab_read_claimed_activation('P37-P40-ACT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') IS NOT NULL
 THEN RAISE EXCEPTION 'P37 prospective cutoff passed improperly'; END IF;
 -- The disposable F16-P21 fixture creates payment_entries but not
 -- the hosted reversal table. Validate only installed finance objects.
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries)
 THEN RAISE EXCEPTION 'P37 unexpectedly wrote payment entries'; END IF;
 IF pg_catalog.to_regclass('supporter_private.paypal_payment_reversals') IS NOT NULL
 THEN
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_class
      WHERE oid='supporter_private.paypal_payment_reversals'::pg_catalog.regclass)<>1
  THEN RAISE EXCEPTION 'P37 reversal catalog inconsistent'; END IF;
 END IF;
END $checks$;
ROLLBACK;
