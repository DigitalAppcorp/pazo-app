-- Disposable DB only; no external HTTP or real provider/Vault credentials.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
-- Emulate hosted PUBLIC queue grants. The fix MUST NOT assume a successful
-- REVOKE on extension-owned tables. The synthetic rows never leave this DB.
GRANT USAGE ON SCHEMA net TO PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON net.synthetic_requests TO PUBLIC;
CREATE TABLE net.http_request_queue(id bigint);
\i supabase/migrations/20261021154316_pazo_f16_live_worker_single_use_dispatch.sql
BEGIN;
DO $dispatch$
DECLARE req bigint; token text; old_token text; admitted jsonb; batch uuid;
BEGIN
 IF has_function_privilege('authenticated','public.pazo_f16_live_service_worker_admit(text)','EXECUTE')
  OR has_function_privilege('service_role','supporter_private.pazo_live_worker_tick()','EXECUTE')
  OR supporter_private.pazo_live_worker_tick() IS NOT NULL
 THEN RAISE EXCEPTION 'dispatch ACL or disabled bypass'; END IF;
 SELECT decrypted_secret INTO old_token FROM vault.decrypted_secrets
 WHERE id=(SELECT invoker_vault_id FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton);
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 IF public.pazo_f16_live_service_worker_admit(old_token) IS NOT NULL
 THEN RAISE EXCEPTION 'retired reusable invoker accepted'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true WHERE singleton;
 req:=supporter_private.pazo_live_worker_tick();
 SELECT substr(headers->>'Authorization',8) INTO token FROM net.synthetic_requests WHERE id=req;
 IF token IS NULL OR token=old_token OR token !~ '^[a-f0-9]{64}$'
  OR supporter_private.pazo_live_worker_tick() IS NOT NULL
 THEN RAISE EXCEPTION 'fresh bounded dispatch not issued'; END IF;
 IF public.pazo_f16_live_service_worker_admit(repeat('0',64)) IS NOT NULL
  OR (SELECT dispatch_sha256 IS NULL FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton)
 THEN RAISE EXCEPTION 'wrong nonce consumed valid dispatch'; END IF;
 admitted:=public.pazo_f16_live_service_worker_admit(token);
 batch:=(admitted->>'leaseToken')::uuid;
 IF batch IS NULL OR admitted->>'processingAllowed'<>'false' OR admitted->'event'<>'null'::jsonb
  OR public.pazo_f16_live_service_worker_admit(token) IS NOT NULL
  OR NOT (SELECT dispatch_sha256 IS NULL AND dispatch_expires_at IS NULL
    FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton)
 THEN RAISE EXCEPTION 'one use admission replay or financial dispatch'; END IF;
 IF NOT public.pazo_f16_live_service_worker_complete(batch,'idle','worker_idle','pazo_live_worker_v1')
 THEN RAISE EXCEPTION 'health completion failed'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=clock_timestamp()-interval '3 minutes' WHERE singleton;
 req:=supporter_private.pazo_live_worker_tick();
 SELECT substr(headers->>'Authorization',8) INTO token FROM net.synthetic_requests WHERE id=req;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET dispatch_expires_at=clock_timestamp()-interval '1 second' WHERE singleton;
 IF public.pazo_f16_live_service_worker_admit(token) IS NOT NULL
 THEN RAISE EXCEPTION 'expired dispatch accepted'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=clock_timestamp()-interval '3 minutes' WHERE singleton;
 req:=supporter_private.pazo_live_worker_tick();
 SELECT substr(headers->>'Authorization',8) INTO old_token FROM net.synthetic_requests WHERE id=req;
 IF old_token=token OR public.pazo_f16_live_service_worker_admit(token) IS NOT NULL
  OR public.pazo_f16_live_service_worker_admit(old_token)->>'authenticated'<>'true'
 THEN RAISE EXCEPTION 'expired queued nonce reused after recovery'; END IF;
 RAISE NOTICE 'F16_SINGLE_USE_DISPATCH_PG17_PASS_NO_NETWORK';
END $dispatch$;
ROLLBACK;
-- All test activity rolled back; product control remains disabled/empty.
\i supabase/rollbacks/f16_live_worker_single_use_dispatch_DISABLE_ONLY.sql
DO $disabled$ BEGIN
 IF supporter_private.pazo_live_worker_tick() IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
    WHERE singleton AND NOT enabled AND NOT processing_enabled AND dispatch_sha256 IS NULL)
 THEN RAISE EXCEPTION 'dispatch operational rollback not fail closed'; END IF;
 RAISE NOTICE 'F16_SINGLE_USE_DISPATCH_DISABLE_ROLLBACK_PASS';
END $disabled$;
