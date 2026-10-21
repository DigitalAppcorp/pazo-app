DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021071244_pazo_f16_live_atomic_leased_settlement.sql
\i supabase/migrations/20261021072337_pazo_f16_live_financial_context.sql
BEGIN;
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
 intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,
 affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state)
SELECT 'intent-98765432-1234-4234-8234-123456789abc','98765432-1234-4234-8234-123456789abc',
 '98765432-2222-4222-8222-123456789abc',generation,plan_id,'es','pazo-supporter-live.test',
 repeat('b',64),true,'2026-10-01T00:00:00Z','2026-10-01T00:01:00Z','I-ATOMIC-SETTLEMENT-TEST','bound'
 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1 AND environment='live';
DO $acl$ BEGIN
 IF has_function_privilege('anon','public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid)','EXECUTE')
  OR has_function_privilege('authenticated','public.pazo_f16_live_service_leased_refund_record(uuid,text,text,bigint,text,text,text,text,uuid)','EXECUTE')
  OR has_function_privilege('service_role','public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz)','EXECUTE')
  OR has_function_privilege('service_role','public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'leased financial bridge ACL bypass'; END IF;
END $acl$;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $sales$
DECLARE owner_id CONSTANT uuid='98765432-1234-4234-8234-123456789abc';
 intent CONSTANT text='intent-98765432-1234-4234-8234-123456789abc'; evidence jsonb;
 lease jsonb; token uuid; result text; context jsonb;
BEGIN
 evidence:=jsonb_build_object('proofSource','paypal_live_postback_success','signedBodySha256',repeat('a',64),
  'webhookId','WH-12345678900','subscriptionId','I-ATOMIC-SETTLEMENT-TEST','subjectId','SALE-ATOMIC-TEST',
  'providerEventAt','2026-10-01T00:05:00.000Z','subjectAt','2026-10-01T00:04:00.000Z',
  'activationAt',NULL,'nextBillingAt',NULL);
 result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',
  1,'WH-ATOMIC-TEST','PAYMENT.SALE.COMPLETED',evidence);
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-ATOMIC-TEST'); token:=(lease->>'leaseToken')::uuid;
 IF token IS NULL OR result<>'queued' THEN RAISE EXCEPTION 'atomic fixture failed'; END IF;
 context:=public.pazo_f16_live_service_financial_context_read(1,'WH-ATOMIC-TEST',token);
 IF context->>'source'<>'original_bound_live_financial_context'
  OR context->>'ownerId'<>owner_id::text OR context->>'intentId'<>intent
  OR context->>'affirmativeConsent'<>'true' OR context->>'termsDigest'<>repeat('b',64)
  OR context->>'paidPeriodCount'<>'0' OR context->>'activeHold'<>'false'
  OR context->>'unreconciledFinancialRisk'<>'false'
  OR context->'activationReceipts'<>'[]'::jsonb
  OR public.pazo_f16_live_service_financial_context_read(1,'WH-ATOMIC-TEST',gen_random_uuid()) IS NOT NULL
 THEN RAISE EXCEPTION 'financial context not scoped to current signed lease'; END IF;
 result:=public.pazo_f16_live_service_leased_sale_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'WH-ATOMIC-TEST','SALE-ATOMIC-TEST','CYCLE-ATOMIC-TEST',299,'USD','2026-10-01','2026-11-01',gen_random_uuid());
 IF result<>'current_signed_lease_required' THEN RAISE EXCEPTION 'other lease wrote sale'; END IF;
 result:=public.pazo_f16_live_service_leased_sale_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'WH-ATOMIC-TEST','SALE-OTHER','CYCLE-ATOMIC-TEST',299,'USD','2026-10-01','2026-11-01',token);
 IF result<>'persisted_signed_sale_required' THEN RAISE EXCEPTION 'signed sale ID mismatch accepted'; END IF;
 result:=public.pazo_f16_live_service_leased_sale_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'WH-ATOMIC-TEST','SALE-ATOMIC-TEST','CYCLE-ATOMIC-TEST',299,'USD','2026-10-01','2026-11-01',token);
 IF result<>'recorded' THEN RAISE EXCEPTION 'atomic sale failed: %',result; END IF;
 IF public.pazo_f16_live_service_financial_context_read(1,'WH-ATOMIC-TEST',token) IS NOT NULL
 THEN RAISE EXCEPTION 'processed lease retained context access'; END IF;
 result:=public.pazo_f16_live_service_leased_sale_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'WH-ATOMIC-TEST','SALE-ATOMIC-TEST','CYCLE-ATOMIC-TEST',299,'USD','2026-10-01','2026-11-01',token);
 IF result<>'already_recorded' THEN RAISE EXCEPTION 'unknown HTTP recovery not idempotent'; END IF;
 result:=public.pazo_f16_live_service_leased_sale_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'WH-ATOMIC-TEST','SALE-ATOMIC-TEST','CYCLE-CHANGED',299,'USD','2026-10-01','2026-11-01',token);
 IF result<>'completed_lease_evidence_conflict' THEN RAISE EXCEPTION 'replay altered financial facts'; END IF;
 IF public.pazo_f16_live_service_inbox_claim(1,'WH-ATOMIC-TEST') IS NOT NULL
 THEN RAISE EXCEPTION 'processed event reclaimed'; END IF;
 -- The refund is also based on a separate persisted, signed receipt.
 result:=public.pazo_f16_live_service_signed_event_queue(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',
  1,'WH-ATOMIC-REFUND','PAYMENT.SALE.REFUNDED',evidence||jsonb_build_object('subjectId','REFUND-ATOMIC-TEST'));
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-ATOMIC-REFUND');token:=(lease->>'leaseToken')::uuid;
 result:=public.pazo_f16_live_service_leased_refund_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'SALE-ATOMIC-TEST','WH-ATOMIC-REFUND','WH-ATOMIC-REFUND','refunded',token);
 IF result<>'recorded' THEN RAISE EXCEPTION 'atomic refund failed: %',result; END IF;
 result:=public.pazo_f16_live_service_leased_refund_record(owner_id,intent,'I-ATOMIC-SETTLEMENT-TEST',1,
  'SALE-ATOMIC-TEST','WH-ATOMIC-REFUND','WH-ATOMIC-REFUND','refunded',token);
 IF result<>'already_recorded' THEN RAISE EXCEPTION 'refund replay duplicated'; END IF;
