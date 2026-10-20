-- Isolated PostgreSQL 17 F16 origin routing rehearsal. Never hosted outside migration.
DO $protect$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'Disposable PG17 only' USING ERRCODE='42501'; END IF;
END $protect$;
CREATE TABLE IF NOT EXISTS admin_private.paypal_gateway_settings(
 environment text PRIMARY KEY,plan_id text NOT NULL,webhook_id text NOT NULL,
 return_origin text NOT NULL
);
INSERT INTO admin_private.paypal_gateway_settings(environment,plan_id,webhook_id,return_origin)
 VALUES('live','P-ABCDEFGHIJKLMN','WH-12345678900','https://pazo-app-t83r.vercel.app')
 ON CONFLICT (environment) DO UPDATE
 SET plan_id=excluded.plan_id,webhook_id=excluded.webhook_id,
  return_origin=excluded.return_origin;
-- The earlier CAS rehearsal may leave the disposable selector in Live.
-- Return ONLY the throwaway DB to the documented hosted OFF baseline.
UPDATE admin_private.pazo_paypal_new_checkout_switch
 SET environment='sandbox',live_enabled=false,kill_switch=true,active_generation=NULL
 WHERE singleton;
\i supabase/migrations/20261020142448_pazo_f16_admin_owned_live_return_origin.sql
DO $audit$
DECLARE result jsonb;
BEGIN
 PERFORM pg_catalog.set_config('request.jwt.claim.role','service_role',true);
 result:=public.pazo_f16_live_service_active_route();
 IF result IS NOT NULL
 THEN RAISE EXCEPTION 'OFF switch exposed merchant origin'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_active_route();
  RAISE EXCEPTION 'Missing service grant bypassed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT pg_catalog.pg_get_functiondef(
  'public.pazo_f16_live_service_active_route()'::pg_catalog.regprocedure)
   LIKE '%returnOrigin%'
 THEN RAISE EXCEPTION 'No admin owned origin in active route'; END IF;
 RAISE NOTICE 'F16_ADMIN_ORIGIN_DISPOSABLE_PG17_PASS';
END $audit$;
