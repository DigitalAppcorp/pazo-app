-- P28 audited historical read: only in disposable PostgreSQL; no hosted data.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE matched jsonb; missing jsonb; wrong jsonb; n integer;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' THEN
  RAISE EXCEPTION 'disposable PG only';
 END IF;
 IF has_function_privilege('anon','public.f16_p28_read_historical_candidate_exact(text,uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.f16_p28_read_historical_candidate_exact(text,uuid,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.f16_p28_read_historical_candidate_exact(text,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'unsafe historical RPC grants'; END IF;
 INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,processing_state,retention_hold)
 VALUES ('WH-P28-LAB-READ','PAYMENT.SALE.COMPLETED','pending',true);
 missing:=public.f16_p28_read_historical_candidate_exact('WH-P28-LAB-READ',
  '11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 IF missing IS NOT NULL THEN RAISE EXCEPTION 'unaudited candidate read permitted'; END IF;
 INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint)
 VALUES('11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 matched:=public.f16_p28_read_historical_candidate_exact('WH-P28-LAB-READ',
  '11111111-1111-4111-8111-111111111111','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
 wrong:=public.f16_p28_read_historical_candidate_exact('WH-P28-LAB-READ',
  '11111111-1111-4111-8111-111111111111','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
 IF matched->>'id'<>'WH-P28-LAB-READ' OR wrong IS NOT NULL
 THEN RAISE EXCEPTION 'historical audit match rejected or mismatched accepted'; END IF;
 SELECT count(*) INTO n FROM supporter_private.paypal_payment_entries;
 IF n<>0 THEN RAISE EXCEPTION 'historical lookup changed payments'; END IF;
END $test$;
ROLLBACK;
