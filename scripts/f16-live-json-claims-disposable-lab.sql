-- Regression of hosted 503: real old SQL + modern PostgREST claims, PG17 only.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY' USING ERRCODE='42501'; END IF;
END $guard$;
-- Pin actual hosted function source rather than a mocked authorization response.
\i supabase/tests/supporter/fixtures/f16-live-service-hosted-legacy-guards.sql
UPDATE admin_private.paypal_gateway_settings SET plan_id='P-JSONCLAIMSTEST1234'
 WHERE environment='live';
DO $baseline$
DECLARE n bigint;
BEGIN
 SELECT count(*) INTO n FROM admin_private.pazo_paypal_live_bootstrap_reservations;
 PERFORM set_config('request.jwt.claim.role','',true);
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_reserve(
   '12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Original hosted bug was not reproduced';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_live_bootstrap_reservations)<>n
 THEN RAISE EXCEPTION 'Denied baseline made a reservation'; END IF;
 RAISE NOTICE 'F16_JSON_CLAIMS_ORIGINAL_42501_REPRODUCED';
END $baseline$;

\i supabase/migrations/20261021010702_pazo_f16_live_service_json_claims_guard.sql
BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','',true),
 set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $positive$
DECLARE first_result jsonb; replay jsonb;
BEGIN
 first_result:=public.pazo_f16_live_service_bootstrap_reserve(
  '12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
 IF first_result->>'reserved' IS DISTINCT FROM 'true'
  OR first_result->>'mayCharge' IS DISTINCT FROM 'false'
 THEN RAISE EXCEPTION 'Modern claims cannot reserve'; END IF;
 replay:=public.pazo_f16_live_service_bootstrap_reserve(
  '12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
 IF replay->>'replayed' IS DISTINCT FROM 'true'
  OR replay->>'generation' IS DISTINCT FROM first_result->>'generation'
 THEN RAISE EXCEPTION 'Replay consumed a new generation'; END IF;
 IF public.pazo_f16_live_service_active_route() IS NOT NULL
 THEN RAISE EXCEPTION 'OFF route became available'; END IF;
 IF public.pazo_f16_live_service_provision_generation_read(
  '12345678-1234-4234-8234-123456789abc',9999) IS NOT NULL
 THEN RAISE EXCEPTION 'Unknown merchant appeared'; END IF;
 IF public.pazo_f16_live_service_inbox_claim(9999,'WH-UNKNOWN-JSON') IS NOT NULL
 THEN RAISE EXCEPTION 'Missing event claimed'; END IF;
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_reserve(
   '23456789-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Foreign administrator recovered reservation';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'F16_JSON_CLAIMS_SERVICE_ROLE_RESERVE_REPLAY_OFF_GATES_PASS';
END $positive$;
COMMIT;

-- A privileged DB function owner is not a substitute for signed service claims.
-- Legacy-only service claims and user_metadata cannot authorize the new guards.
BEGIN;
SET LOCAL ROLE service_role;
DO $negative$
DECLARE claims text;
BEGIN
 FOREACH claims IN ARRAY ARRAY['','{}','null','{"role":"anon"}',
  '{"role":"authenticated"}',
  '{"role":"authenticated","user_metadata":{"role":"service_role"}}']
 LOOP
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  PERFORM set_config('request.jwt.claims',claims,true);
  BEGIN
   PERFORM public.pazo_f16_live_service_bootstrap_reserve(
    '12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
   RAISE EXCEPTION 'Untrusted/missing modern role accepted: %',claims;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.pazo_f16_live_service_active_route();
   RAISE EXCEPTION 'Untrusted claims read active route';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
 RAISE NOTICE 'F16_JSON_CLAIMS_NO_LEGACY_OR_METADATA_BYPASS_PASS';
END $negative$;
COMMIT;
BEGIN;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $anon$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_reserve(
   '12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Anon EXECUTE unexpectedly granted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $anon$;
ROLLBACK;
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $authenticated$ BEGIN
 BEGIN
  PERFORM public.pazo_f16_live_service_bootstrap_reserve(
   '12345678-1234-4234-8234-123456789abc','P-JSONCLAIMSTEST1234');
  RAISE EXCEPTION 'Authenticated EXECUTE unexpectedly granted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $authenticated$;
ROLLBACK;

DO $state$ BEGIN
 IF (SELECT count(*) FROM admin_private.pazo_paypal_live_bootstrap_reservations
  WHERE plan_id='P-JSONCLAIMSTEST1234')<>1
 THEN RAISE EXCEPTION 'Reservation not unique'; END IF;
 IF EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE environment<>'sandbox' OR live_enabled OR NOT kill_switch
   OR active_generation IS NOT NULL)
 THEN RAISE EXCEPTION 'Financial release state changed'; END IF;
 RAISE NOTICE 'F16_JSON_CLAIMS_ACL_IDEMPOTENCY_AND_OFF_STATE_PASS';
END $state$;

-- Rehearse the separately guarded rollback, then re-apply and assert no rows lost.
\i supabase/rollbacks/f16_live_service_json_claims_guard_REVIEW_REQUIRED.sql
\i supabase/migrations/20261021010702_pazo_f16_live_service_json_claims_guard.sql
DO $reapply$ BEGIN
 IF (SELECT count(*) FROM admin_private.pazo_paypal_live_bootstrap_reservations
  WHERE plan_id='P-JSONCLAIMSTEST1234')<>1
 THEN RAISE EXCEPTION 'Rollback/reapply changed business data'; END IF;
 RAISE NOTICE 'F16_JSON_CLAIMS_ROLLBACK_REAPPLY_PG17_PASS_NO_HOSTED_WRITE';
END $reapply$;
