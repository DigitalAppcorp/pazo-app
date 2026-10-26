-- Issue96: prepared only, NO hosted apply or scheduler activation.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE marketing_private.collection_gate DROP CONSTRAINT gate_consistency;
ALTER TABLE marketing_private.collection_gate ADD CONSTRAINT gate_consistency CHECK(
 (NOT enabled AND enabled_at IS NULL) OR (enabled AND enabled_at IS NOT NULL AND retention_days>0
 AND policy_version IS NOT DISTINCT FROM 'pazo-marketing-attribution-notice-v1'));

CREATE TABLE marketing_private.retention_runtime(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 last_success_at timestamptz,last_days smallint,last_policy text,
 acquisitions_removed integer NOT NULL DEFAULT 0 CHECK(acquisitions_removed>=0),
 aggregate_or_window_rows_removed integer NOT NULL DEFAULT 0 CHECK(aggregate_or_window_rows_removed>=0)
);
INSERT INTO marketing_private.retention_runtime(singleton) VALUES(true);
ALTER TABLE marketing_private.retention_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.retention_runtime FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.retention_runtime FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.retention_ready(p_days integer,p_policy text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE ok boolean;
BEGIN
 IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 90 OR p_policy IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1'
 OR NOT EXISTS(SELECT 1 FROM marketing_private.retention_runtime WHERE singleton
  AND last_success_at BETWEEN statement_timestamp()-interval '7 hours' AND statement_timestamp()
  AND last_days=p_days AND last_policy=p_policy)
 OR coalesce(current_setting('cron.timezone',true),'GMT') NOT IN('GMT','UTC','Etc/UTC')
 OR to_regclass('cron.job') IS NULL OR to_regclass('cron.job_run_details') IS NULL THEN RETURN false;END IF;
 EXECUTE 'SELECT EXISTS(SELECT 1 FROM cron.job j JOIN cron.job_run_details r ON r.jobid=j.jobid
  WHERE j.jobname=''pazo-marketing-retention-v1'' AND j.active AND j.database=current_database()
  AND j.username=current_user AND j.schedule=''17 */6 * * *''
  AND j.command=''SELECT public.pazo_marketing_prune_all_v1();''
  AND r.status=''succeeded'' AND r.end_time BETWEEN statement_timestamp()-interval ''7 hours'' AND statement_timestamp()
  AND r.runid=(SELECT max(h.runid) FROM cron.job_run_details h WHERE h.jobid=j.jobid AND h.end_time IS NOT NULL))' INTO ok;
 RETURN coalesce(ok,false);
