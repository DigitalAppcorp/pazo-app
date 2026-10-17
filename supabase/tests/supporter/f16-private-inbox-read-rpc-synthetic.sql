-- F16 service-only RPC synthetic security test. NEVER run on PAZO hosted.
\set ON_ERROR_STOP on
BEGIN;
-- Earlier disposable migration tests intentionally leave synthetic ledger
-- fixtures. Verify this READ-only RPC test changes NONE of those fixtures.
CREATE TEMP TABLE f16_read_financial_before ON COMMIT DROP AS
 SELECT
   (SELECT count(*)::bigint FROM supporter_private.paypal_payment_entries) AS payments,
   (SELECT count(*)::bigint FROM supporter_private.paypal_payment_reversals) AS reversals;
DO $preflight$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Unsafe F16 SQL test target'; END IF;
 IF NOT (SELECT c.relrowsecurity AND c.relforcerowsecurity
   FROM pg_catalog.pg_class c
   WHERE c.oid='supporter_private.paypal_verified_event_inbox'::regclass)
 THEN RAISE EXCEPTION 'Private inbox RLS drift'; END IF;
 IF NOT (SELECT p.prosecdef
    AND pg_catalog.pg_get_userbyid(p.proowner)='postgres'
    AND 'search_path=""'=ANY(p.proconfig)
   FROM pg_catalog.pg_proc p
   WHERE p.oid='public.f16_paypal_read_verified_inbox(text)'::regprocedure)
 THEN RAISE EXCEPTION 'Reader privilege/owner configuration mismatch'; END IF;
 IF has_function_privilege('anon','public.f16_paypal_read_verified_inbox(text)','EXECUTE')
  OR has_function_privilege('authenticated','public.f16_paypal_read_verified_inbox(text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.f16_paypal_read_verified_inbox(text)','EXECUTE')
 THEN RAISE EXCEPTION 'Browser can call private inbox RPC'; END IF;
 IF has_table_privilege('service_role','supporter_private.paypal_verified_event_inbox','SELECT')
 OR has_table_privilege('anon','supporter_private.paypal_verified_event_inbox','SELECT')
 OR has_table_privilege('authenticated','supporter_private.paypal_verified_event_inbox','SELECT')
 THEN RAISE EXCEPTION 'Private table exposed by direct grants'; END IF;
END $preflight$;
SET LOCAL ROLE postgres;
INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type)
 VALUES ('WH-F16-DRAFT-READ-ONLY','PAYMENT.SALE.COMPLETED');
SET LOCAL ROLE service_role;
DO $service$
DECLARE v jsonb; rejected boolean:=false;
BEGIN
 v:=public.f16_paypal_read_verified_inbox('WH-F16-DRAFT-READ-ONLY');
 IF v IS NULL OR pg_catalog.jsonb_typeof(v)<>'object'
  OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(v))<>4
  OR v->>'provider_event_id'<>'WH-F16-DRAFT-READ-ONLY'
  OR v->>'event_type'<>'PAYMENT.SALE.COMPLETED'
  OR v->>'processing_state'<>'pending'
  OR v->>'retention_hold'<>'true'
 THEN RAISE EXCEPTION 'Untrusted/minimal response contract failed'; END IF;
 IF public.f16_paypal_read_verified_inbox('WH-F16-MISSING') IS NOT NULL
 THEN RAISE EXCEPTION 'Missing reference was exposed'; END IF;
 BEGIN
   PERFORM public.f16_paypal_read_verified_inbox('../../private');
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Malformed ID accepted'; END IF;
END $service$;
SET LOCAL ROLE anon;
DO $anon$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f16_paypal_read_verified_inbox('WH-F16-DRAFT-READ-ONLY');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'anon executed service-only reader'; END IF;
END $anon$;
SET LOCAL ROLE authenticated;
DO $auth$
DECLARE denied boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f16_paypal_read_verified_inbox('WH-F16-DRAFT-READ-ONLY');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'authenticated executed service-only reader'; END IF;
END $auth$;
SET LOCAL ROLE postgres;
DO $economy$
BEGIN
 IF (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries)
       <> (SELECT payments FROM f16_read_financial_before)
 OR (SELECT COUNT(*) FROM supporter_private.paypal_payment_reversals)
       <> (SELECT reversals FROM f16_read_financial_before)
 THEN RAISE EXCEPTION 'Read test altered existing synthetic financial ledger'; END IF;
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'Read test granted entitlement'; END IF;
END $economy$;
ROLLBACK;
SELECT 'PASS F16: only service_role reads private 4-field inbox RPC, no financial mutation';
