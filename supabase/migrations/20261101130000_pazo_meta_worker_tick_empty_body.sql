-- #169 The worker refuses any request with a body; pg_net sent '{}' and every
-- dispatch ended in 400 without touching the outbox. Only the body changes.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION marketing_private.meta_worker_tick()
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
  body:=NULL,timeout_milliseconds:=15000);
 RETURN request_id;
END $tick$;
REVOKE ALL ON FUNCTION marketing_private.meta_worker_tick() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
