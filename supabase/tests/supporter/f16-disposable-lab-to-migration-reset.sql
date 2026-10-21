-- Only reset SYNTHETIC F16 objects inside the disposable CI fixture so
-- the CLI-generated migration can be applied to a clean schema and retested.
-- NEVER RUN ON HOSTED SUPABASE. Destructive SQL is LAB ONLY.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'f14_synthetic' OR
    session_user <> 'f14_admin' OR
    current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'F16 migration QA reset is prohibited outside disposable PostgreSQL 17'; END IF;
END $guard$;

DROP FUNCTION public.f16_paypal_create_private_intent(uuid,text);
DROP FUNCTION public.f16_paypal_read_private_intent(text);
DROP FUNCTION public.f16_paypal_bind_private_intent(text,uuid,text,text);
DROP TABLE supporter_private.paypal_subscription_intents CASCADE;
DROP TABLE supporter_private.paypal_payment_entries CASCADE;
DROP TABLE supporter_private.paypal_payment_reversals CASCADE;
COMMIT;
