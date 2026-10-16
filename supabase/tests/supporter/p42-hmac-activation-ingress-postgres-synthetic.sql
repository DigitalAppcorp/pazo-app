-- P42 ONLY disposable: genuine HMAC must bind event/subscription/time/nonce.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'P42 PG17 only' USING ERRCODE='42501'; END IF;
END $guard$;
INSERT INTO supporter_private.paypal_subscription_intents
(intent_id,owner_id,provider,plan_id,state,external_subscription_id,bound_at)
VALUES('intent-44444444-4444-4444-8444-444444444444',
'11111111-1111-4111-8111-111111111111','paypal',
'P-14V25407JP6850922NLHMDKI','bound','I-P42-OWNER',clock_timestamp()),
('intent-55555555-5555-4555-8555-555555555555',
'22222222-2222-4222-8222-222222222222','paypal',
'P-14V25407JP6850922NLHMDKI','bound','I-P42-OTHER',clock_timestamp());
INSERT INTO supporter_private.paypal_verified_event_inbox
(provider_event_id,event_type,verified_at,retention_hold)
VALUES('P42-ACT-ONE','BILLING.SUBSCRIPTION.ACTIVATED',clock_timestamp(),true),
('P42-NOT-ACT','PAYMENT.SALE.COMPLETED',clock_timestamp(),true);
CREATE TEMP TABLE p42_input ON COMMIT DROP AS
SELECT 'P42-ACT-ONE'::text AS event_id,'I-P42-OWNER'::text AS subscription_id,
to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')::text AS issued_at,
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid AS nonce,
'LAB_V1'::text AS key_id, ''::text AS mac, ''::text AS changed_mac,
''::text AS nonactivation_mac, ''::text AS expired_time, ''::text AS expired_mac;
UPDATE p42_input i SET
 mac=encode(public.hmac(convert_to('p42|LAB_V1|'||i.event_id||'|'||
 i.subscription_id||'|'||i.issued_at||'|'||i.nonce::text,'UTF8'),
 (SELECT key_bytes FROM supporter_private.p42_lab_activation_signing_keys),'sha256'),'hex'),
 changed_mac=encode(public.hmac(convert_to('p42|LAB_V1|'||i.event_id||'|'||
 'I-P42-OTHER'||'|'||i.issued_at||'|'||i.nonce::text,'UTF8'),
 (SELECT key_bytes FROM supporter_private.p42_lab_activation_signing_keys),'sha256'),'hex'),
 nonactivation_mac=encode(public.hmac(convert_to('p42|LAB_V1|P42-NOT-ACT|'||
 i.subscription_id||'|'||i.issued_at||'|'||i.nonce::text,'UTF8'),
 (SELECT key_bytes FROM supporter_private.p42_lab_activation_signing_keys),'sha256'),'hex'),
 expired_time=to_char((clock_timestamp()-interval '3 minutes') AT TIME ZONE 'UTC',
 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
UPDATE p42_input i SET expired_mac=encode(public.hmac(convert_to(
 'p42|LAB_V1|'||i.event_id||'|'||i.subscription_id||'|'||
 i.expired_time||'|'||i.nonce::text,'UTF8'),
 (SELECT key_bytes FROM supporter_private.p42_lab_activation_signing_keys),'sha256'),'hex');
GRANT SELECT ON p42_input TO service_role;
SET LOCAL ROLE service_role;
DO $assert$
DECLARE p record; valid boolean;
BEGIN
 SELECT * INTO p FROM p42_input;
 IF public.f16_p42_lab_register_authenticated_activation(
 p.event_id,p.subscription_id,p.issued_at,p.nonce,p.key_id,repeat('0',64))
 OR public.f16_p42_lab_register_authenticated_activation(
 p.event_id,'I-P42-OTHER',p.issued_at,p.nonce,p.key_id,p.mac)
 OR public.f16_p42_lab_register_authenticated_activation(
 p.event_id,p.subscription_id,p.expired_time,p.nonce,p.key_id,p.expired_mac)
 OR public.f16_p42_lab_register_authenticated_activation(
 'P42-NOT-ACT',p.subscription_id,p.issued_at,p.nonce,p.key_id,p.nonactivation_mac)
 THEN RAISE EXCEPTION 'P42 forged, mismatched, expired or wrong type accepted'; END IF;
 valid:=public.f16_p42_lab_register_authenticated_activation(
 p.event_id,p.subscription_id,p.issued_at,p.nonce,p.key_id,p.mac);
 IF valid IS DISTINCT FROM true THEN RAISE EXCEPTION 'P42 valid MAC rejected'; END IF;
 IF public.f16_p42_lab_register_authenticated_activation(
 p.event_id,p.subscription_id,p.issued_at,p.nonce,p.key_id,p.mac) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'P42 idempotent replay rejected'; END IF;
 IF public.f16_p42_lab_register_authenticated_activation(
 p.event_id,'I-P42-OTHER',p.issued_at,p.nonce,p.key_id,p.changed_mac)
 THEN RAISE EXCEPTION 'P42 replay reassigned event'; END IF;
END $assert$;
SET LOCAL ROLE postgres;
UPDATE supporter_private.p42_lab_activation_signing_keys SET enabled=false WHERE key_id='LAB_V1';
SET LOCAL ROLE service_role;
DO $revoked$
DECLARE p record;
BEGIN
 SELECT * INTO p FROM p42_input;
 IF public.f16_p42_lab_register_authenticated_activation(
 p.event_id,p.subscription_id,p.issued_at,p.nonce,p.key_id,p.mac)
 THEN RAISE EXCEPTION 'P42 revoked key accepted'; END IF;
END $revoked$;
SET LOCAL ROLE postgres;
DO $post$
BEGIN
 IF pg_catalog.has_table_privilege('service_role'::name,
 'supporter_private.p42_lab_activation_signing_keys'::regclass,'SELECT')
 OR pg_catalog.has_table_privilege('service_role'::name,
 'supporter_private.p42_lab_activation_signing_keys'::regclass,'INSERT')
 OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings)<>1
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'P42 key exposure or payment/worker side effect'; END IF;
END $post$;
ROLLBACK;
