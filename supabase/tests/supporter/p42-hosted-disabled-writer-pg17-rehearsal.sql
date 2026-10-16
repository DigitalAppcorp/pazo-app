-- P42 hosted-candidate, verbatim PG17 rehearsal; synthetic data ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN
 RAISE EXCEPTION 'P42 only disposable PG17'; END IF;
 IF (SELECT count(*) FROM supporter_private.p42_activation_signing_keys)<>0
 OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT not_before FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS NOT NULL
 OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings)<>0
 OR has_function_privilege('service_role',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR has_function_privilege('anon',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR has_table_privilege('service_role','supporter_private.p42_activation_signing_keys','SELECT')
 OR has_table_privilege('service_role','supporter_private.p42_activation_signing_keys','INSERT')
 OR has_table_privilege('service_role','supporter_private.p42_activation_writer_gate','UPDATE')
 THEN RAISE EXCEPTION 'P42 default-off key/permission contract broken'; END IF;
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c
 WHERE c.oid IN (
 'supporter_private.p42_activation_signing_keys'::regclass,
 'supporter_private.p42_activation_writer_gate'::regclass)
 AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity))
 THEN RAISE EXCEPTION 'P42 RLS not forced'; END IF;
 IF public.f16_p42_register_authenticated_activation(
 'P42-NEW-EVENT','I-P42-NEW','2026-10-16T11:30:00Z',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','P42_V1',repeat('0',64))
 THEN RAISE EXCEPTION 'P42 unprovisioned writer accepted'; END IF;
END $test$;

-- Synthetic key exists ONLY within this rolled-back transaction.
INSERT INTO supporter_private.p42_activation_signing_keys
(key_id,key_bytes,enabled,not_before)
VALUES('P42_V1',convert_to('P42_PG17_FAKE_KEY_1234567890_NOT_REAL','UTF8'),true,
clock_timestamp()-interval '10 minutes');
INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
VALUES('intent-77777777-7777-4777-8777-777777777777',
 '11111111-1111-4111-8111-111111111111','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P42-NEW',clock_timestamp()),
('intent-66666666-6666-4666-8666-666666666666',
 '22222222-2222-4222-8222-222222222222','paypal',
 'P-14V25407JP6850922NLHMDKI','bound','I-P42-FOREIGN',clock_timestamp());
INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type,verified_at,retention_hold)
VALUES('P42-NEW-EVENT','BILLING.SUBSCRIPTION.ACTIVATED',clock_timestamp(),true),
('P42-OLD-EVENT','BILLING.SUBSCRIPTION.ACTIVATED',clock_timestamp()-interval '1 day',true),
('P42-WRONG-TYPE','PAYMENT.SALE.COMPLETED',clock_timestamp(),true);
CREATE FUNCTION public.f16_p42_test_hosted_mac(p_message text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $lab_mac$
DECLARE v_schema text; v_key bytea; v_mac text;
BEGIN
 SELECT k.key_bytes INTO v_key FROM supporter_private.p42_activation_signing_keys k
 WHERE k.key_id='P42_V1';
 SELECT n.nspname INTO v_schema FROM pg_catalog.pg_extension e
 JOIN pg_catalog.pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto';
 EXECUTE pg_catalog.format('SELECT pg_catalog.encode(%I.hmac($1,$2,$3),''hex'')',v_schema)
 INTO v_mac USING pg_catalog.convert_to(p_message,'UTF8'),v_key,'sha256';
 RETURN v_mac;
END $lab_mac$;
REVOKE ALL ON FUNCTION public.f16_p42_test_hosted_mac(text)
FROM PUBLIC,anon,authenticated,service_role;
CREATE TEMP TABLE p42_candidate_fixture ON COMMIT DROP AS
SELECT 'P42-NEW-EVENT'::text AS event_id,'I-P42-NEW'::text AS sub_id,
 'P42_V1'::text AS key_id,
 to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')::text AS issued_at,
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid AS nonce,
 ''::text AS mac, ''::text AS old_mac, ''::text AS wrong_type_mac,
 ''::text AS foreign_mac;
UPDATE p42_candidate_fixture f SET
mac=public.f16_p42_test_hosted_mac('p42|sandbox|P42_V1|'||f.event_id||'|'||f.sub_id
 ||'|'||f.issued_at||'|'||f.nonce::text),
old_mac=public.f16_p42_test_hosted_mac('p42|sandbox|P42_V1|P42-OLD-EVENT|'||f.sub_id
 ||'|'||f.issued_at||'|'||f.nonce::text),
wrong_type_mac=public.f16_p42_test_hosted_mac('p42|sandbox|P42_V1|P42-WRONG-TYPE|'||f.sub_id
 ||'|'||f.issued_at||'|'||f.nonce::text),
foreign_mac=public.f16_p42_test_hosted_mac('p42|sandbox|P42_V1|'||f.event_id||'|I-P42-FOREIGN|'
 ||f.issued_at||'|'||f.nonce::text);

-- Even with an artificially provisioned key, disabled gate denies.
DO $test_disabled$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM p42_candidate_fixture;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac)
 THEN RAISE EXCEPTION 'P42 accepted while gate OFF'; END IF;
