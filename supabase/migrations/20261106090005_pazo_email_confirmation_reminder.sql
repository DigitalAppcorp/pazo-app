-- Reengagement point 2: one Auth-managed signup confirmation resend after 24h.
-- No email address or message body is copied into this private queue.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE SCHEMA IF NOT EXISTS auth_private;
REVOKE ALL ON SCHEMA auth_private FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE auth_private.confirmation_reminder(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 due_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending'
  CHECK(status IN('pending','attempting','accepted','rejected','unknown','skipped')),
 attempted_at timestamptz,
 finished_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
 CHECK((status='pending' AND attempted_at IS NULL AND finished_at IS NULL)
   OR (status='attempting' AND attempted_at IS NOT NULL AND finished_at IS NULL)
   OR (status IN('accepted','rejected','unknown','skipped') AND finished_at IS NOT NULL))
);
CREATE INDEX confirmation_reminder_due_idx ON auth_private.confirmation_reminder(due_at)
 WHERE status='pending';
ALTER TABLE auth_private.confirmation_reminder ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_private.confirmation_reminder FORCE ROW LEVEL SECURITY;
REVOKE ALL ON auth_private.confirmation_reminder FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE auth_private.confirmation_reminder_dispatch(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 dispatch_sha256 bytea CHECK(dispatch_sha256 IS NULL OR octet_length(dispatch_sha256)=32),
 dispatch_expires_at timestamptz,
 CHECK((dispatch_sha256 IS NULL)=(dispatch_expires_at IS NULL))
);
INSERT INTO auth_private.confirmation_reminder_dispatch(singleton) VALUES(true);
ALTER TABLE auth_private.confirmation_reminder_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_private.confirmation_reminder_dispatch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON auth_private.confirmation_reminder_dispatch FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION auth_private.enqueue_confirmation_reminder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $enqueue$
BEGIN
 IF NEW.email_confirmed_at IS NOT NULL OR NEW.is_anonymous
  OR NEW.raw_app_meta_data->>'provider' IS DISTINCT FROM 'email'
  OR NOT marketing_private.is_reporting_owner(NEW.id) THEN
  RETURN NEW;
 END IF;
 BEGIN
  INSERT INTO auth_private.confirmation_reminder(user_id,due_at)
  VALUES(NEW.id,greatest(NEW.created_at,coalesce(NEW.confirmation_sent_at,NEW.created_at))+interval '24 hours')
  ON CONFLICT(user_id) DO NOTHING;
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pazo confirmation reminder enqueue skipped: %',SQLSTATE;
 END;
 RETURN NEW;
END $enqueue$;
REVOKE ALL ON FUNCTION auth_private.enqueue_confirmation_reminder() FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER pazo_confirmation_reminder_signup
 AFTER INSERT ON auth.users FOR EACH ROW
 EXECUTE FUNCTION auth_private.enqueue_confirmation_reminder();

CREATE FUNCTION auth_private.refresh_confirmation_reminder()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $refresh$
BEGIN
 BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
   DELETE FROM auth_private.confirmation_reminder WHERE user_id=NEW.id;
  ELSIF OLD.email_confirmed_at IS NULL
   AND NEW.confirmation_sent_at IS DISTINCT FROM OLD.confirmation_sent_at THEN
   UPDATE auth_private.confirmation_reminder
    SET due_at=greatest(NEW.created_at,coalesce(NEW.confirmation_sent_at,NEW.created_at))+interval '24 hours'
    WHERE user_id=NEW.id AND status='pending';
  END IF;
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pazo confirmation reminder state update skipped: %',SQLSTATE;
 END;
 RETURN NEW;
END $refresh$;
REVOKE ALL ON FUNCTION auth_private.refresh_confirmation_reminder() FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER pazo_confirmation_reminder_auth_update
 AFTER UPDATE OF confirmation_sent_at,email_confirmed_at ON auth.users FOR EACH ROW
 EXECUTE FUNCTION auth_private.refresh_confirmation_reminder();

-- Existing unconfirmed email accounts are eligible once, at the first cron run after release.
INSERT INTO auth_private.confirmation_reminder(user_id,due_at)
SELECT u.id,greatest(u.created_at,coalesce(u.confirmation_sent_at,u.created_at))+interval '24 hours'
FROM auth.users u
WHERE u.email_confirmed_at IS NULL AND NOT u.is_anonymous
 AND u.raw_app_meta_data->>'provider'='email'
 AND marketing_private.is_reporting_owner(u.id)
ON CONFLICT(user_id) DO NOTHING;

