-- Operator-only readback. No identities, tokens or row payloads.
SELECT enabled,retention_days,policy_version FROM marketing_private.collection_gate;
SELECT * FROM marketing_private.retention_runtime;
SELECT jobid,jobname,schedule,active,database,username FROM cron.job WHERE jobname='pazo-marketing-retention-v1';
SELECT r.jobid,r.status,r.start_time,r.end_time FROM cron.job_run_details r
JOIN cron.job j ON j.jobid=r.jobid WHERE j.jobname='pazo-marketing-retention-v1'
ORDER BY r.start_time DESC LIMIT 8;
