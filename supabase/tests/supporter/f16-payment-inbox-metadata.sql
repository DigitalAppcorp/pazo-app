-- F16 lab-only introspection after draft inbox SQL is loaded.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $guard$
DECLARE p oid;
BEGIN
  IF pg_catalog.current_database()<>'f14_synthetic'
     OR session_user<>'f14_admin'
  THEN RAISE EXCEPTION 'F16 metadata test requires isolated lab'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid='supporter_private.paypal_verified_event_inbox'::regclass
      AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN RAISE EXCEPTION 'F16 inbox is not FORCE RLS'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname='supporter_private'
      AND tablename='paypal_verified_event_inbox'
  ) THEN RAISE EXCEPTION 'F16 inbox must not expose RLS policies'; END IF;

  IF pg_catalog.has_schema_privilege('anon','supporter_private','USAGE')
     OR pg_catalog.has_schema_privilege('authenticated','supporter_private','USAGE')
     OR pg_catalog.has_schema_privilege('service_role','supporter_private','USAGE')
  THEN RAISE EXCEPTION 'F16 private schema usage was granted'; END IF;

  IF pg_catalog.has_table_privilege('anon','supporter_private.paypal_verified_event_inbox','SELECT,INSERT,UPDATE,DELETE')
     OR pg_catalog.has_table_privilege('authenticated','supporter_private.paypal_verified_event_inbox','SELECT,INSERT,UPDATE,DELETE')
     OR pg_catalog.has_table_privilege('service_role','supporter_private.paypal_verified_event_inbox','SELECT,INSERT,UPDATE,DELETE')
  THEN RAISE EXCEPTION 'F16 inbox direct table access granted'; END IF;

  IF pg_catalog.has_function_privilege('anon','public.f16_paypal_record_verified_event(text,text)','EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated','public.f16_paypal_record_verified_event(text,text)','EXECUTE')
     OR NOT pg_catalog.has_function_privilege('service_role','public.f16_paypal_record_verified_event(text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'F16 RPC permissions invalid'; END IF;

  SELECT pp.oid INTO p
  FROM pg_catalog.pg_proc pp
  WHERE pp.oid='public.f16_paypal_record_verified_event(text,text)'::regprocedure
    AND pp.prosecdef AND pp.proconfig @> ARRAY['search_path=""']
    AND pg_catalog.pg_get_userbyid(pp.proowner)='postgres';
  IF p IS NULL THEN RAISE EXCEPTION 'F16 RPC owner/search_path/security mode invalid'; END IF;

  IF pg_catalog.to_regclass('supporter_private.paypal_payment_entries') IS NOT NULL
     OR pg_catalog.to_regclass('supporter_private.coverage_periods') IS NOT NULL
  THEN RAISE EXCEPTION 'This lab gate must not install entitlements or ledger'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid='supporter_private.wall_has_verified_entitlement(uuid)'::regprocedure
  ) THEN RAISE EXCEPTION 'Original wall consent guard is gone'; END IF;
END;
$guard$;
ROLLBACK;