END $test_disabled$;
UPDATE supporter_private.p42_activation_writer_gate
 SET enabled=true,not_before=clock_timestamp()-interval '5 minutes' WHERE id=1;

-- TEST ONLY: temporarily grant service_role EXECUTE then rollback everything.
GRANT EXECUTE ON FUNCTION public.f16_p42_register_authenticated_activation(
 text,text,text,uuid,text,text) TO service_role;
GRANT SELECT ON p42_candidate_fixture TO service_role;
SET LOCAL ROLE service_role;
DO $as_service$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM p42_candidate_fixture;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,repeat('0',64))
 OR public.f16_p42_register_authenticated_activation(
 f.event_id,'I-P42-FOREIGN',f.issued_at,f.nonce,f.key_id,f.mac)
 OR public.f16_p42_register_authenticated_activation(
 'P42-OLD-EVENT',f.sub_id,f.issued_at,f.nonce,f.key_id,f.old_mac)
 OR public.f16_p42_register_authenticated_activation(
 'P42-WRONG-TYPE',f.sub_id,f.issued_at,f.nonce,f.key_id,f.wrong_type_mac)
 THEN RAISE EXCEPTION 'P42 forged, foreign, historical or wrong type accepted'; END IF;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'P42 synthetic fresh registration denied'; END IF;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'P42 exact replay not idempotent'; END IF;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,'I-P42-FOREIGN',f.issued_at,f.nonce,f.key_id,f.foreign_mac)
 THEN RAISE EXCEPTION 'P42 event reassigned even with valid foreign MAC'; END IF;
END $as_service$;
-- A freshly RECEIVED signature may have been ISSUED within the prior
-- 120 seconds but after a key's 24h not_after the writer must reject it.
-- Original P42 function incorrectly accepted this idempotent replay.
SET LOCAL ROLE postgres;
CREATE TEMP TABLE p42_absolute_expiry ON COMMIT DROP AS
 SELECT f.event_id,f.sub_id,f.key_id,f.nonce,
 to_char((clock_timestamp()-interval '30 seconds') AT TIME ZONE 'UTC',
 'YYYY-MM-DD"T"HH24:MI:SS"Z"')::text AS issued_at,
 ''::text AS mac
 FROM p42_candidate_fixture f;
UPDATE p42_absolute_expiry f SET
 mac=public.f16_p42_test_hosted_mac('p42|sandbox|'||f.key_id||'|'||
 f.event_id||'|'||f.sub_id||'|'||f.issued_at||'|'||f.nonce::text);
UPDATE supporter_private.p42_activation_signing_keys
 SET not_after=clock_timestamp()-interval '5 seconds'
 WHERE key_id='P42_V1';
GRANT SELECT ON p42_absolute_expiry TO service_role;
SET LOCAL ROLE service_role;
DO $absolute_expiry$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM p42_absolute_expiry;
 IF f.issued_at::timestamptz >= (SELECT not_after
   FROM supporter_private.p42_activation_signing_keys WHERE key_id='P42_V1')
 THEN RAISE EXCEPTION 'P42 expiry fixture must be issued BEFORE expiry'; END IF;
 IF public.f16_p42_register_authenticated_activation(
  f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac)
 THEN RAISE EXCEPTION 'P42 accepted MAC after ABSOLUTE key expiry'; END IF;
END $absolute_expiry$;
SET LOCAL ROLE postgres;
UPDATE supporter_private.p42_activation_signing_keys
 SET not_after=clock_timestamp()-interval '1 minute' WHERE key_id='P42_V1';
SET LOCAL ROLE service_role;
DO $expired_key$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM p42_candidate_fixture;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac)
 THEN RAISE EXCEPTION 'P42 expired key window accepted'; END IF;
END $expired_key$;
SET LOCAL ROLE postgres;
UPDATE supporter_private.p42_activation_signing_keys
 SET not_after=NULL WHERE key_id='P42_V1';
UPDATE supporter_private.p42_activation_writer_gate
 SET not_before=clock_timestamp()+interval '1 minute' WHERE id=1;
SET LOCAL ROLE service_role;
DO $cutoff$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM p42_candidate_fixture;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac)
 THEN RAISE EXCEPTION 'P42 future gate cutoff accepted'; END IF;
END $cutoff$;
SET LOCAL ROLE postgres;
UPDATE supporter_private.p42_activation_signing_keys
 SET enabled=false WHERE key_id='P42_V1';
SET LOCAL ROLE service_role;
DO $revoked$
DECLARE f record;
BEGIN
 SELECT * INTO f FROM p42_candidate_fixture;
 IF public.f16_p42_register_authenticated_activation(
 f.event_id,f.sub_id,f.issued_at,f.nonce,f.key_id,f.mac)
 THEN RAISE EXCEPTION 'P42 revoked key accepted'; END IF;
END $revoked$;
SET LOCAL ROLE postgres;
DO $no_money$
BEGIN
 IF (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings)<>1
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'P42 synthetic rehearsal altered financial state'; END IF;
END $no_money$;
ROLLBACK;
