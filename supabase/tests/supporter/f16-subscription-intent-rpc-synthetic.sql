-- PAZO F16: service-only PostgREST RPC schema QA. NO hosted mutation.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'F16 private RPC lab requires disposable DB'; END IF;
END $guard$;

DO $permissions$
BEGIN
 IF has_function_privilege('anon','public.f16_paypal_create_private_intent(uuid,text)','EXECUTE') OR
    has_function_privilege('authenticated','public.f16_paypal_create_private_intent(uuid,text)','EXECUTE') OR
    has_function_privilege('anon','public.f16_paypal_read_private_intent(text)','EXECUTE') OR
    has_function_privilege('authenticated','public.f16_paypal_read_private_intent(text)','EXECUTE') OR
    has_function_privilege('anon','public.f16_paypal_bind_private_intent(text,uuid,text,text)','EXECUTE') OR
    has_function_privilege('authenticated','public.f16_paypal_bind_private_intent(text,uuid,text,text)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f16_paypal_create_private_intent(uuid,text)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f16_paypal_read_private_intent(text)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f16_paypal_bind_private_intent(text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'F16 RPC exposes wrong database roles'; END IF;
 IF EXISTS(
 SELECT 1 FROM pg_catalog.pg_proc WHERE oid IN (
  'public.f16_paypal_create_private_intent(uuid,text)'::regprocedure,
  'public.f16_paypal_read_private_intent(text)'::regprocedure,
  'public.f16_paypal_bind_private_intent(text,uuid,text,text)'::regprocedure
 ) AND (
   NOT prosecdef OR NOT proconfig @> ARRAY['search_path=""'] OR
   pg_get_userbyid(proowner)<>'postgres'
 ))
 THEN RAISE EXCEPTION 'F16 private RPC owner/security config mismatch'; END IF;
END $permissions$;

SET LOCAL ROLE anon;
DO $anon$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f16_paypal_read_private_intent(
   'intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'anon queried private owner'; END IF;
END $anon$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $auth$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM public.f16_paypal_create_private_intent(
   '63e812b0-a7e5-49f6-b2dd-c11d2c72af57'::uuid,
   'intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'authenticated created private intent'; END IF;
END $auth$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $service$
DECLARE
 owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
 other uuid:='8b134f73-5ee3-49a2-9a36-3e1592e5af81';
 intent text:='intent-0d7c7f0e-16a0-4c59-b052-18774ab8231e';
 plan text:='P-14V25407JP6850922NLHMDKI';
 created boolean;
 record jsonb;
 status text;
 rejected boolean:=false;
BEGIN
 created:=public.f16_paypal_create_private_intent(owner,intent);
 IF created IS DISTINCT FROM true THEN RAISE EXCEPTION 'private intent not persisted'; END IF;
 created:=public.f16_paypal_create_private_intent(other,intent);
 IF created IS DISTINCT FROM false THEN RAISE EXCEPTION 'existing intent overwritten by other owner'; END IF;
 record:=public.f16_paypal_read_private_intent(intent);
 IF record->>'owner_id' IS DISTINCT FROM owner::text OR
    record->>'state' <> 'pending' OR
    record->>'plan_id' <> plan
 THEN RAISE EXCEPTION 'private intent RPC leaked or misread owner'; END IF;
 BEGIN
   PERFORM public.f16_paypal_bind_private_intent(intent,other,'I-MOCK-OWNER',plan);
 EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'other owner bound subscription'; END IF;
 status:=public.f16_paypal_bind_private_intent(intent,owner,'I-MOCK-OWNER',plan);
 IF status<>'new_binding' THEN RAISE EXCEPTION 'private bind failed'; END IF;
 status:=public.f16_paypal_bind_private_intent(intent,owner,'I-MOCK-OWNER',plan);
 IF status<>'already_bound' THEN RAISE EXCEPTION 'retry not idempotent'; END IF;
 record:=public.f16_paypal_read_private_intent(intent);
 IF record->>'external_subscription_id' <> 'I-MOCK-OWNER' OR
    record->>'state' <> 'bound'
 THEN RAISE EXCEPTION 'persisted subscription owner mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_subscription_intents
 WHERE intent_id=intent AND owner_id=other)
 THEN RAISE EXCEPTION 'stolen subscription owner'; END IF;
 RAISE NOTICE 'PASS F16: service-only private RPC create/read/bind cannot reassign subscription';
END $service$;
RESET ROLE;
ROLLBACK;