END $$;
REVOKE ALL ON FUNCTION marketing_private.retention_ready(integer,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.require_retention_ready() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF (NEW.retention_days=0 OR NEW.policy_version IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1')
 AND (EXISTS(SELECT 1 FROM marketing_private.acquisition) OR EXISTS(SELECT 1 FROM marketing_private.landing_daily))
 THEN RAISE EXCEPTION 'Keep an approved deletion policy while marketing rows remain' USING ERRCODE='23514';END IF;
 IF NEW.enabled AND NOT marketing_private.retention_ready(NEW.retention_days,NEW.policy_version)
 THEN RAISE EXCEPTION 'Verified deletion schedule and policy required before collection' USING ERRCODE='23514';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION marketing_private.require_retention_ready() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER marketing_retention_before_collection BEFORE INSERT OR UPDATE ON marketing_private.collection_gate
FOR EACH ROW EXECUTE FUNCTION marketing_private.require_retention_ready();

-- Policy applies to physical deletion even while collection is OFF. A failed
-- delete rolls back every dataset and heartbeat; no false successful cleanup.
CREATE OR REPLACE FUNCTION marketing_private.prune_expired() RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE days smallint;version text;removed integer;
BEGIN
 SELECT g.retention_days,g.policy_version INTO days,version FROM marketing_private.collection_gate g WHERE singleton FOR SHARE;
 IF days IS NULL OR days<=0 OR version IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1' THEN RETURN 0;END IF;
 DELETE FROM marketing_private.acquisition WHERE recorded_at<statement_timestamp()-make_interval(days=>days);
 GET DIAGNOSTICS removed=ROW_COUNT;RETURN removed;
END $$;
CREATE OR REPLACE FUNCTION public.pazo_marketing_prune_landing_v1() RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE days smallint;version text;removed integer:=0;windows integer;
BEGIN
 SELECT g.retention_days,g.policy_version INTO days,version FROM marketing_private.collection_gate g WHERE singleton FOR SHARE;
 IF days>0 AND version IS NOT DISTINCT FROM 'pazo-marketing-attribution-notice-v1' THEN
  DELETE FROM marketing_private.landing_daily WHERE landing_day<(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-days;
  GET DIAGNOSTICS removed=ROW_COUNT;
 END IF;
 DELETE FROM marketing_private.landing_minute_budget WHERE minute_utc<statement_timestamp()-interval '48 hours';
 GET DIAGNOSTICS windows=ROW_COUNT;RETURN removed+windows;
END $$;
CREATE OR REPLACE FUNCTION public.pazo_marketing_prune_all_v1() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE a integer;l integer;days smallint;version text;
BEGIN
 IF NOT pg_try_advisory_xact_lock(170096,1) THEN
  RETURN jsonb_build_object('status','busy','acquisition_removed',0,'aggregate_or_window_rows_removed',0);END IF;
 SELECT g.retention_days,g.policy_version INTO days,version FROM marketing_private.collection_gate g WHERE singleton FOR SHARE;
 a:=marketing_private.prune_expired();l:=public.pazo_marketing_prune_landing_v1();
 UPDATE marketing_private.retention_runtime SET last_success_at=statement_timestamp(),last_days=days,last_policy=version,
  acquisitions_removed=a,aggregate_or_window_rows_removed=l WHERE singleton;
 RETURN jsonb_build_object('status','pruned','acquisition_removed',a,'aggregate_or_window_rows_removed',l);
END $$;

-- Stop ingest immediately if the verified deletion job becomes stale or dies.
ALTER FUNCTION public.pazo_marketing_record_landing_v1(text) SET SCHEMA marketing_private;
ALTER FUNCTION marketing_private.pazo_marketing_record_landing_v1(text) RENAME TO record_landing_core;
REVOKE ALL ON FUNCTION marketing_private.record_landing_core(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_marketing_record_landing_v1(p_creative text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM marketing_private.collection_gate WHERE singleton AND enabled
  AND marketing_private.retention_ready(retention_days,policy_version)) THEN RETURN false;END IF;
 RETURN marketing_private.record_landing_core(p_creative);
END $$;
REVOKE ALL ON FUNCTION public.pazo_marketing_record_landing_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_record_landing_v1(text) TO service_role;
CREATE OR REPLACE FUNCTION public.pazo_marketing_record_verified_v1(p_owner uuid,p_creative text,p_first_touch_at timestamptz) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM marketing_private.collection_gate WHERE singleton AND enabled
  AND marketing_private.retention_ready(retention_days,policy_version)) THEN RETURN false;END IF;
 RETURN marketing_private.record_verified_acquisition(p_owner,p_creative,p_first_touch_at);
END $$;

-- A stale scheduler is also represented honestly in the aggregate report.
ALTER FUNCTION public.pazo_admin_marketing_summary(integer) SET SCHEMA marketing_private;
ALTER FUNCTION marketing_private.pazo_admin_marketing_summary(integer) RENAME TO admin_summary_core;
REVOKE ALL ON FUNCTION marketing_private.admin_summary_core(integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_admin_marketing_summary(p_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 result:=marketing_private.admin_summary_core(p_days);
 IF result->>'status'='collecting' AND NOT EXISTS(SELECT 1 FROM marketing_private.collection_gate WHERE singleton AND marketing_private.retention_ready(retention_days,policy_version))
 THEN result:=jsonb_set(result,'{status}','"paused"'::jsonb);END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_marketing_summary(integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_marketing_summary(integer) TO authenticated;

CREATE FUNCTION marketing_private.install_retention_schedule() RETURNS bigint
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE found_job record;n integer;job bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM marketing_private.collection_gate WHERE singleton AND NOT enabled AND retention_days BETWEEN 1 AND 90
  AND policy_version IS NOT DISTINCT FROM 'pazo-marketing-attribution-notice-v1') THEN
  RAISE EXCEPTION 'Approved retention/policy and collection OFF required';END IF;
 IF to_regprocedure('cron.schedule(text,text,text)') IS NULL OR to_regclass('cron.job') IS NULL THEN RAISE EXCEPTION 'Cron unavailable';END IF;
 IF coalesce(current_setting('cron.timezone',true),'GMT') NOT IN('GMT','UTC','Etc/UTC') THEN RAISE EXCEPTION 'UTC Cron required';END IF;
 EXECUTE 'SELECT count(*) FROM cron.job WHERE jobname=''pazo-marketing-retention-v1''' INTO n;
 IF n>1 THEN RAISE EXCEPTION 'Ambiguous retention job';END IF;
 IF n=1 THEN
  EXECUTE 'SELECT * FROM cron.job WHERE jobname=''pazo-marketing-retention-v1''' INTO found_job;
  IF NOT found_job.active OR found_job.database<>current_database() OR found_job.username<>current_user
    OR found_job.schedule<>'17 */6 * * *' OR found_job.command<>'SELECT public.pazo_marketing_prune_all_v1();'
  THEN RAISE EXCEPTION 'Existing retention job differs; operator review required';END IF;
  RETURN found_job.jobid;
 END IF;
 EXECUTE 'SELECT cron.schedule($1,$2,$3)' INTO job USING 'pazo-marketing-retention-v1','17 */6 * * *','SELECT public.pazo_marketing_prune_all_v1();';
 RETURN job;
END $$;
REVOKE ALL ON FUNCTION marketing_private.install_retention_schedule() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.remove_retention_schedule() RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE job record;
BEGIN
 IF EXISTS(SELECT 1 FROM marketing_private.collection_gate WHERE enabled) OR EXISTS(SELECT 1 FROM marketing_private.acquisition)
 OR EXISTS(SELECT 1 FROM marketing_private.landing_daily) OR EXISTS(SELECT 1 FROM marketing_private.landing_minute_budget)
 THEN RAISE EXCEPTION 'Pause collection and finish lawful deletion before unscheduling';END IF;
 IF to_regclass('cron.job') IS NULL THEN RETURN true;END IF;
 FOR job IN EXECUTE 'SELECT jobid,database,username FROM cron.job WHERE jobname=''pazo-marketing-retention-v1''' LOOP
  IF job.database<>current_database() OR job.username<>current_user THEN RAISE EXCEPTION 'Foreign retention job';END IF;
  EXECUTE 'SELECT cron.unschedule($1)' USING job.jobid;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION marketing_private.remove_retention_schedule() FROM PUBLIC,anon,authenticated,service_role;
-- Literal first pet, not any later pet; never credit a future timestamp.
CREATE INDEX acquisition_recorded_expiry_idx ON marketing_private.acquisition(recorded_at);
CREATE OR REPLACE FUNCTION marketing_private.cohort_snapshot()
RETURNS TABLE(
 cohort_day date,
 campaign text,
 creative text,
 verified_owners bigint,
 first_pet_within_7d bigint,
 d7_matured_owners bigint,
 d7_screen_activity_proxy bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 WITH eligible AS (
  SELECT a.owner_id, a.campaign, a.creative, a.signup_verified_at,
         (a.signup_verified_at AT TIME ZONE 'America/Los_Angeles')::date AS cd
  FROM marketing_private.acquisition a
  WHERE marketing_private.is_eligible_owner(a.owner_id)
   AND a.recorded_at >= statement_timestamp()
     - make_interval(days => coalesce((
       SELECT NULLIF(g.retention_days, 0)
       FROM marketing_private.collection_gate g WHERE g.singleton
     ), 0))
   AND EXISTS (
     SELECT 1 FROM marketing_private.collection_gate g
     WHERE g.singleton AND g.retention_days > 0
   )
 ), per_owner AS (
  SELECT e.*,
   coalesce((SELECT min(p.created_at)>=e.signup_verified_at
     AND min(p.created_at)<e.signup_verified_at+interval '7 days'
     AND min(p.created_at)<=statement_timestamp()
     FROM public.pets p WHERE p.owner_id=e.owner_id),false) AS has_first_pet,
   EXISTS (
    SELECT 1 FROM admin_private.app_activity_daily d
    WHERE d.user_id=e.owner_id
      AND d.activity_day=e.cd+7
      AND d.module_key IN('inicio','comunidades','mapa','mascota','explore')
   ) AS d7_screen_proxy
  FROM eligible e
 )
 SELECT cd,campaign,creative,count(*)::bigint,
  count(*) FILTER(WHERE has_first_pet)::bigint,
  count(*) FILTER(WHERE cd+7 < (now() AT TIME ZONE 'America/Los_Angeles')::date)::bigint,
  count(*) FILTER(WHERE d7_screen_proxy
    AND cd+7 < (now() AT TIME ZONE 'America/Los_Angeles')::date)::bigint
 FROM per_owner
 GROUP BY cd,campaign,creative;
$$;
COMMIT;
