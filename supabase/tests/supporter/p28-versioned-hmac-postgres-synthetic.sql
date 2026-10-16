\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE extension_schema text; good_fp text; old_fp text; v2_ok boolean; v1_rejected boolean; repeated boolean; revoked_rejected boolean; double_active_blocked boolean:=false;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' THEN RAISE EXCEPTION 'lab only'; END IF;
 SELECT n.nspname INTO extension_schema FROM pg_catalog.pg_extension x JOIN pg_catalog.pg_namespace n
 ON n.oid=x.extnamespace WHERE x.extname='pgcrypto';
 EXECUTE pg_catalog.format('SELECT pg_catalog.encode(%I.hmac($1,$2,$3),''hex'')',extension_schema)
 INTO good_fp USING pg_catalog.convert_to('WH-P28-ROTATION','UTF8'),
 pg_catalog.convert_to('P28_SYNTHETIC_V2_ONLY_NOT_REAL_SECRET_2026','UTF8'),'sha256';
 EXECUTE pg_catalog.format('SELECT pg_catalog.encode(%I.hmac($1,$2,$3),''hex'')',extension_schema)
 INTO old_fp USING pg_catalog.convert_to('WH-P28-ROTATION','UTF8'),
 pg_catalog.convert_to('P28_SYNTHETIC_V1_ONLY_NOT_REAL_SECRET_2026','UTF8'),'sha256';
 INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type,processing_state,retention_hold)
 VALUES('WH-P28-ROTATION','PAYMENT.SALE.COMPLETED','pending',true);
 INSERT INTO supporter_private.p28_historical_read_audit(request_id,event_fingerprint,key_version)
 VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',old_fp,'v1'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',good_fp,'v2'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',good_fp,'v2');
 v1_rejected:=public.f16_p28_lab_versioned_consume('WH-P28-ROTATION','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 v2_ok:=public.f16_p28_lab_versioned_consume('WH-P28-ROTATION','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 repeated:=public.f16_p28_lab_versioned_consume('WH-P28-ROTATION','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 BEGIN
  INSERT INTO supporter_private.p28_lab_key_versions(key_version,active,revoked,synthetic_secret)
  VALUES('v3',true,false,'P28_SYNTHETIC_V3_ONLY_NOT_REAL_SECRET_2026');
 EXCEPTION WHEN unique_violation THEN double_active_blocked:=true;
 END;
 IF NOT double_active_blocked THEN RAISE EXCEPTION 'multiple active keys permitted'; END IF;
 UPDATE supporter_private.p28_lab_key_versions SET revoked=true,active=false WHERE key_version='v2';
 revoked_rejected:=public.f16_p28_lab_versioned_consume('WH-P28-ROTATION','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
 IF v1_rejected OR NOT v2_ok OR repeated OR revoked_rejected THEN
 RAISE EXCEPTION 'version/revocation/single-use failure'; END IF;
END $test$;
ROLLBACK;
