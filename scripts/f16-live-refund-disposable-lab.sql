-- F16 Live refund proof/anti-replay — disposable-only synthetic PG17.
\i supabase/migrations/20261019235400_pazo_f16_live_verified_refund_private_staging.sql
DO $refund$
DECLARE r text;
BEGIN
 r:=supporter_private.pazo_live_queue_verified_event(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'WH-REFUND-BOUND-ONE','PAYMENT.SALE.REFUNDED');
 IF r<>'queued' THEN RAISE EXCEPTION 'Refund event queue did not store original owner'; END IF;
 r:=supporter_private.pazo_live_record_verified_refund(
 '33333333-3333-4333-8333-333333333333',
 'intent-33333333-3333-4333-8333-333333333333','I-SYNTHETIC-TWO',
 1,'SALE-OWNER-ONE','WH-REFUND-BOUND-ONE','REFUND-OWNER-TWO','refunded');
 IF r<>'original_sale_not_verified'
 THEN RAISE EXCEPTION 'Other owner refunded a sale: %',r; END IF;
 r:=supporter_private.pazo_live_record_verified_refund(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'SALE-OWNER-ONE','WH-EVENT-BOUND-ONE','REFUND-INVALID-TYPE','refunded');
 IF r<>'signed_refund_event_required'
 THEN RAISE EXCEPTION 'A SALE.COMPLETED webhook was accepted as refund: %',r; END IF;
 r:=supporter_private.pazo_live_record_verified_refund(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'SALE-OWNER-ONE','WH-REFUND-BOUND-ONE','REFUND-OWNER-ONE','reversed');
 IF r<>'refund_event_kind_conflict'
 THEN RAISE EXCEPTION 'Refund event kind forged: %',r; END IF;
 r:=supporter_private.pazo_live_record_verified_refund(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'SALE-OWNER-ONE','WH-REFUND-BOUND-ONE','REFUND-OWNER-ONE','refunded');
 IF r<>'recorded' THEN RAISE EXCEPTION 'Verified refund not recorded: %',r; END IF;
 r:=supporter_private.pazo_live_record_verified_refund(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'SALE-OWNER-ONE','WH-REFUND-BOUND-ONE','REFUND-OWNER-ONE','refunded');
 IF r<>'already_recorded' THEN RAISE EXCEPTION 'Repeated refund not idempotent: %',r; END IF;
 r:=supporter_private.pazo_live_record_verified_refund(
 '12345678-1234-4234-8234-123456789abc',
 'intent-12345678-1234-4234-8234-123456789abc','I-LIVE-SYNTHETIC1234',
 1,'SALE-OWNER-ONE','WH-REFUND-BOUND-ONE','REFUND-SECOND','refunded');
 IF r<>'duplicate_refund_event_or_hold'
 THEN RAISE EXCEPTION 'One event generated two refund holds: %',r; END IF;
 IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_period_holds
   WHERE sale_id='SALE-OWNER-ONE')<>1
 THEN RAISE EXCEPTION 'Verified refund hold count incorrect'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox
   WHERE provider_event_id='WH-REFUND-BOUND-ONE' AND processing_state='processed')
 THEN RAISE EXCEPTION 'Verified refund event not marked processed'; END IF;
 IF has_function_privilege('service_role',
 'supporter_private.pazo_live_record_verified_refund(uuid,text,text,bigint,text,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
 'supporter_private.pazo_live_record_verified_refund(uuid,text,text,bigint,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Live refund RPC leaked to app or service'; END IF;
 RAISE NOTICE 'F16_LIVE_REFUND_HOLD_OWNER_PG17_PASS_NO_HOSTED';
END $refund$;
