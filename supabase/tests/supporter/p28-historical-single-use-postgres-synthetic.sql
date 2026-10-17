\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE first_read jsonb; second_read jsonb; invalid_read jsonb; missing_read jsonb; n integer;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'lab only'; END IF;
 IF has_function_privilege('anon','public.f16_p28_lab_consume_historical_candidate(text,uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p28_lab_consume_historical_candidate(text,uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_p28_lab_consume_historical_candidate(text,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'unsafe grants'; END IF;
 INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,processing_state,retention_hold)
 VALUES('WH-P28-SINGLE-USE','PAYMENT.SALE.COMPLETED','pending',true);
 missing_read:=public.f16_p28_lab_consume_historical_candidate('WH-P28-SINGLE-USE',
 '11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 IF missing_read IS NOT NULL THEN RAISE EXCEPTION 'unaudited read allowed'; END IF;
 INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint)
 VALUES('11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 invalid_read:=public.f16_p28_lab_consume_historical_candidate('WH-P28-SINGLE-USE',
 '11111111-1111-4111-8111-111111111111','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
 IF invalid_read IS NOT NULL THEN RAISE EXCEPTION 'incorrect fingerprint permitted'; END IF;
 first_read:=public.f16_p28_lab_consume_historical_candidate('WH-P28-SINGLE-USE',
 '11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 second_read:=public.f16_p28_lab_consume_historical_candidate('WH-P28-SINGLE-USE',
 '11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 IF first_read->>'id'<>'WH-P28-SINGLE-USE' OR second_read IS NOT NULL
 THEN RAISE EXCEPTION 'one-time consumption failed'; END IF;
 SELECT count(*) INTO n FROM supporter_private.p28_historical_read_audit
 WHERE consumed_at IS NOT NULL;
 IF n<>1 THEN RAISE EXCEPTION 'consumption not persisted'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'payments modified'; END IF;
END $test$;
ROLLBACK;