END $sales$;
RESET ROLE;
DO $inspect$ BEGIN
 IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods WHERE sale_id='SALE-ATOMIC-TEST')<>1
  OR (SELECT count(*) FROM supporter_private.pazo_paypal_live_period_holds WHERE sale_id='SALE-ATOMIC-TEST')<>1
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox
   WHERE provider_event_id IN('WH-ATOMIC-TEST','WH-ATOMIC-REFUND') AND
    (processing_state<>'processed' OR lease_token IS NOT NULL OR lease_expires_at IS NOT NULL
     OR leased_at IS NOT NULL OR completed_lease_token IS NULL))
 THEN RAISE EXCEPTION 'ledger/lease not committed together'; END IF;
END $inspect$;
-- Inject failure AFTER the private writer inserts but BEFORE acknowledgement.
-- The outer RPC must roll back BOTH changes, preserving the active lease.
CREATE FUNCTION supporter_private.atomic_test_fail_ack() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN
 IF NEW.provider_event_id='WH-ATOMIC-CRASH' AND NEW.completed_lease_token IS NOT NULL
 THEN RAISE EXCEPTION 'synthetic acknowledgement crash' USING ERRCODE='P9999'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER atomic_test_fail_ack BEFORE UPDATE ON supporter_private.pazo_paypal_live_event_inbox
 FOR EACH ROW EXECUTE FUNCTION supporter_private.atomic_test_fail_ack();
