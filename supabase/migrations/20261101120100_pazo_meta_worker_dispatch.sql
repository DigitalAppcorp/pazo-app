-- #169 Schedules the Meta worker with a single-use credential, as the PayPal
-- worker does, so no shared secret exists. Does nothing while the release gate
-- is off, or when no event is due.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE TABLE marketing_private.meta_worker_dispatch(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 dispatch_sha256 bytea CHECK(dispatch_sha256 IS NULL OR octet_length(dispatch_sha256)=32),
 dispatch_expires_at timestamptz,
 CHECK((dispatch_sha256 IS NULL)=(dispatch_expires_at IS NULL))
);
INSERT INTO marketing_private.meta_worker_dispatch(singleton) VALUES(true);
ALTER TABLE marketing_private.meta_worker_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.meta_worker_dispatch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.meta_worker_dispatch FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.pazo_meta_worker_admit(p_token text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $admit$
DECLARE d marketing_private.meta_worker_dispatch%ROWTYPE;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN FALSE; END IF;
 SELECT * INTO d FROM marketing_private.meta_worker_dispatch WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR d.dispatch_expires_at IS NULL OR d.dispatch_expires_at<pg_catalog.clock_timestamp()
  OR d.dispatch_sha256 IS DISTINCT FROM pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8'))
 THEN RETURN FALSE; END IF;
 -- Consumed before answering, so a queued value cannot be replayed.
 UPDATE marketing_private.meta_worker_dispatch
  SET dispatch_sha256=NULL,dispatch_expires_at=NULL WHERE singleton;
 RETURN TRUE;
END $admit$;
REVOKE ALL ON FUNCTION public.pazo_meta_worker_admit(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pazo_meta_worker_admit(text) TO service_role;

CREATE FUNCTION marketing_private.meta_worker_tick()
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $tick$
DECLARE token text; request_id bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM marketing_private.meta_release_gate_candidate g WHERE g.singleton AND g.enabled)
  OR NOT EXISTS(SELECT 1 FROM marketing_private.meta_outbox_candidate o
   WHERE (o.status IN('pending','retryable') OR (o.status='leased' AND o.leased_until<pg_catalog.statement_timestamp()))
    AND o.attempts<4 AND marketing_private.meta_send_eligible_candidate(o.owner_id))
 THEN RETURN NULL; END IF;
 token:=pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-','')
  ||pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-','');
 UPDATE marketing_private.meta_worker_dispatch
  SET dispatch_sha256=pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')),
   dispatch_expires_at=pg_catalog.clock_timestamp()+interval '2 minutes' WHERE singleton;
 request_id:=net.http_post(
  url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-meta-worker',
  headers:=pg_catalog.jsonb_build_object('authorization','Bearer '||token),
  body:='{}'::jsonb,timeout_milliseconds:=15000);
 RETURN request_id;
END $tick$;
REVOKE ALL ON FUNCTION marketing_private.meta_worker_tick() FROM PUBLIC,anon,authenticated,service_role;

DO $schedule$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pg_cron') THEN
  PERFORM cron.schedule('pazo_meta_worker_v1','* * * * *','SELECT marketing_private.meta_worker_tick()');
 END IF;
END $schedule$;
COMMIT;
