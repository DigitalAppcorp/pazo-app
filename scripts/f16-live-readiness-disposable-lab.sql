DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021192951_pazo_f16_live_cancel_finish.sql
-- Extend the existing minimal synthetic admin settings to the two hosted UUID columns.
ALTER TABLE admin_private.paypal_gateway_settings ADD COLUMN client_id_vault uuid,ADD COLUMN client_secret_vault uuid;
\i supabase/migrations/20261021223000_pazo_f16_live_admin_readiness.sql
BEGIN;
INSERT INTO auth.users(id,email_confirmed_at) VALUES('a8456789-1234-4234-8234-123456789abc',clock_timestamp());
INSERT INTO admin_private.admin_grants(user_id) VALUES('a8456789-1234-4234-8234-123456789abc');
DO $readiness$
DECLARE actor uuid:='a8456789-1234-4234-8234-123456789abc'; value jsonb;
 id_key uuid:=gen_random_uuid(); secret_key uuid:=gen_random_uuid();
BEGIN
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN
  PERFORM public.pazo_admin_live_readiness();RAISE EXCEPTION 'anonymous snapshot allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','b8456789-1234-4234-8234-123456789abc',true);
 BEGIN
  PERFORM public.pazo_admin_live_readiness();RAISE EXCEPTION 'nonadmin snapshot allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',actor::text,true);
 value:=public.pazo_admin_live_readiness();
 IF value->>'mayActivate'<>'false' OR value->>'mayCharge'<>'false'
  OR value->>'phase'<>'engineering_pending'
  OR value->'checks'->>'credentialsStored'<>'false'
  OR value->'checks'->>'ownerRecoverySchemaReady'<>'true'
  OR value->'checks'->>'benefitsSchemaReady'<>'true'
  OR value->'checks'->>'financeSchemaReady'<>'true'
 THEN RAISE EXCEPTION 'staged readiness misreported %',value; END IF;
 INSERT INTO admin_private.pazo_paypal_merchant_generations(environment,merchant_fingerprint_sha256,
  plan_id,webhook_id,credential_source,client_id_vault,client_secret_vault)
 VALUES('live',repeat('e',64),'P-READINESSLAB1234','WH-READINESSLAB1234','vault',id_key,secret_key);
 UPDATE admin_private.paypal_gateway_settings SET plan_id='P-READINESSLAB1234',
  webhook_id='WH-READINESSLAB1234',client_id_vault=id_key,client_secret_vault=secret_key,
  validation_status='valid',validated_at=clock_timestamp() WHERE environment='live';
 UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true,last_heartbeat_at=clock_timestamp() WHERE singleton;
 value:=public.pazo_admin_live_readiness();
 IF value->'checks'->>'credentialsStored'<>'true' OR value->'checks'->>'providerResourcesVerified'<>'true'
  OR value->'checks'->>'workerHealthy'<>'true' OR value->'checks'->>'releaseControlsReady'<>'false'
  OR value->>'phase'<>'engineering_pending' OR value->>'mayActivate'<>'false'
 THEN RAISE EXCEPTION 'stored keys bypassed release preparation %',value; END IF;
 IF value::text LIKE '%'||id_key::text||'%' OR value::text LIKE '%'||actor::text||'%'
  OR value::text LIKE '%P-READINESS%' OR value::text LIKE '%WH-READINESS%'
 THEN RAISE EXCEPTION 'readiness leaked private identifiers'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_heartbeat_at=clock_timestamp()-interval '10 minutes' WHERE singleton;
 value:=public.pazo_admin_live_readiness();
 IF value->'checks'->>'workerHealthy'<>'false' OR NOT(value->'blockers' ? 'private_worker_unavailable')
 THEN RAISE EXCEPTION 'stale worker appeared ready'; END IF;
 DELETE FROM admin_private.admin_grants WHERE user_id=actor;
 BEGIN
  PERFORM public.pazo_admin_live_readiness();RAISE EXCEPTION 'revoked admin snapshot allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('anon','public.pazo_admin_live_readiness()','EXECUTE')
  OR has_function_privilege('service_role','public.pazo_admin_live_readiness()','EXECUTE')
  OR NOT has_function_privilege('authenticated','public.pazo_admin_live_readiness()','EXECUTE')
 THEN RAISE EXCEPTION 'readiness ACL incorrect'; END IF;
 RAISE NOTICE 'PAZO_LIVE_READINESS_NO_SECRET_NO_ACTIVATION_ADMIN_REVOCATION_PG17_PASS';
END $readiness$;
ROLLBACK;
\i supabase/rollbacks/20261021223000_pazo_f16_live_admin_readiness.sql
\i supabase/migrations/20261021223000_pazo_f16_live_admin_readiness.sql
