-- Pazo Live service-only RPC bridge: PostgreSQL 17 disposable only.
-- Inherited f14_synthetic DB, dependencies already loaded by existing lab.
DO $safety$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE DATABASE REQUIRED' USING ERRCODE='42501'; END IF;
END $safety$;
\i supabase/drafts/f16_live_service_rpc_bridge_REVIEW_REQUIRED.sql
DO $permissions$
DECLARE r record; sig regprocedure;
BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'pazo_f16_live_service_%'
   AND p.proname<>'pazo_f16_live_service_binding_read'
 LOOP
  sig:=r.signature;
  IF NOT has_function_privilege('service_role',sig,'EXECUTE')
   OR has_function_privilege('anon',sig,'EXECUTE')
   OR has_function_privilege('authenticated',sig,'EXECUTE')
  THEN RAISE EXCEPTION 'Service wrapper ACL mismatch: %',sig; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'pazo_f16_live_service_%' AND p.proname<>'pazo_f16_live_service_binding_read')<>9
 THEN RAISE EXCEPTION 'Expected nine service-only RPCs'; END IF;
 IF has_function_privilege('service_role',
  'supporter_private.pazo_live_intent_begin(uuid,uuid,bigint,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Private RPC exposed directly'; END IF;
END $permissions$;
DO $negative$
DECLARE v jsonb;
BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_checkout_begin(
   '12345678-1234-4234-8234-123456789abc',
   '44444444-4444-4444-8444-444444444444',1,'es',
   'pazo-supporter-live.offer-v1',repeat('b',64));
  RAISE EXCEPTION 'Anon claim unexpectedly executed service RPC';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','service_role',true);
 v:=public.pazo_f16_live_service_checkout_begin(
  '12345678-1234-4234-8234-123456789abc',
  '44444444-4444-4444-8444-444444444444',1,'es',
  'pazo-supporter-live.offer-v1',repeat('b',64));
 IF v->>'code'<>'live_checkout_not_released'
 THEN RAISE EXCEPTION 'Live OFF broken by wrapper: %',v; END IF;
 IF public.pazo_f16_live_service_active_route() IS NOT NULL
 THEN RAISE EXCEPTION 'OFF gateway exposed active Live route'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','',true);
 RAISE NOTICE 'F16_LIVE_SERVICE_BRIDGE_DISPOSABLE_PG17_PASS';
END $negative$;
