-- Disable worker first. Preserve shared extensions and any unrelated cron job.
BEGIN;
DO $guard$
DECLARE job bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
  WHERE singleton AND NOT enabled AND NOT processing_enabled AND drain_token IS NULL)
 THEN RAISE EXCEPTION 'scheduler rollback requires disabled idle worker'; END IF;
 SELECT jobid INTO job FROM cron.job WHERE jobname='pazo_live_private_worker_v1' AND username='postgres'
  AND command='SELECT supporter_private.pazo_live_worker_tick();';
 IF job IS NULL THEN RAISE EXCEPTION 'worker job ownership drift'; END IF;
 PERFORM cron.unschedule(job);
END $guard$;
DROP FUNCTION supporter_private.pazo_live_worker_tick();
COMMIT;
