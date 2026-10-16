-- PAZO P42: manually supervised DB deletion, PG17 disposable-only rehearsal.
-- NEVER HOSTED; no key material returned, no real tokens. All changes ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
DO $test_p42_scope$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
    OR session_user<>'f14_admin' OR current_user<>'postgres'
    OR pg_catalog.current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'P42 manual revocation test requires isolated PG17' USING ERRCODE='42501'; END IF;
 IF (SELECT count(*) FROM supporter_private.p42_activation_signing_keys)<>0
    OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
    OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
    OR pg_catalog.has_function_privilege('anon',
       'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated',
       'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
    OR pg_catalog.has_function_privilege('service_role',
       'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P42 security baseline not inert' USING ERRCODE='42501'; END IF;
END $test_p42_scope$;

-- Fixed public bytes in ROLLBACK-only transaction. Not a cryptographic key.
INSERT INTO supporter_private.p42_activation_signing_keys
 (key_id,key_bytes,enabled,not_before,not_after)
 VALUES
 ('P42_V1',decode(repeat('a1',32),'hex'),false,
   clock_timestamp() + interval '1 hour',clock_timestamp() + interval '25 hours'),
 ('P42_V2',decode(repeat('b2',32),'hex'),false,
   clock_timestamp() + interval '1 hour',clock_timestamp() + interval '25 hours');

DO $test_p42_admin$
DECLARE affected int; expected_key text;
BEGIN
 -- Wrong ID must never delete another version or trigger wildcard removal.
 DELETE FROM supporter_private.p42_activation_signing_keys
 WHERE key_id='P42_V999'
 RETURNING key_id INTO expected_key;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected<>0 OR expected_key IS NOT NULL THEN
   RAISE EXCEPTION 'P42 wrong version unexpectedly removed a key'; END IF;

 -- Simulate an exact one-key revocation, NO dynamic SQL/bytes RETURNING.
 DELETE FROM supporter_private.p42_activation_signing_keys
 WHERE key_id='P42_V1'
 RETURNING key_id INTO expected_key;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected<>1 OR expected_key IS DISTINCT FROM 'P42_V1'
   OR (SELECT count(*) FROM supporter_private.p42_activation_signing_keys)<>1
   OR (SELECT count(*) FROM supporter_private.p42_activation_signing_keys
       WHERE key_id='P42_V2')<>1
 THEN RAISE EXCEPTION 'P42 deletion affected wrong rows'; END IF;

 -- Subsequent exact DELETE must be visibly non-idempotent (0 rows)
 -- so operator can distinguish a verified prior removal from a new action.
 expected_key:=NULL;
 DELETE FROM supporter_private.p42_activation_signing_keys
 WHERE key_id='P42_V1'
 RETURNING key_id INTO expected_key;
 GET DIAGNOSTICS affected = ROW_COUNT;
 IF affected<>0 OR expected_key IS NOT NULL THEN
   RAISE EXCEPTION 'P42 duplicate DELETE unexpectedly changed rows'; END IF;

 IF (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings)<>0
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P42 synthetic deletion altered finance state'; END IF;
END $test_p42_admin$;

ROLLBACK;
-- A separate preflight must confirm zero rows AFTER this ROLLBACK.
SELECT 'P42_MANUAL_DB_REVOCATION_ROLLBACK_PG17_PASS_ONLY' AS result,
       false AS mayProvision, false AS mayPay, false AS mayGrantBenefits;
