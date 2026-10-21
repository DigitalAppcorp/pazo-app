-- No network/cron or real Vault. This fake adapter exists ONLY in this local DB.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
DELETE FROM supporter_private.pazo_paypal_live_event_inbox;
CREATE TABLE vault.secrets(id uuid PRIMARY KEY);
CREATE FUNCTION vault.create_secret(secret text,name text DEFAULT NULL,description text DEFAULT '',key_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fake$
DECLARE id uuid=pg_catalog.gen_random_uuid();
BEGIN
 IF current_database()<>'f14_synthetic' THEN RAISE EXCEPTION 'DISPOSABLE ONLY'; END IF;
 INSERT INTO vault.secrets VALUES(id);
 INSERT INTO vault.decrypted_secrets VALUES(id,secret);
 RETURN id;
END $fake$;
REVOKE ALL ON FUNCTION vault.create_secret(text,text,text,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION vault.synthetic_secret_delete() RETURNS trigger LANGUAGE plpgsql AS $fake$
BEGIN DELETE FROM vault.decrypted_secrets WHERE id=OLD.id; RETURN OLD; END $fake$;
CREATE TRIGGER synthetic_secret_delete AFTER DELETE ON vault.secrets
 FOR EACH ROW EXECUTE FUNCTION vault.synthetic_secret_delete();
\i supabase/migrations/20261021144809_pazo_f16_live_private_worker_control.sql
BEGIN;
DO $acl$
DECLARE token text;
BEGIN
 IF has_table_privilege('service_role','supporter_private.pazo_paypal_live_worker_control','SELECT')
  OR has_function_privilege('anon','public.pazo_f16_live_service_worker_admit(text)','EXECUTE')
  OR has_function_privilege('authenticated','public.pazo_f16_live_service_worker_health_read()','EXECUTE')
  OR has_function_privilege('service_role','public.pazo_f16_live_service_inbox_claim(bigint,text)','EXECUTE')
  OR has_function_privilege('service_role','public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'worker control ACL bypass'; END IF;
 SELECT v.decrypted_secret INTO token FROM vault.decrypted_secrets v
 JOIN supporter_private.pazo_paypal_live_worker_control c ON c.invoker_vault_id=v.id WHERE c.singleton;
 IF token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'private technical invoker missing'; END IF;
 -- Synthetic token stays only in this throwaway session, never SELECT output.
 PERFORM set_config('pazo.synthetic_worker_invoker',token,true);
END $acl$;
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
 intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,
 affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state)
SELECT 'intent-abcdefab-1234-4234-8234-123456789abc','abcdefab-1234-4234-8234-123456789abc',
 'abcdefab-2222-4222-8222-123456789abc',generation,plan_id,'es','pazo-supporter-live.test',
 repeat('b',64),true,'2026-10-01T00:00:00Z','2026-10-01T00:01:00Z','I-WORKER-CONTROL-TEST','bound'
 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1 AND environment='live';
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $disabled$
DECLARE admitted jsonb; evidence jsonb;
BEGIN
 evidence:=jsonb_build_object('proofSource','paypal_live_postback_success','signedBodySha256',repeat('a',64),
  'webhookId','WH-12345678900','subscriptionId','I-WORKER-CONTROL-TEST','subjectId','SALE-WORKER-CONTROL',
  'providerEventAt','2026-10-01T00:05:00.000Z','subjectAt','2026-10-01T00:04:00.000Z',
  'activationAt',NULL,'nextBillingAt',NULL);
 PERFORM public.pazo_f16_live_service_signed_event_queue('abcdefab-1234-4234-8234-123456789abc',
  'intent-abcdefab-1234-4234-8234-123456789abc','I-WORKER-CONTROL-TEST',1,'WH-WORKER-CONTROL','PAYMENT.SALE.COMPLETED',evidence);
 admitted:=public.pazo_f16_live_service_worker_admit(current_setting('pazo.synthetic_worker_invoker'));
 IF admitted->>'authenticated'<>'true' OR admitted->>'enabled'<>'false'
  OR public.pazo_f16_live_service_worker_claim(1,'WH-WORKER-CONTROL') IS NOT NULL
  OR public.pazo_f16_live_service_worker_admit(repeat('0',64)) IS NOT NULL
 THEN RAISE EXCEPTION 'disabled worker or wrong invoker bypass'; END IF;
END $disabled$;
RESET ROLE;
UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true WHERE singleton;
SET LOCAL ROLE service_role;
DO $health$
DECLARE admitted jsonb; token uuid; h jsonb;
BEGIN
 admitted:=public.pazo_f16_live_service_worker_admit(current_setting('pazo.synthetic_worker_invoker'));
 token:=(admitted->>'leaseToken')::uuid;
 IF token IS NULL OR admitted->>'processingAllowed'<>'false' OR admitted->'event'<>'null'::jsonb
  OR public.pazo_f16_live_service_worker_claim(1,'WH-WORKER-CONTROL') IS NOT NULL
 THEN RAISE EXCEPTION 'health-only batch started financial processing'; END IF;
 IF public.pazo_f16_live_service_worker_complete(token,'idle','worker_idle','wrong_build')
 THEN RAISE EXCEPTION 'unreviewed worker build reported healthy'; END IF;
 IF NOT public.pazo_f16_live_service_worker_complete(token,'idle','worker_idle','pazo_live_worker_v1')
 THEN RAISE EXCEPTION 'private health batch not committed'; END IF;
 h:=public.pazo_f16_live_service_worker_health_read();
 IF h->>'healthy'<>'true' OR h->>'processedEvents'<>'0'
  OR h ? 'invoker_sha256' OR h ? 'invoker_vault_id' OR h ? 'leaseToken'
 THEN RAISE EXCEPTION 'worker health leaked capability or overstated processing'; END IF;
END $health$;
RESET ROLE;
UPDATE supporter_private.pazo_paypal_live_worker_control SET processing_enabled=true WHERE singleton;
SET LOCAL ROLE service_role;
DO $first$
DECLARE admitted jsonb; native jsonb; batch uuid;
BEGIN
 admitted:=public.pazo_f16_live_service_worker_admit(current_setting('pazo.synthetic_worker_invoker'));
 batch:=(admitted->>'leaseToken')::uuid;
 IF admitted->'event'->>'eventId'<>'WH-WORKER-CONTROL' THEN RAISE EXCEPTION 'due signed event unavailable'; END IF;
 IF public.pazo_f16_live_service_worker_admit(current_setting('pazo.synthetic_worker_invoker'))->>'busy'<>'true'
 THEN RAISE EXCEPTION 'overlapping global worker admitted'; END IF;
 native:=public.pazo_f16_live_service_worker_claim(1,'WH-WORKER-CONTROL');
 IF native IS NULL THEN RAISE EXCEPTION 'due exclusive native lease missing'; END IF;
 IF public.pazo_f16_live_service_worker_event_finish(1,'WH-WORKER-CONTROL',(native->>'leaseToken')::uuid,'processed')
 THEN RAISE EXCEPTION 'unpaid event acknowledged by retry adapter'; END IF;
 IF NOT public.pazo_f16_live_service_worker_event_finish(1,'WH-WORKER-CONTROL',(native->>'leaseToken')::uuid,'pending')
  OR public.pazo_f16_live_service_worker_claim(1,'WH-WORKER-CONTROL') IS NOT NULL
 THEN RAISE EXCEPTION 'retry backoff bypass'; END IF;
 IF NOT public.pazo_f16_live_service_worker_complete(batch,'retry','worker_event_pending','pazo_live_worker_v1')
 THEN RAISE EXCEPTION 'retry batch completion failed'; END IF;
END $first$;
RESET ROLE;
DO $exhaust$
DECLARE admitted jsonb; native jsonb; batch uuid; n integer;
BEGIN
 FOR n IN 2..3 LOOP
  UPDATE supporter_private.pazo_paypal_live_event_inbox SET retry_after=clock_timestamp()-interval '1 second'
  WHERE provider_event_id='WH-WORKER-CONTROL';
  admitted:=public.pazo_f16_live_service_worker_admit(current_setting('pazo.synthetic_worker_invoker'));
  batch:=(admitted->>'leaseToken')::uuid;
  native:=public.pazo_f16_live_service_worker_claim(1,'WH-WORKER-CONTROL');
  IF native IS NULL THEN RAISE EXCEPTION 'due retry unavailable'; END IF;
  IF NOT public.pazo_f16_live_service_worker_event_finish(1,'WH-WORKER-CONTROL',(native->>'leaseToken')::uuid,'pending')
   OR NOT public.pazo_f16_live_service_worker_complete(batch,'retry','worker_event_pending','pazo_live_worker_v1')
  THEN RAISE EXCEPTION 'bounded retry failed'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox
  WHERE provider_event_id='WH-WORKER-CONTROL' AND processing_state='held'
   AND claim_attempts=3 AND last_diagnostic_code='worker_retry_exhausted' AND lease_token IS NULL)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods)
 THEN RAISE EXCEPTION 'exhausted retry vanished or manufactured payment'; END IF;
 RAISE NOTICE 'F16_PRIVATE_WORKER_AUTH_DISABLED_HEALTH_BACKOFF_EXHAUSTION_PG17_PASS';
END $exhaust$;
ROLLBACK;
\i supabase/rollbacks/f16_live_private_worker_control_REVIEW_REQUIRED.sql
\i supabase/migrations/20261021144809_pazo_f16_live_private_worker_control.sql
DO $pass$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE NOT enabled AND NOT processing_enabled AND completed_runs=0)
 THEN RAISE EXCEPTION 'empty worker rollback/reapply not disabled'; END IF;
 RAISE NOTICE 'F16_PRIVATE_WORKER_EMPTY_ROLLBACK_REAPPLY_PASS';
END $pass$;
