\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE a text; ok boolean; wrong boolean; replay boolean; n int;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'disposable only'; END IF;
 IF has_function_privilege('anon','public.f16_p28_lab_hmac_consume(text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p28_lab_hmac_consume(text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'unsafe grants'; END IF;
 INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,processing_state,retention_hold)
 VALUES ('WH-P28-A-HMAC','PAYMENT.SALE.COMPLETED','pending',true),
 ('WH-P28-B-HMAC','PAYMENT.SALE.COMPLETED','pending',true);
 a:=pg_catalog.encode(public.hmac(pg_catalog.convert_to('WH-P28-A-HMAC','UTF8'),
 pg_catalog.convert_to('PAZO_P28_DISPOSABLE_KEY_2026_NOT_A_REAL_SECRET','UTF8'),'sha256'),'hex');
 INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint)
 VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',a);
 wrong:=public.f16_p28_lab_hmac_consume('WH-P28-B-HMAC','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 ok:=public.f16_p28_lab_hmac_consume('WH-P28-A-HMAC','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 replay:=public.f16_p28_lab_hmac_consume('WH-P28-A-HMAC','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 IF wrong OR NOT ok OR replay THEN RAISE EXCEPTION 'HMAC binding or one-use failure'; END IF;
 SELECT count(*) INTO n FROM supporter_private.p28_historical_read_audit
 WHERE request_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND consumed_at IS NOT NULL;
 IF n<>1 THEN RAISE EXCEPTION 'audit not consumed once'; END IF;
END $test$;
ROLLBACK;
