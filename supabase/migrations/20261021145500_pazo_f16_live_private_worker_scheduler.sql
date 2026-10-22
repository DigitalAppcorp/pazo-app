-- Existing Free project only. No paid resource, processing switch or payment.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_worker_control') IS NULL
  OR NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
   WHERE singleton AND NOT enabled AND NOT processing_enabled AND drain_token IS NULL)
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname IN('pg_cron','pg_net'))
  OR to_regnamespace('cron') IS NOT NULL OR to_regnamespace('net') IS NOT NULL
  OR to_regprocedure('supporter_private.pazo_live_worker_tick()') IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_available_extensions WHERE name='pg_cron' AND default_version='1.6.4')
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_available_extensions WHERE name='pg_net' AND default_version='0.20.4')
 THEN RAISE EXCEPTION 'private scheduler prerequisite drift'; END IF;
END $guard$;
CREATE EXTENSION pg_cron WITH SCHEMA pg_catalog VERSION '1.6.4';
CREATE EXTENSION pg_net WITH SCHEMA extensions VERSION '0.20.4';

-- PAZO_WORKER_SCHEDULER_CORE_BEGIN
-- These newly installed schemas have no other application consumers.
REVOKE ALL ON SCHEMA cron,net FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron,net FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA cron,net FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA cron,net TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA cron,net TO postgres;

CREATE FUNCTION supporter_private.pazo_live_worker_tick()
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $tick$
DECLARE c supporter_private.pazo_paypal_live_worker_control%ROWTYPE;
 token text; request_id bigint;
BEGIN
 SELECT * INTO c FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- Only our technical execution metadata, not financial records/other jobs.
 DELETE FROM cron.job_run_details WHERE runid IN(
  SELECT d.runid FROM cron.job_run_details d JOIN cron.job j ON j.jobid=d.jobid
  WHERE j.jobname='pazo_live_private_worker_v1' AND j.username='postgres'
   AND d.end_time<pg_catalog.clock_timestamp()-interval '7 days' ORDER BY d.runid LIMIT 2000);
 IF NOT c.enabled OR
  (c.last_dispatch_at IS NOT NULL AND c.last_dispatch_at>=pg_catalog.clock_timestamp()-interval '55 seconds') OR
  (c.drain_token IS NOT NULL AND c.drain_expires_at>=pg_catalog.clock_timestamp())
 THEN RETURN NULL; END IF;
 SELECT v.decrypted_secret INTO token FROM vault.decrypted_secrets v WHERE v.id=c.invoker_vault_id;
 IF token IS NULL OR token !~ '^[a-f0-9]{64}$' OR
  pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')) IS DISTINCT FROM c.invoker_sha256
 THEN RAISE EXCEPTION 'worker_invoker_unavailable'; END IF;
 -- Only this fixed same-project endpoint. Capability never returned or logged.
 request_id:=net.http_post(
  url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker',
  body:=pg_catalog.jsonb_build_object('action','drain'),
  headers:=pg_catalog.jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
  timeout_milliseconds:=90000);
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=pg_catalog.clock_timestamp() WHERE singleton;
 RETURN request_id;
END $tick$;
ALTER FUNCTION supporter_private.pazo_live_worker_tick() OWNER TO postgres;
REVOKE ALL ON FUNCTION supporter_private.pazo_live_worker_tick() FROM PUBLIC,anon,authenticated,service_role;
DO $schedule$
BEGIN
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='pazo_live_private_worker_v1')
 THEN RAISE EXCEPTION 'private worker job already exists'; END IF;
 PERFORM cron.schedule('pazo_live_private_worker_v1','* * * * *','SELECT supporter_private.pazo_live_worker_tick();');
END $schedule$;
-- PAZO_WORKER_SCHEDULER_CORE_END
COMMIT;
