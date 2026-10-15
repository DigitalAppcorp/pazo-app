-- F16-P05 ONLY inside disposable CI, never on hosted Supabase.
\set ON_ERROR_STOP on
BEGIN;
DO $p05_test$
DECLARE
 evt text; inserted boolean;
 types text[]:=ARRAY['CUSTOMER.DISPUTE.CREATED',
  'CUSTOMER.DISPUTE.UPDATED','CUSTOMER.DISPUTE.RESOLVED'];
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE SQL ONLY'; END IF;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n
  ON n.oid=p.pronamespace WHERE n.nspname='public'
  AND p.proname='f16_paypal_record_verified_event')<>1
 THEN RAISE EXCEPTION 'RPC overloaded or missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n
  ON n.oid=p.pronamespace WHERE n.nspname='public'
  AND p.proname='f16_paypal_record_verified_event'
  AND p.prosecdef AND 'search_path=""'=ANY(p.proconfig))
 THEN RAISE EXCEPTION 'Insecure public SECURITY DEFINER'; END IF;
 IF NOT has_function_privilege('service_role',
    'public.f16_paypal_record_verified_event(text,text)','EXECUTE')
  OR has_function_privilege('anon',
    'public.f16_paypal_record_verified_event(text,text)','EXECUTE')
  OR has_function_privilege('authenticated',
    'public.f16_paypal_record_verified_event(text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'RPC permission leak'; END IF;
 IF has_table_privilege('service_role',
    'supporter_private.paypal_verified_event_inbox','SELECT')
  OR has_table_privilege('anon',
    'supporter_private.paypal_verified_event_inbox','SELECT')
 THEN RAISE EXCEPTION 'Exposed inbox table'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE
  c.oid='supporter_private.paypal_verified_event_inbox'::regclass
  AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'Inbox RLS force missing'; END IF;

 FOREACH evt IN ARRAY types LOOP
  inserted:=public.f16_paypal_record_verified_event(
   'WH-P05-'+pg_catalog.replace(evt,'.','-'),evt);
  IF inserted IS NOT TRUE THEN RAISE EXCEPTION 'First insert not created'; END IF;
  inserted:=public.f16_paypal_record_verified_event(
   'WH-P05-'+pg_catalog.replace(evt,'.','-'),evt);
  IF inserted IS NOT FALSE THEN RAISE EXCEPTION 'Duplicate not idempotent'; END IF;
  IF NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_event_inbox
   WHERE provider_event_id='WH-P05-'+pg_catalog.replace(evt,'.','-')
   AND event_type=evt AND processing_state='pending')
  THEN RAISE EXCEPTION 'Missing minimal pending event'; END IF;
 END LOOP;
 -- The old SALE contract must remain operational.
 IF public.f16_paypal_record_verified_event('WH-P05-OLD-SALE',
  'PAYMENT.SALE.COMPLETED') IS NOT TRUE
 THEN RAISE EXCEPTION 'Existing sale handling broken'; END IF;
 BEGIN
  PERFORM public.f16_paypal_record_verified_event(
   'WH-P05-CUSTOMER-DISPUTE-CREATED','CUSTOMER.DISPUTE.UPDATED');
  RAISE EXCEPTION 'Existing event/type collision accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_paypal_record_verified_event(
   'WH-P05-BAD-EVENT','CUSTOMER.DISPUTE.DELETED');
  RAISE EXCEPTION 'Unsupported new event accepted';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries)
 THEN RAISE EXCEPTION 'RPC must not modify payment ledger'; END IF;
END
$p05_test$;
ROLLBACK;