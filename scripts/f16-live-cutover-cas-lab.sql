-- F16 LIVE gate CAS + rollback rehearsal in disposable DB only.
-- admin_grants prepared by the staging fixture
INSERT INTO admin_private.admin_grants(user_id)
 VALUES('12345678-1234-4234-8234-123456789abc')
 ON CONFLICT DO NOTHING;
-- private cutover functions installed by the staging migration
INSERT INTO admin_private.pazo_paypal_release_evidence(
 proof_id,actor_id,merchant_generation,evidence_sha256,
 all_checks_verified,checked_at,expires_at
) VALUES(
 '55555555-5555-4555-8555-555555555555',
 '12345678-1234-4234-8234-123456789abc',
 1,repeat('e',64),true,
 pg_catalog.clock_timestamp()-interval '30 seconds',
 pg_catalog.clock_timestamp()+interval '3 minutes'
);
-- Original draft cannot flip LIVE even with a signed proof and SQL postgres.
DO $latch$
DECLARE result text;
BEGIN
 result:=admin_private.pazo_paypal_switch_live_atomically(
  '12345678-1234-4234-8234-123456789abc',0,1,
  '55555555-5555-4555-8555-555555555555',repeat('e',64));
 IF result<>'blocked_schema_latch'
 THEN RAISE EXCEPTION 'Unreleased schema allowed Live activation: %',result; END IF;
 IF EXISTS(SELECT 1 FROM admin_private.pazo_paypal_switch_audit)
 THEN RAISE EXCEPTION 'Blocked activation emitted false audit'; END IF;
END $latch$;
-- Simulate the future separately authorized RELEASE migration in disposable
-- PostgreSQL ONLY, to test transaction logic. DO NOT copy these ALTERs into
-- PAZO without an entirely separate reviewed PO gate and merchant proof.
ALTER TABLE admin_private.pazo_paypal_new_checkout_switch
 DROP CONSTRAINT pazo_paypal_new_checkout_switch_environment_check,
 DROP CONSTRAINT pazo_paypal_new_checkout_switch_live_enabled_check,
 DROP CONSTRAINT pazo_paypal_new_checkout_switch_kill_switch_check,
 DROP CONSTRAINT pazo_paypal_off_switch_generation;
DO $activate$
DECLARE result text;
BEGIN
 result:=admin_private.pazo_paypal_switch_live_atomically(
  '33333333-3333-4333-8333-333333333333',0,1,
  '55555555-5555-4555-8555-555555555555',repeat('e',64));
 IF result<>'unauthorized_or_invalid' THEN
  RAISE EXCEPTION 'Non-admin can switch Live'; END IF;
 result:=admin_private.pazo_paypal_switch_live_atomically(
  '12345678-1234-4234-8234-123456789abc',0,1,
  '55555555-5555-4555-8555-555555555555',repeat('e',64));
 IF result<>'switched' THEN RAISE EXCEPTION 'CAS failed %',result; END IF;
 result:=admin_private.pazo_paypal_switch_live_atomically(
  '12345678-1234-4234-8234-123456789abc',0,1,
  '55555555-5555-4555-8555-555555555555',repeat('e',64));
 IF result NOT IN('proof_unavailable','stale_runtime_revision')
 THEN RAISE EXCEPTION 'Replay incorrectly accepted %',result; END IF;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_switch_audit)<>1
 THEN RAISE EXCEPTION 'Activation audit cardinality incorrect'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE environment='live' AND live_enabled AND NOT kill_switch
   AND revision=1 AND active_generation=1)
 THEN RAISE EXCEPTION 'Live CAS did not commit'; END IF;
END $activate$;
DO $stop$
DECLARE result text;
BEGIN
 result:=admin_private.pazo_paypal_stop_new_checkout_atomically(
  '12345678-1234-4234-8234-123456789abc',1,repeat('f',64));
 IF result<>'stopped' THEN RAISE EXCEPTION 'Emergency pause failed %',result; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE environment='live' AND NOT live_enabled AND kill_switch
   AND active_generation=1 AND revision=2)
 THEN RAISE EXCEPTION 'Stopping new checkout redirected merchant or erased binding'; END IF;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_switch_audit)<>2
 THEN RAISE EXCEPTION 'Pause audit cardinality incorrect'; END IF;
 result:=admin_private.pazo_paypal_stop_new_checkout_atomically(
  '12345678-1234-4234-8234-123456789abc',1,repeat('f',64));
 IF result<>'stale_runtime_revision'
 THEN RAISE EXCEPTION 'Stale emergency stop was not blocked'; END IF;
 RAISE NOTICE 'PAZO_LIVE_CAS_AND_EMERGENCY_STOP_DISPOSABLE_PG17_PASS';
END $stop$;