CREATE TABLE auth_private.confirmation_reminder_worker_dispatch(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 dispatch_sha256 bytea CHECK(dispatch_sha256 IS NULL OR octet_length(dispatch_sha256)=32),
 dispatch_expires_at timestamptz,
 CHECK((dispatch_sha256 IS NULL)=(dispatch_expires_at IS NULL))
);
INSERT INTO auth_private.confirmation_reminder_worker_dispatch(singleton) VALUES(true);
ALTER TABLE auth_private.confirmation_reminder_worker_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_private.confirmation_reminder_worker_dispatch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON auth_private.confirmation_reminder_worker_dispatch FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.pazo_auth_confirmation_reminder_admit(p_token text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $admit$
DECLARE d auth_private.confirmation_reminder_worker_dispatch%ROWTYPE;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN FALSE; END IF;
 SELECT * INTO d FROM auth_private.confirmation_reminder_worker_dispatch
  WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR d.dispatch_expires_at IS NULL
  OR d.dispatch_expires_at<pg_catalog.clock_timestamp()
  OR d.dispatch_sha256 IS DISTINCT FROM pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8'))
 THEN RETURN FALSE; END IF;
 UPDATE auth_private.confirmation_reminder_worker_dispatch
  SET dispatch_sha256=NULL,dispatch_expires_at=NULL WHERE singleton;
 RETURN TRUE;
END $admit$;
REVOKE ALL ON FUNCTION public.pazo_auth_confirmation_reminder_admit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_auth_confirmation_reminder_admit(text) TO service_role;

CREATE FUNCTION public.pazo_auth_confirmation_reminder_lease(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $lease$
DECLARE v_result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 20 THEN
  RAISE EXCEPTION 'Invalid batch size' USING ERRCODE='22023';
 END IF;
 WITH picked AS (
  SELECT r.user_id FROM auth_private.confirmation_reminder r
  JOIN auth.users u ON u.id=r.user_id
  WHERE r.status='pending' AND r.due_at<=pg_catalog.statement_timestamp()
   AND u.email_confirmed_at IS NULL AND NOT u.is_anonymous
   AND u.raw_app_meta_data->>'provider'='email'
   AND marketing_private.is_reporting_owner(u.id)
  ORDER BY r.due_at,r.user_id LIMIT p_limit FOR UPDATE OF r SKIP LOCKED
 ), claimed AS (
  UPDATE auth_private.confirmation_reminder r
   SET status='attempting',attempted_at=pg_catalog.clock_timestamp()
   FROM picked p WHERE r.user_id=p.user_id
   RETURNING r.user_id,r.attempted_at
 )
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',c.user_id,'email',u.email)
  ORDER BY c.attempted_at),'[]'::jsonb)
 INTO v_result FROM claimed c JOIN auth.users u ON u.id=c.user_id;
 RETURN v_result;
END $lease$;
REVOKE ALL ON FUNCTION public.pazo_auth_confirmation_reminder_lease(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_auth_confirmation_reminder_lease(integer) TO service_role;

CREATE FUNCTION public.pazo_auth_confirmation_reminder_report(p_results jsonb)
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $report$
DECLARE v_count integer;
BEGIN
 IF p_results IS NULL OR pg_catalog.jsonb_typeof(p_results) IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Invalid result batch' USING ERRCODE='22023';
 END IF;
 IF pg_catalog.jsonb_array_length(p_results)>20 THEN
  RAISE EXCEPTION 'Invalid result batch' USING ERRCODE='22023';
 END IF;
 WITH parsed AS (
  SELECT x.user_id,x.outcome FROM pg_catalog.jsonb_to_recordset(p_results)
   AS x(user_id uuid,outcome text)
  WHERE x.outcome IN('accepted','rejected','unknown')
 ), updated AS (
  UPDATE auth_private.confirmation_reminder r
   SET status=p.outcome,finished_at=pg_catalog.clock_timestamp()
   FROM parsed p WHERE r.user_id=p.user_id AND r.status='attempting'
   RETURNING 1
 ) SELECT count(*) INTO v_count FROM updated;
 RETURN v_count;
END $report$;
REVOKE ALL ON FUNCTION public.pazo_auth_confirmation_reminder_report(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_auth_confirmation_reminder_report(jsonb) TO service_role;

CREATE FUNCTION auth_private.confirmation_reminder_tick()
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $tick$
DECLARE token text; request_id bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM auth_private.confirmation_reminder r
  WHERE r.status='pending' AND r.due_at<=pg_catalog.statement_timestamp()) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM auth_private.confirmation_reminder_worker_dispatch d
  WHERE d.singleton AND d.dispatch_expires_at>pg_catalog.clock_timestamp()) THEN RETURN NULL; END IF;
 token:=pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-','')
  ||pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-','');
 UPDATE auth_private.confirmation_reminder_worker_dispatch
  SET dispatch_sha256=pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')),
   dispatch_expires_at=pg_catalog.clock_timestamp()+interval '2 minutes' WHERE singleton;
 request_id:=net.http_post(
  url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-confirmation-reminder-worker',
  headers:=pg_catalog.jsonb_build_object('authorization','Bearer '||token),
  body:='{}'::jsonb,timeout_milliseconds:=15000);
 RETURN request_id;
END $tick$;
REVOKE ALL ON FUNCTION auth_private.confirmation_reminder_tick() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION auth_private.confirmation_reminder_retention_tick()
RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $retention$
DECLARE v_count integer;
BEGIN
 UPDATE auth_private.confirmation_reminder
  SET status='unknown',finished_at=pg_catalog.clock_timestamp()
  WHERE status='attempting' AND attempted_at<pg_catalog.clock_timestamp()-interval '15 minutes';
 DELETE FROM auth_private.confirmation_reminder
  WHERE (status IN('accepted','rejected','unknown','skipped')
    AND finished_at<pg_catalog.clock_timestamp()-interval '14 days')
   OR (status='pending' AND due_at<pg_catalog.clock_timestamp()-interval '14 days');
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $retention$;
REVOKE ALL ON FUNCTION auth_private.confirmation_reminder_retention_tick() FROM PUBLIC,anon,authenticated,service_role;

DO $schedule$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pg_cron')
  AND EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pg_net') THEN
  PERFORM cron.schedule('pazo_auth_confirmation_reminder_v1','*/5 * * * *',
   'SELECT auth_private.confirmation_reminder_tick()');
  PERFORM cron.schedule('pazo_auth_confirmation_reminder_retention_v1','17 */6 * * *',
   'SELECT auth_private.confirmation_reminder_retention_tick()');
 END IF;
END $schedule$;
COMMIT;
