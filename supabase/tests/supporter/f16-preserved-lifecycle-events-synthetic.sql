-- PAZO F16: exact 11-event provider contract after additive migration.
-- Run ONLY in disposable f14_synthetic PostgreSQL 17, not hosted PAZO.
\set ON_ERROR_STOP on
BEGIN;
DO $preflight$
BEGIN
  IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  THEN RAISE EXCEPTION 'Refuse F16 synthetic life-cycle test outside CI PostgreSQL'; END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity
    FROM pg_catalog.pg_class
    WHERE oid='supporter_private.paypal_verified_event_inbox'::regclass)
  THEN RAISE EXCEPTION 'F16 inbox missing forced RLS'; END IF;
  IF NOT (SELECT prosecdef AND proconfig @> ARRAY['search_path=""']
             AND pg_catalog.pg_get_userbyid(proowner)='postgres'
     FROM pg_catalog.pg_proc
     WHERE oid='public.f16_paypal_record_verified_event(text,text)'::regprocedure)
  THEN RAISE EXCEPTION 'F16 secure definer contract drift'; END IF;
  IF has_function_privilege('anon','public.f16_paypal_record_verified_event(text,text)','EXECUTE')
      OR has_function_privilege('authenticated','public.f16_paypal_record_verified_event(text,text)','EXECUTE')
      OR NOT has_function_privilege('service_role','public.f16_paypal_record_verified_event(text,text)','EXECUTE')
  THEN RAISE EXCEPTION 'F16 RPC privilege regression'; END IF;
END $preflight$;

SET LOCAL ROLE service_role;
DO $deliver$
DECLARE ty text;
DECLARE event_id text;
DECLARE accepted boolean;
DECLARE duplicated boolean;
DECLARE count_added integer:=0;
BEGIN
  FOREACH ty IN ARRAY ARRAY[
    'BILLING.SUBSCRIPTION.CREATED',
    'BILLING.SUBSCRIPTION.RE-ACTIVATED',
    'PAYMENT.SALE.COMPLETED',
    'PAYMENT.SALE.REFUNDED',
    'PAYMENT.SALE.REVERSED'
  ] LOOP
    event_id:='WH-F16-LIFECYCLE-'||count_added;
    accepted:=public.f16_paypal_record_verified_event(event_id,ty);
    duplicated:=public.f16_paypal_record_verified_event(event_id,ty);
    IF accepted IS DISTINCT FROM true OR duplicated IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'Lifecycle event idempotence broken'; END IF;
    count_added:=count_added+1;
  END LOOP;
END $deliver$;
RESET ROLE;

DO $integrity$
DECLARE bad_type boolean:=false;
DECLARE accidental bigint;
BEGIN
  BEGIN
    INSERT INTO supporter_private.paypal_verified_event_inbox(provider_event_id,event_type)
      VALUES('WH-F16-NOT-ALLOWED','PERSONAL.DATA.DUMP');
  EXCEPTION WHEN check_violation THEN bad_type:=true;
  END;
  IF NOT bad_type THEN RAISE EXCEPTION 'F16 allowed unknown arbitrary type'; END IF;
  SELECT count(*) INTO accidental FROM supporter_private.paypal_payment_entries;
  IF accidental<>0 THEN RAISE EXCEPTION 'F16 extra event wrote financial ledger'; END IF;
  IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
  THEN RAISE EXCEPTION 'F16 extra event granted entitlement'; END IF;
END $integrity$;

SET LOCAL ROLE service_role;
DO $collision$
DECLARE denied boolean:=false;
BEGIN
  BEGIN
    PERFORM public.f16_paypal_record_verified_event(
      'WH-F16-LIFECYCLE-0','BILLING.SUBSCRIPTION.RE-ACTIVATED');
  EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Existing event ID allowed different type'; END IF;
END $collision$;
RESET ROLE;

SELECT 'PASS F16: 11-event inbox supports legacy lifecycle without financial entitlements' AS result;
ROLLBACK;
