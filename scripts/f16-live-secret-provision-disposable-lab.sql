-- F16 secret-reservation lab: disposable PostgreSQL only, no hosted apply.
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;
\i supabase/migrations/20261020200238_pazo_f16_secret_provision_audit_guarded.sql
INSERT INTO admin_private.admin_grants(user_id)
 VALUES ('12345678-1234-4234-8234-123456789abc') ON CONFLICT DO NOTHING;
INSERT INTO admin_private.pazo_paypal_merchant_generations(
 environment,merchant_fingerprint_sha256,plan_id,webhook_id,credential_source,
 client_id_vault,client_secret_vault
) VALUES ('live',repeat('e',64),'P-TESTPLAN1234567890','WH-TEST-HOOK-123456','edge_secrets',NULL,NULL)
ON CONFLICT (environment,merchant_fingerprint_sha256,plan_id,webhook_id) DO NOTHING;
DO $verify$
DECLARE
 g bigint; actor uuid='12345678-1234-4234-8234-123456789abc';
 revision bigint; first jsonb; again jsonb; attempt uuid; v jsonb;
BEGIN
 SELECT generation INTO STRICT g FROM admin_private.pazo_paypal_merchant_generations
 WHERE merchant_fingerprint_sha256=repeat('e',64)
  AND plan_id='P-TESTPLAN1234567890' AND webhook_id='WH-TEST-HOOK-123456';
 SELECT s.revision INTO STRICT revision FROM admin_private.pazo_paypal_new_checkout_switch s
 WHERE singleton;
 BEGIN
  PERFORM public.pazo_f16_live_service_provision_generation_read(actor,g);
  RAISE EXCEPTION 'Unprivileged read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','service_role',true);
 v:=public.pazo_f16_live_service_provision_generation_read(actor,g);
 IF v->>'planId'<>'P-TESTPLAN1234567890' OR v->>'credentialSource'<>'edge_secrets'
 THEN RAISE EXCEPTION 'Admin metadata mismatch %',v; END IF;
 BEGIN
  PERFORM public.pazo_f16_live_service_provision_generation_read(
   '11111111-1111-4111-8111-111111111111',g);
  RAISE EXCEPTION 'Unauthorized admin read permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 first:=public.pazo_f16_live_service_provision_reserve(
  actor,g,revision,'P-TESTPLAN1234567890','WH-TEST-HOOK-123456',repeat('e',64));
 IF first->>'reserved'<>'true' THEN RAISE EXCEPTION 'Reservation failed: %',first; END IF;
 again:=public.pazo_f16_live_service_provision_reserve(
  actor,g,revision,'P-TESTPLAN1234567890','WH-TEST-HOOK-123456',repeat('e',64));
 IF again->>'reserved'<>'false' THEN RAISE EXCEPTION 'Duplicate reservation succeeded'; END IF;
 attempt:=(first->>'attemptId')::uuid;
 IF public.pazo_f16_live_service_provision_finish(actor,g,attempt,'invalid_result')
 THEN RAISE EXCEPTION 'Invalid audit accepted'; END IF;
 IF NOT public.pazo_f16_live_service_provision_finish(
  actor,g,attempt,'secret_write_outcome_unknown_manual_review')
 THEN RAISE EXCEPTION 'Audit could not persist uncertain outcome'; END IF;
 IF public.pazo_f16_live_service_provision_finish(
  actor,g,attempt,'generation_secret_names_confirmed')
 THEN RAISE EXCEPTION 'Audit state was overwritten'; END IF;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_secret_provision_attempts
   WHERE merchant_generation=g AND state='review_required' AND
    result_code='secret_write_outcome_unknown_manual_review' AND completed_at IS NOT NULL)<>1
 THEN RAISE EXCEPTION 'Durable audit state missing'; END IF;
 PERFORM pg_catalog.set_config('request.jwt.claim.role','',true);
 IF pg_catalog.has_table_privilege('service_role',
  'admin_private.pazo_paypal_secret_provision_attempts','SELECT') OR
  pg_catalog.has_table_privilege('anon',
  'admin_private.pazo_paypal_secret_provision_attempts','SELECT') OR
  pg_catalog.has_table_privilege('authenticated',
  'admin_private.pazo_paypal_secret_provision_attempts','INSERT')
 THEN RAISE EXCEPTION 'Table ACL leaked'; END IF;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_new_checkout_switch s
 WHERE s.environment='sandbox' AND NOT s.live_enabled AND s.kill_switch
  AND s.active_generation IS NULL)<>1
 THEN RAISE EXCEPTION 'Live gate changed during secret lab'; END IF;
 RAISE NOTICE 'F16_SECRET_PROVISION_DURABLE_RESERVATION_PG17_PASS';
END $verify$;


-- Historical audit cannot be erased or block revocation of admin grants.
-- Restore the synthetic grant to preserve subsequent disposable tests.
DO $revocation$
DECLARE actor uuid='12345678-1234-4234-8234-123456789abc';
       proof_count integer;
       func text;
BEGIN
 SELECT pg_catalog.pg_get_functiondef('public.pazo_f16_live_service_provision_reserve(uuid,bigint,bigint,text,text,text)'::regprocedure)
 INTO func;
 IF func NOT LIKE '%FOR UPDATE%' THEN
  RAISE EXCEPTION 'Switch/merchant reservation lacks row locks'; END IF;
 SELECT count(*) INTO proof_count
 FROM admin_private.pazo_paypal_secret_provision_attempts
 WHERE actor_id=actor AND result_code='secret_write_outcome_unknown_manual_review';
 IF proof_count<>1 THEN RAISE EXCEPTION 'Expected immutable audit missing'; END IF;
 DELETE FROM admin_private.admin_grants WHERE user_id=actor;
 IF (SELECT count(*) FROM admin_private.pazo_paypal_secret_provision_attempts
     WHERE actor_id=actor AND result_code='secret_write_outcome_unknown_manual_review')<>1
 THEN RAISE EXCEPTION 'Revoking admin destroyed audited evidence'; END IF;
 INSERT INTO admin_private.admin_grants(user_id) VALUES(actor)
 ON CONFLICT DO NOTHING;
 RAISE NOTICE 'F16_SECRET_AUDIT_REVOCATION_AND_LOCK_GATES_PASS';
END $revocation$;
