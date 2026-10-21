-- F16 original recorded sale service RPC: disposable PostgreSQL 17 ONLY.
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;
\i supabase/migrations/20261021014400_pazo_f16_live_recorded_sale_reader.sql
DO $verify$
DECLARE v jsonb;
 owner_id uuid='12345678-1234-4234-8234-123456789abc';
 intent_id text='intent-12345678-1234-4234-8234-123456789abc';
 sub_id text='I-LIVE-SYNTHETIC1234';
BEGIN
 IF pg_catalog.has_function_privilege('anon',
  'public.pazo_f16_live_service_recorded_sale_read(uuid,text,text,bigint,text)','EXECUTE')
  OR pg_catalog.has_function_privilege('authenticated',
  'public.pazo_f16_live_service_recorded_sale_read(uuid,text,text,bigint,text)','EXECUTE')
  OR NOT pg_catalog.has_function_privilege('service_role',
  'public.pazo_f16_live_service_recorded_sale_read(uuid,text,text,bigint,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Original sale read ACL mismatch'; END IF;
 BEGIN
  PERFORM public.pazo_f16_live_service_recorded_sale_read(
   owner_id,intent_id,sub_id,1,'SALE-OWNER-ONE');
  RAISE EXCEPTION 'Unprivileged original-sale read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','',true);
 PERFORM pg_catalog.set_config('request.jwt.claims','{"role":"service_role"}',true);
 v:=public.pazo_f16_live_service_recorded_sale_read(
  owner_id,intent_id,sub_id,1,'SALE-OWNER-ONE');
 IF v->>'recorded'<>'true' OR
   v->>'saleId'<>'SALE-OWNER-ONE' OR
   v->>'ownerId'<>owner_id::text OR
   v->>'sourceEnvironment'<>'live' OR
   (v->>'merchantGeneration')::bigint<>1 OR
   (v->>'amountMinor')::integer<>299
 THEN RAISE EXCEPTION 'Recorded sale read failed'; END IF;
 v:=public.pazo_f16_live_service_recorded_sale_read(
  '33333333-3333-4333-8333-333333333333',intent_id,sub_id,1,'SALE-OWNER-ONE');
 IF v IS NOT NULL THEN RAISE EXCEPTION 'Other owner read the sale'; END IF;
 v:=public.pazo_f16_live_service_recorded_sale_read(
  owner_id,intent_id,sub_id,2,'SALE-OWNER-ONE');
 IF v IS NOT NULL THEN RAISE EXCEPTION 'Other merchant generation read the sale'; END IF;
 v:=public.pazo_f16_live_service_recorded_sale_read(
  owner_id,intent_id,sub_id,1,'SALE-FAKE-ONE');
 IF v IS NOT NULL THEN RAISE EXCEPTION 'Unrecorded sale accepted'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claims','',true);
 IF (SELECT count(*) FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox'
    AND NOT live_enabled AND kill_switch
    AND active_generation IS NULL)<>1
 THEN RAISE EXCEPTION 'Live gate changed'; END IF;
 RAISE NOTICE 'F16_RECORDED_SALE_READ_PG17_PASS';
END $verify$;

BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $service$
DECLARE v jsonb;
BEGIN
 v:=public.pazo_f16_live_service_recorded_sale_read(
  '12345678-1234-4234-8234-123456789abc',
  'intent-12345678-1234-4234-8234-123456789abc',
  'I-LIVE-SYNTHETIC1234',1,'SALE-OWNER-ONE');
 IF v->>'recorded' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'Actual service role cannot read correlated original sale'; END IF;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_recorded_sale_read(
   NULL,NULL,NULL,NULL,NULL);
  RAISE EXCEPTION 'Legacy role bypassed JSON claim guard';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $service$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $anon$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_recorded_sale_read(NULL,NULL,NULL,NULL,NULL);
  RAISE EXCEPTION 'Anon acquired original sale read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $anon$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $authenticated$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_recorded_sale_read(NULL,NULL,NULL,NULL,NULL);
  RAISE EXCEPTION 'Authenticated acquired original sale read';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $authenticated$;
ROLLBACK;
