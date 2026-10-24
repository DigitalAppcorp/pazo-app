-- Disposable provider double: exercises schedule/execute/history/unschedule API.
-- NOT pg_cron and NEVER an assertion that a hosted scheduler ran.
CREATE SCHEMA cron;
CREATE TABLE cron.job(jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,jobname text UNIQUE,
 schedule text,command text,active boolean DEFAULT true,database text DEFAULT current_database(),username text DEFAULT current_user);
CREATE TABLE cron.job_run_details(runid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,jobid bigint,status text,
 start_time timestamptz DEFAULT clock_timestamp(),end_time timestamptz);
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE id bigint;BEGIN
 INSERT INTO cron.job(jobname,schedule,command) VALUES($1,$2,$3)
 ON CONFLICT(jobname) DO UPDATE SET schedule=$2,command=$3 RETURNING jobid INTO id;RETURN id;
END $$;
CREATE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN DELETE FROM cron.job WHERE jobid=$1;RETURN FOUND;END $$;
