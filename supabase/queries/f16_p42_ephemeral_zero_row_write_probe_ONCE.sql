-- P42 authorized ephemeral CLI WRITE-capability gate ONLY: no material, no persistence.
-- This must run with session_user=cli_login_postgres and SET ROLE postgres.
-- Zero-row INSERT cannot create a key. Fail closed on any drift.
BEGIN;
SET LOCAL statement_timeout = '4000ms';
SET LOCAL lock_timeout = '1000ms';
DO $guard$
BEGIN
 IF current_database() <> 'postgres'
 OR session_user NOT IN ('cli_login_postgres','cli_login_postgres.mrybvqdebbgcayuvgkkr')
 OR current_user <> 'postgres'
 OR current_setting('transaction_read_only') <> 'off'
 OR (SELECT count(*) FROM supporter_private.p42_activation_signing_keys) <> 0
 OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings) <> 0
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries) <> 0
 OR pg_catalog.has_function_privilege('service_role',
    'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P42_EPHEMERAL_WRITE_PROBE_GUARD_BLOCKED' USING ERRCODE='55000'; END IF;
END $guard$;
WITH zero_row_write AS (
 INSERT INTO supporter_private.p42_activation_signing_keys
 (key_id,key_bytes,enabled,not_before,not_after)
 SELECT NULL::text,NULL::bytea,false,NULL::timestamptz,NULL::timestamptz
 WHERE false
 RETURNING key_id
)
SELECT CASE WHEN (SELECT count(*) FROM zero_row_write) = 0
 THEN 'P42_EPHEMERAL_ROLE_ZERO_ROW_INSERT_PASS'
 ELSE 'P42_EPHEMERAL_WRITE_PROBE_GUARD_BLOCKED' END;
ROLLBACK;
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '4000ms';
DO $post$
BEGIN
 IF session_user NOT IN ('cli_login_postgres','cli_login_postgres.mrybvqdebbgcayuvgkkr')
 OR current_user <> 'postgres'
 OR (SELECT count(*) FROM supporter_private.p42_activation_signing_keys) <> 0
 OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings) <> 0
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries) <> 0
 THEN RAISE EXCEPTION 'P42_EPHEMERAL_WRITE_PROBE_POSTFLIGHT_BLOCKED' USING ERRCODE='55000'; END IF;
END $post$;
SELECT 'P42_EPHEMERAL_ZERO_KEYS_GATES_OFF_POSTFLIGHT_PASS';
COMMIT;
