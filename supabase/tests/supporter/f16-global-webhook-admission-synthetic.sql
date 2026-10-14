-- PAZO F16: disposable PostgreSQL service-only global admission checks.
-- Run ONLY after f16-global-webhook-admission-lab-draft.sql in f14_synthetic.
\set ON_ERROR_STOP on
DO $preflight$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Refusing F16 global budget test outside isolated PostgreSQL'; END IF;
 IF has_function_privilege('anon','public.f16_paypal_try_admit_global()','EXECUTE') OR
    has_function_privilege('authenticated','public.f16_paypal_try_admit_global()','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f16_paypal_try_admit_global()','EXECUTE')
 THEN RAISE EXCEPTION 'F16 global admission RPC ACL violation'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_proc
   WHERE oid='public.f16_paypal_try_admit_global()'::regprocedure
   AND (NOT prosecdef OR pg_catalog.pg_get_userbyid(proowner)<>'postgres'
     OR NOT proconfig @> ARRAY['search_path=""']))
 THEN RAISE EXCEPTION 'F16 global RPC definer security mismatch'; END IF;
 IF NOT (SELECT relrowsecurity AND relforcerowsecurity
   FROM pg_catalog.pg_class WHERE oid='supporter_private.f16_webhook_request_budget'::regclass)
 THEN RAISE EXCEPTION 'F16 global budget missing forced RLS'; END IF;
END $preflight$;

SET ROLE anon;
DO $anonymous$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN PERFORM public.f16_paypal_try_admit_global();
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'anon invoked PayPal global budget RPC'; END IF;
END $anonymous$;
RESET ROLE;

SET ROLE authenticated;
DO $authenticated$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN PERFORM public.f16_paypal_try_admit_global();
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'authenticated invoked PayPal budget RPC'; END IF;
END $authenticated$;
RESET ROLE;

SET ROLE service_role;
DO $budget$
DECLARE i integer;
BEGIN
 FOR i IN 1..30 LOOP
  IF public.f16_paypal_try_admit_global() IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Budget rejected valid synthetic request number %',i; END IF;
 END LOOP;
 IF public.f16_paypal_try_admit_global() IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Minute cap 30 not enforced'; END IF;
END $budget$;
RESET ROLE;

DO $integrity$
BEGIN
 IF (SELECT admitted FROM supporter_private.f16_webhook_request_budget WHERE bucket='minute')<>30 OR
    (SELECT admitted FROM supporter_private.f16_webhook_request_budget WHERE bucket='day')<>30
 THEN RAISE EXCEPTION 'Exhausted quota changed global admission counters'; END IF;
END $integrity$;

SET ROLE postgres;
UPDATE supporter_private.f16_webhook_request_budget
SET window_number=0,admitted=0 WHERE bucket='minute';
UPDATE supporter_private.f16_webhook_request_budget
SET window_number=pg_catalog.floor(pg_catalog.date_part('epoch',pg_catalog.clock_timestamp())/86400)::bigint,
    admitted=2000 WHERE bucket='day';
RESET ROLE;

SET ROLE service_role;
DO $daily$
BEGIN
 IF public.f16_paypal_try_admit_global() IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Daily cap 2000 not enforced'; END IF;
END $daily$;
RESET ROLE;

SET ROLE postgres;
UPDATE supporter_private.f16_webhook_request_budget
SET window_number=0,admitted=0 WHERE bucket IN ('day','minute');
RESET ROLE;
SET ROLE service_role;
DO $recovery$
BEGIN
 IF public.f16_paypal_try_admit_global() IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Budget did not recover after synthetic window rollover'; END IF;
END $recovery$;
RESET ROLE;
SELECT 'PASS F16: service-role-only global budget, minute/day caps, fail-closed reset' AS result;
