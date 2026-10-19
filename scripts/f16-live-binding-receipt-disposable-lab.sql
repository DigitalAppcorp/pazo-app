-- F16 signed-event -> original PAZO owner -> verified Live sale rehearsal.
-- All owner/PayPal GET evidence here is synthetic; NO provider calls or grants.
\i supabase/migrations/20261019235000_pazo_f16_live_verified_binding_and_receipts_private_staging.sql
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
 intent_id,owner_id,request_key,merchant_generation,plan_id,locale,
 terms_version,terms_digest,affirmative_consent)
 VALUES('intent-33333333-3333-4333-8333-333333333333',
 '33333333-3333-4333-8333-333333333333',
 '88888888-8888-4888-8888-888888888888',
 1,'P-ABCDEFGHIJKLMN','es','pazo-supporter-live.offer-v1',repeat('b',64),true);
DO $bind$
DECLARE v text;
BEGIN
 v:=supporter_private.pazo_live_bind_verified_subscription(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333',
 '88888888-8888-4888-8888-888888888888',1,
 'P-ABCDEFGHIJKLMN','I-SYNTHETIC-TWO');
 IF v<>'provider_create_not_claimed'
 THEN RAISE EXCEPTION 'Unclaimed subscription bound: %',v; END IF;
END $bind$;
UPDATE supporter_private.pazo_paypal_live_checkout_intents
 SET provider_create_claimed_at=pg_catalog.clock_timestamp()
 WHERE intent_id='intent-33333333-3333-4333-8333-333333333333';
DO $bind2$
DECLARE v text;
BEGIN
 v:=supporter_private.pazo_live_bind_verified_subscription(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333',
 '88888888-8888-4888-8888-888888888888',1,
 'P-ABCDEFGHIJKLMN','I-LIVE-SYNTHETIC1234');
 IF v<>'subscription_already_bound_elsewhere'
 THEN RAISE EXCEPTION 'Cross-owner subscription hijack: %',v; END IF;
 v:=supporter_private.pazo_live_bind_verified_subscription(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333',
 '88888888-8888-4888-8888-888888888888',1,
 'P-ABCDEFGHIJKLMN','I-SYNTHETIC-TWO');
 IF v<>'bound' THEN RAISE EXCEPTION 'Valid independent binding failed: %',v; END IF;
 v:=supporter_private.pazo_live_bind_verified_subscription(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333',
 '88888888-8888-4888-8888-888888888888',1,
 'P-ABCDEFGHIJKLMN','I-SYNTHETIC-TWO');
 IF v<>'already_bound' THEN RAISE EXCEPTION 'Binding replay changed state: %',v; END IF;
 v:=supporter_private.pazo_live_bind_verified_subscription(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333',
 '88888888-8888-4888-8888-888888888888',1,
 'P-ABCDEFGHIJKLMN','I-SYNTHETIC-THREE');
 IF v<>'binding_conflict' THEN RAISE EXCEPTION 'Binding overwrite accepted: %',v; END IF;
END $bind2$;
DO $queue$
DECLARE v text;
BEGIN
 v:=supporter_private.pazo_live_queue_verified_event(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','PAYMENT.SALE.COMPLETED');
 IF v<>'queued' THEN RAISE EXCEPTION 'Owner signed event queue failed: %',v; END IF;
 v:=supporter_private.pazo_live_queue_verified_event(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','PAYMENT.SALE.COMPLETED');
 IF v<>'duplicate_verified_event'
 THEN RAISE EXCEPTION 'Event replay not idempotent: %',v; END IF;
 v:=supporter_private.pazo_live_queue_verified_event(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333','I-SYNTHETIC-TWO',
 1,'WH-EVENT-BOUND-ONE','PAYMENT.SALE.COMPLETED');
 IF v<>'event_owner_conflict'
 THEN RAISE EXCEPTION 'Signed event transferred across owners: %',v; END IF;
 v:=supporter_private.pazo_live_queue_verified_event(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','PAYMENT.SALE.REFUNDED');
 IF v<>'event_id_conflict' THEN RAISE EXCEPTION 'Signed event type rewritten: %',v; END IF;
 v:=supporter_private.pazo_live_queue_verified_event(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-OTHER-ONE','PAYMENT.SALE.COMPLETED');
 IF v<>'owner_binding_not_verified'
 THEN RAISE EXCEPTION 'Wrong owner subscription accepted: %',v; END IF;
END $queue$;
DO $sale$
DECLARE v text;
BEGIN
 v:=supporter_private.pazo_live_record_verified_sale(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333','I-SYNTHETIC-TWO',
 1,'WH-EVENT-BOUND-ONE','SALE-OWNER-TWO','CYCLE-OWNER-TWO',299,'USD',
 '2027-01-01T00:00:00Z','2027-02-01T00:00:00Z');
 IF v<>'signed_completed_sale_event_required'
 THEN RAISE EXCEPTION 'Cross-owner signed event credited a sale: %',v; END IF;
 v:=supporter_private.pazo_live_record_verified_sale(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','SALE-OWNER-ONE','CYCLE-OWNER-ONE',299,'USD',
 '2027-01-01T00:00:00Z','2027-02-01T00:00:00Z');
 IF v<>'recorded' THEN RAISE EXCEPTION 'Valid Live synthetic receipt blocked: %',v; END IF;
 v:=supporter_private.pazo_live_record_verified_sale(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','SALE-OWNER-ONE','CYCLE-OWNER-ONE',299,'USD',
 '2027-01-01T00:00:00Z','2027-02-01T00:00:00Z');
 IF v<>'already_recorded' THEN RAISE EXCEPTION 'Receipt replay not safe: %',v; END IF;
 v:=supporter_private.pazo_live_record_verified_sale(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','SALE-OWNER-ONE','CYCLE-OWNER-ONE',499,'USD',
 '2027-01-01T00:00:00Z','2027-02-01T00:00:00Z');
 IF v<>'invalid_sale_contract' THEN RAISE EXCEPTION 'Unexpected sale amount accepted'; END IF;
 v:=supporter_private.pazo_live_record_verified_sale(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-EVENT-BOUND-ONE','SALE-OWNER-DUP','CYCLE-OWNER-DUP',299,'USD',
 '2027-02-01T00:00:00Z','2027-03-01T00:00:00Z');
 IF v<>'duplicate_sale_or_cycle_conflict'
 THEN RAISE EXCEPTION 'One signed event backed two receipts: %',v; END IF;
 IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods
  WHERE provider_event_id='WH-EVENT-BOUND-ONE')<>1
 THEN RAISE EXCEPTION 'Receipt idempotency failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox
  WHERE provider_event_id='WH-EVENT-BOUND-ONE'
   AND linked_intent_id='intent-12345678-1234-4234-8234-123456789abc'
   AND processing_state='processed')
 THEN RAISE EXCEPTION 'Event not atomically processed'; END IF;
 RAISE NOTICE 'F16_LIVE_VERIFIED_BINDING_AND_RECEIPT_PG17_PASS_NO_HOSTED';
END $sale$;
