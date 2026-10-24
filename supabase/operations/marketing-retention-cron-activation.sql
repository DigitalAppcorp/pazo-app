-- PAZO MARKETING: OPERATOR-ONLY INSTALLATION PLAN, NOT A MIGRATION.
-- DO NOT execute as part of db push. PR #91 cannot schedule background work.
-- Requires distinct Product Owner GO for privacy notice, retention policy,
-- installed private schema and cron; never enables marketing intake itself.
-- Run with privileged trusted SQL operator only AFTER preflight approval.
-- Retention Cron should be verified while collection is OFF, BEFORE enabling intake.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $marketing_retention_schedule$
DECLARE v_days integer; v_version text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
  RAISE EXCEPTION 'Supabase Cron extension not installed';
 END IF;
 SELECT retention_days,policy_version INTO v_days,v_version
 FROM marketing_private.collection_gate WHERE singleton;
 IF v_days IS NULL OR v_days<1
  OR v_days>90 OR v_version IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1' THEN
  RAISE EXCEPTION 'Retention and published policy must be approved first';
 END IF;
 -- Runs every 6 hours UTC. The DB service role/secret is never used by Cron.
 -- Named pg_cron schedule is replaceable/reviewable by the DB operator.
 -- The private helper calls cron.schedule(...) after checking named-job
 -- ownership, database and command. An identical installation is idempotent;
 -- a conflicting/inactive job requires operator review, never a blind reset.
 PERFORM marketing_private.install_retention_schedule();
END
$marketing_retention_schedule$;
COMMIT;
-- Verify separately as a privileged operator before claiming automatic purge:
-- SELECT jobid,jobname,schedule,active FROM cron.job
-- WHERE jobname='pazo-marketing-retention-v1';
-- Review cron.job_run_details, restore/PITR and backup lifecycle regularly.
-- Never disable the deletion job while personal rows still need expiry.
