-- Tests the exact extracted tick SQL with mock extension adapters, NO network.
-- Native extension installation must also pass on the hosted project later.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
CREATE SCHEMA cron;
CREATE SCHEMA net;
CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,jobname text UNIQUE,
 schedule text,command text,username text DEFAULT current_user);
CREATE TABLE cron.job_run_details(runid bigint PRIMARY KEY,jobid bigint,end_time timestamptz);
CREATE FUNCTION cron.schedule(name text,schedule text,command text) RETURNS bigint LANGUAGE plpgsql AS $mock$
DECLARE id bigint;
BEGIN
 INSERT INTO cron.job(jobname,schedule,command) VALUES(name,schedule,command) RETURNING jobid INTO id;
 RETURN id;
END $mock$;
CREATE FUNCTION cron.unschedule(id bigint) RETURNS boolean LANGUAGE plpgsql AS $mock$
BEGIN DELETE FROM cron.job WHERE jobid=id; RETURN FOUND; END $mock$;
CREATE TABLE net.synthetic_requests(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 url text,body jsonb,headers jsonb,timeout_ms integer);
CREATE FUNCTION net.http_post(url text,body jsonb DEFAULT '{}'::jsonb,params jsonb DEFAULT '{}'::jsonb,
 headers jsonb DEFAULT '{}'::jsonb,timeout_milliseconds integer DEFAULT 2000) RETURNS bigint LANGUAGE plpgsql AS $mock$
DECLARE id bigint;
BEGIN
 IF current_database()<>'f14_synthetic' THEN RAISE EXCEPTION 'DISPOSABLE MOCK ONLY'; END IF;
 INSERT INTO net.synthetic_requests(url,body,headers,timeout_ms)
 VALUES(url,body,headers,timeout_milliseconds) RETURNING synthetic_requests.id INTO id;
 RETURN id;
END $mock$;
\i supabase/tests/supporter/fixtures/f16-live-worker-scheduler-core.generated.sql
BEGIN;
DO $scheduler$
DECLARE dispatched_id bigint; invoker_hash bytea;
BEGIN
 IF (SELECT count(*) FROM cron.job WHERE jobname='pazo_live_private_worker_v1')<>1
  OR has_function_privilege('service_role','supporter_private.pazo_live_worker_tick()','EXECUTE')
  OR has_function_privilege('authenticated','net.http_post(text,jsonb,jsonb,jsonb,integer)','EXECUTE')
  OR has_table_privilege('anon','net.synthetic_requests','SELECT')
 THEN RAISE EXCEPTION 'scheduler job/ACL invariant failed'; END IF;
 IF supporter_private.pazo_live_worker_tick() IS NOT NULL OR EXISTS(SELECT 1 FROM net.synthetic_requests)
 THEN RAISE EXCEPTION 'disabled scheduler emitted an HTTP request'; END IF;
 INSERT INTO cron.job(jobname,schedule,command) VALUES('unrelated_job','0 0 * * *','SELECT 1;');
 INSERT INTO cron.job_run_details SELECT 1,jobid,clock_timestamp()-interval '8 days'
 FROM cron.job WHERE jobname='pazo_live_private_worker_v1';
 INSERT INTO cron.job_run_details SELECT 2,jobid,clock_timestamp()-interval '8 days'
 FROM cron.job WHERE jobname='unrelated_job';
 UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true WHERE singleton;
 dispatched_id:=supporter_private.pazo_live_worker_tick();
 IF dispatched_id IS NULL OR (SELECT count(*) FROM net.synthetic_requests)<>1
  OR EXISTS(SELECT 1 FROM cron.job_run_details WHERE runid=1)
  OR NOT EXISTS(SELECT 1 FROM cron.job_run_details WHERE runid=2)
 THEN RAISE EXCEPTION 'bounded scheduler or isolated retention failed'; END IF;
 SELECT pg_catalog.sha256(pg_catalog.convert_to(substr(headers->>'Authorization',8),'UTF8'))
 INTO invoker_hash FROM net.synthetic_requests WHERE synthetic_requests.id=dispatched_id;
 IF invoker_hash IS DISTINCT FROM (SELECT invoker_sha256 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton)
  OR NOT EXISTS(SELECT 1 FROM net.synthetic_requests WHERE synthetic_requests.id=dispatched_id
   AND url='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker'
   AND body='{"action":"drain"}'::jsonb AND timeout_ms=90000)
  OR supporter_private.pazo_live_worker_tick() IS NOT NULL
 THEN RAISE EXCEPTION 'fixed target/in-memory invoker or dispatch limit failed'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=clock_timestamp()-interval '2 minutes',
  drain_token=gen_random_uuid(),drain_expires_at=clock_timestamp()+interval '1 minute' WHERE singleton;
 IF supporter_private.pazo_live_worker_tick() IS NOT NULL THEN RAISE EXCEPTION 'inflight batch overlapped'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=NULL,drain_expires_at=NULL WHERE singleton;
 BEGIN
  DELETE FROM vault.decrypted_secrets WHERE id=(SELECT invoker_vault_id FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton);
  PERFORM supporter_private.pazo_live_worker_tick();
  RAISE EXCEPTION 'missing invoker did not block';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'worker_invoker_unavailable' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM net.synthetic_requests)<>1 THEN RAISE EXCEPTION 'invalid invoker sent request'; END IF;
 RAISE NOTICE 'F16_PRIVATE_SCHEDULER_EXACT_CORE_MOCKED_EXTENSIONS_PG17_PASS';
END $scheduler$;
ROLLBACK;
\i supabase/rollbacks/f16_live_private_worker_scheduler_REVIEW_REQUIRED.sql
\i supabase/tests/supporter/fixtures/f16-live-worker-scheduler-core.generated.sql
DO $pass$ BEGIN
 IF (SELECT count(*) FROM cron.job WHERE jobname='pazo_live_private_worker_v1')<>1
 THEN RAISE EXCEPTION 'scheduler empty rollback/reapply duplicated job'; END IF;
 RAISE NOTICE 'F16_PRIVATE_SCHEDULER_EMPTY_ROLLBACK_REAPPLY_MOCK_PASS';
END $pass$;