SET LOCAL ROLE service_role;
DO $crash$
DECLARE evidence jsonb; lease jsonb; token uuid; result text;
BEGIN
 evidence:=jsonb_build_object('proofSource','paypal_live_postback_success','signedBodySha256',repeat('c',64),
  'webhookId','WH-12345678900','subscriptionId','I-ATOMIC-SETTLEMENT-TEST','subjectId','SALE-ATOMIC-CRASH',
  'providerEventAt','2026-11-01T00:05:00.000Z','subjectAt','2026-11-01T00:04:00.000Z',
  'activationAt',NULL,'nextBillingAt',NULL);
 result:=public.pazo_f16_live_service_signed_event_queue('98765432-1234-4234-8234-123456789abc',
  'intent-98765432-1234-4234-8234-123456789abc','I-ATOMIC-SETTLEMENT-TEST',1,'WH-ATOMIC-CRASH','PAYMENT.SALE.COMPLETED',evidence);
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-ATOMIC-CRASH');token:=(lease->>'leaseToken')::uuid;
 BEGIN
  PERFORM public.pazo_f16_live_service_leased_sale_record('98765432-1234-4234-8234-123456789abc',
   'intent-98765432-1234-4234-8234-123456789abc','I-ATOMIC-SETTLEMENT-TEST',1,'WH-ATOMIC-CRASH',
   'SALE-ATOMIC-CRASH','CYCLE-ATOMIC-CRASH',299,'USD','2026-11-01','2026-12-01',token);
  RAISE EXCEPTION 'injected crash was ignored';
 EXCEPTION WHEN SQLSTATE 'P9999' THEN NULL; END;
 IF public.pazo_f16_live_service_signed_receipt_read(1,'WH-ATOMIC-CRASH',token) IS NULL
 THEN RAISE EXCEPTION 'failed transaction lost recoverable lease'; END IF;
END $crash$;
RESET ROLE;
DO $expiry$
DECLARE old_token uuid; result text; lease jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods WHERE sale_id='SALE-ATOMIC-CRASH')
 THEN RAISE EXCEPTION 'partial financial write survived failed acknowledgement'; END IF;
 DROP TRIGGER atomic_test_fail_ack ON supporter_private.pazo_paypal_live_event_inbox;
 SELECT lease_token INTO old_token FROM supporter_private.pazo_paypal_live_event_inbox WHERE provider_event_id='WH-ATOMIC-CRASH';
 UPDATE supporter_private.pazo_paypal_live_event_inbox SET leased_at=clock_timestamp()-interval '3 minutes',
  lease_expires_at=clock_timestamp()-interval '1 minute' WHERE provider_event_id='WH-ATOMIC-CRASH';
 result:=public.pazo_f16_live_service_leased_sale_record('98765432-1234-4234-8234-123456789abc',
  'intent-98765432-1234-4234-8234-123456789abc','I-ATOMIC-SETTLEMENT-TEST',1,'WH-ATOMIC-CRASH',
  'SALE-ATOMIC-CRASH','CYCLE-ATOMIC-CRASH',299,'USD','2026-11-01','2026-12-01',old_token);
 IF result<>'current_signed_lease_required' THEN RAISE EXCEPTION 'expired lease wrote payment'; END IF;
 lease:=public.pazo_f16_live_service_inbox_claim(1,'WH-ATOMIC-CRASH');
 result:=public.pazo_f16_live_service_leased_sale_record('98765432-1234-4234-8234-123456789abc',
  'intent-98765432-1234-4234-8234-123456789abc','I-ATOMIC-SETTLEMENT-TEST',1,'WH-ATOMIC-CRASH',
  'SALE-ATOMIC-CRASH','CYCLE-ATOMIC-CRASH',299,'USD','2026-11-01','2026-12-01',(lease->>'leaseToken')::uuid);
 IF result<>'recorded' THEN RAISE EXCEPTION 'expired crash recovery failed: %',result; END IF;
 RAISE NOTICE 'F16_LIVE_ATOMIC_LEASED_SALE_REFUND_CRASH_PG17_PASS';
END $expiry$;
ROLLBACK;
-- Remove only disposable fixture finance, then exercise the empty rollback.
DELETE FROM supporter_private.pazo_paypal_live_period_holds;
DELETE FROM supporter_private.pazo_paypal_live_paid_periods;
\i supabase/rollbacks/f16_live_financial_context_REVIEW_REQUIRED.sql
\i supabase/rollbacks/f16_live_atomic_leased_settlement_REVIEW_REQUIRED.sql
\i supabase/migrations/20261021071244_pazo_f16_live_atomic_leased_settlement.sql
\i supabase/migrations/20261021072337_pazo_f16_live_financial_context.sql
DO $pass$ BEGIN RAISE NOTICE 'F16_LIVE_ATOMIC_EMPTY_ROLLBACK_REAPPLY_PASS'; END $pass$;
