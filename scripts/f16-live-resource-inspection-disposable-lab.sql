-- Run only after the full Live Gateway fixture, never against hosted data.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY' USING ERRCODE='42501'; END IF;
END $guard$;
-- Extend the deliberately minimal admin fixture to the actual hosted columns.
ALTER TABLE admin_private.paypal_gateway_settings
 ADD COLUMN price_minor integer NOT NULL DEFAULT 299,
 ADD COLUMN currency text NOT NULL DEFAULT 'USD',
 ADD COLUMN interval_unit text NOT NULL DEFAULT 'MONTH',
 ADD COLUMN validation_status text NOT NULL DEFAULT 'not_verified',
 ADD COLUMN validated_at timestamptz,
 ADD COLUMN updated_at timestamptz,
 ADD COLUMN updated_by uuid;
CREATE TABLE admin_private.paypal_gateway_change_log(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 environment text NOT NULL,actor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('draft','credentials','validation')),
 recorded_at timestamptz NOT NULL DEFAULT now(),details jsonb NOT NULL DEFAULT '{}'::jsonb);
ALTER TABLE admin_private.paypal_gateway_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_private.paypal_gateway_change_log FROM PUBLIC,anon,authenticated,service_role;
UPDATE admin_private.paypal_gateway_settings SET webhook_id='',
 return_origin='https://pazo-app-t83r.vercel.app' WHERE environment='live';
\i supabase/migrations/20261021015708_pazo_f16_live_resource_inspection.sql
BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $positive$
DECLARE v jsonb; g bigint;
BEGIN
 v:=public.pazo_f16_live_service_bootstrap_read('12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
 IF v IS NULL OR v->>'state'<>'reserved' OR v->>'mayCharge'<>'false'
 THEN RAISE EXCEPTION 'Reserved generation was not read'; END IF;
 g:=(v->>'generation')::bigint;
 IF public.pazo_f16_live_service_bootstrap_record_resources(
  '12345678-1234-4234-8234-123456789abc',g+1,'P-JSONCLAIMSTEST1234','WH-INSPECTIONTEST')
 THEN RAISE EXCEPTION 'Wrong generation recorded'; END IF;
 IF NOT public.pazo_f16_live_service_bootstrap_record_resources(
  '12345678-1234-4234-8234-123456789abc',g,'P-JSONCLAIMSTEST1234','WH-INSPECTIONTEST')
 THEN RAISE EXCEPTION 'Verified resource metadata not recorded'; END IF;
 IF NOT public.pazo_f16_live_service_bootstrap_record_resources(
  '12345678-1234-4234-8234-123456789abc',g,'P-JSONCLAIMSTEST1234','WH-INSPECTIONTEST')
 THEN RAISE EXCEPTION 'Idempotent metadata recovery failed'; END IF;
 IF public.pazo_f16_live_service_bootstrap_record_resources(
  '12345678-1234-4234-8234-123456789abc',g,'P-JSONCLAIMSTEST1234','WH-ANOTHER-WEBHOOK')
 THEN RAISE EXCEPTION 'Existing webhook was overwritten'; END IF;
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_read('23456789-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Non-admin read another reservation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated","user_metadata":{"role":"service_role"}}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_read('12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Untrusted claims accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $positive$;
COMMIT;
DO $postflight$ BEGIN
 IF (SELECT count(*) FROM admin_private.paypal_gateway_change_log)<>1
  OR (SELECT validation_status FROM admin_private.paypal_gateway_settings WHERE environment='live')<>'not_verified'
  OR EXISTS (SELECT 1 FROM admin_private.pazo_paypal_live_bootstrap_reservations
   WHERE plan_id='P-JSONCLAIMSTEST1234' AND state<>'reserved')
 THEN RAISE EXCEPTION 'False readiness, duplicate audit or merchant finalization'; END IF;
 IF NOT EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'Inspection changed financial release'; END IF;
END $postflight$;
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $deny$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_read('12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Anon EXECUTE granted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $deny$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_record_resources('12345678-1234-4234-8234-123456789abc',1,'P-JSONCLAIMSTEST1234','WH-INSPECTIONTEST');
  RAISE EXCEPTION 'Authenticated EXECUTE granted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $deny$;
ROLLBACK;
BEGIN;
UPDATE admin_private.pazo_paypal_new_checkout_switch SET kill_switch=false WHERE singleton;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $deny$ BEGIN
 IF public.pazo_f16_live_service_bootstrap_read('12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234') IS NOT NULL
 THEN RAISE EXCEPTION 'Non-locked selector accepted'; END IF;
END $deny$;
ROLLBACK;
\i supabase/rollbacks/f16_live_resource_inspection_REVIEW_REQUIRED.sql
\i supabase/migrations/20261021015708_pazo_f16_live_resource_inspection.sql
DO $final$ BEGIN
 IF (SELECT count(*) FROM admin_private.paypal_gateway_change_log)<>1
 THEN RAISE EXCEPTION 'Rollback lost audit'; END IF;
 RAISE NOTICE 'F16_RESOURCE_INSPECTION_SERVICE_ACL_METADATA_IDEMPOTENCY_OFF_ROLLBACK_PASS';
END $final$;
