-- Hosted pg_net is owned by supabase_admin; postgres REVOKE is a no-op.
-- Keep net OUT of exposed API schemas. DB logins are a trusted boundary.
-- Existing Vault technical invoker is retained encrypted but NO LONGER accepted.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
  WHERE singleton AND NOT enabled AND NOT processing_enabled AND drain_token IS NULL AND last_dispatch_at IS NULL)
  OR (SELECT md5(pg_catalog.replace(prosrc,E'\r','')) FROM pg_proc WHERE oid='public.pazo_f16_live_service_worker_admit(text)'::regprocedure)
    IS DISTINCT FROM 'd6bd05df776d6d8868c849562854b796'
  OR (SELECT md5(pg_catalog.replace(prosrc,E'\r','')) FROM pg_proc WHERE oid='supporter_private.pazo_live_worker_tick()'::regprocedure)
    IS DISTINCT FROM 'c08d3977938766fa5e6dcbcc2367ac55'
  OR EXISTS(SELECT 1 FROM net.http_request_queue)
 THEN RAISE EXCEPTION 'single use dispatch prerequisite drift'; END IF;
END $guard$;
ALTER TABLE supporter_private.pazo_paypal_live_worker_control
 ADD COLUMN dispatch_sha256 bytea CHECK(dispatch_sha256 IS NULL OR pg_catalog.octet_length(dispatch_sha256)=32),
 ADD COLUMN dispatch_expires_at timestamptz,
 ADD CONSTRAINT pazo_live_dispatch_pair CHECK((dispatch_sha256 IS NULL)=(dispatch_expires_at IS NULL));
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_worker_admit(p_invoker text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $admit$
DECLARE c supporter_private.pazo_paypal_live_worker_control%ROWTYPE; due jsonb; token uuid;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_invoker IS NULL OR p_invoker !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 SELECT * INTO c FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR c.dispatch_expires_at IS NULL OR c.dispatch_expires_at<pg_catalog.clock_timestamp()
  OR c.dispatch_sha256 IS DISTINCT FROM pg_catalog.sha256(pg_catalog.convert_to(p_invoker,'UTF8'))
 THEN RETURN NULL; END IF;
 -- Consume before any admission result. A queued value cannot be replayed.
 UPDATE supporter_private.pazo_paypal_live_worker_control
  SET dispatch_sha256=NULL,dispatch_expires_at=NULL WHERE singleton;
 IF NOT c.enabled THEN RETURN pg_catalog.jsonb_build_object('authenticated',true,'enabled',false); END IF;
 IF c.drain_token IS NOT NULL AND c.drain_expires_at>=pg_catalog.clock_timestamp()
 THEN RETURN pg_catalog.jsonb_build_object('authenticated',true,'enabled',true,'busy',true); END IF;
 token:=pg_catalog.gen_random_uuid();
 UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=token,
  drain_expires_at=pg_catalog.clock_timestamp()+interval '3 minutes',last_admitted_at=pg_catalog.clock_timestamp()
 WHERE singleton;
 IF c.processing_enabled THEN
  -- Exhausted crashed attempts and legacy rows without signed provenance are
  -- held visibly; they never remain silently pending or become processed.
  UPDATE supporter_private.pazo_paypal_live_event_inbox e SET processing_state='held',
   lease_token=NULL,leased_at=NULL,lease_expires_at=NULL,last_diagnostic_code=CASE
    WHEN e.claim_attempts>=3 THEN 'worker_retry_exhausted' ELSE 'signed_receipt_missing' END
  WHERE e.processing_state IN('pending','processing')
   AND (e.lease_token IS NULL OR e.lease_expires_at<pg_catalog.clock_timestamp())
   AND (e.claim_attempts>=3 OR NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts r
    WHERE r.merchant_generation=e.merchant_generation AND r.provider_event_id=e.provider_event_id));
  SELECT pg_catalog.jsonb_build_object('merchantGeneration',e.merchant_generation,
   'eventId',e.provider_event_id,'eventType',e.event_type) INTO due
  FROM supporter_private.pazo_paypal_live_event_inbox e
  JOIN supporter_private.pazo_paypal_live_signed_receipts r ON r.merchant_generation=e.merchant_generation
   AND r.provider_event_id=e.provider_event_id AND r.event_type=e.event_type
  WHERE e.retry_after<=pg_catalog.clock_timestamp() AND e.claim_attempts<3
   AND (e.processing_state='pending' OR
    (e.processing_state='processing' AND e.lease_expires_at<pg_catalog.clock_timestamp()))
  ORDER BY CASE WHEN e.event_type IN('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED') THEN 0
   WHEN e.event_type='PAYMENT.SALE.COMPLETED' THEN 2 ELSE 1 END,e.verified_at
  LIMIT 1;
 END IF;
 RETURN pg_catalog.jsonb_build_object('authenticated',true,'enabled',true,'busy',false,
  'processingAllowed',c.processing_enabled,'leaseToken',token,'expectedBuild',c.expected_build,'event',due);
END $admit$;


CREATE OR REPLACE FUNCTION supporter_private.pazo_live_worker_tick()
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
  (c.drain_token IS NOT NULL AND c.drain_expires_at>=pg_catalog.clock_timestamp()) OR
  (c.dispatch_expires_at IS NOT NULL AND c.dispatch_expires_at>=pg_catalog.clock_timestamp())
 THEN RETURN NULL; END IF;
 -- pg_net headers are readable by trusted DB logins on hosted Supabase.
 -- Never enqueue the reusable Vault invoker, a service key or a PayPal key.
 -- This random value is valid for ONE service admission for at most 120s.
 token:=pg_catalog.replace(pg_catalog.gen_random_uuid()::text||pg_catalog.gen_random_uuid()::text,'-','');
 UPDATE supporter_private.pazo_paypal_live_worker_control SET
  dispatch_sha256=pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')),
  dispatch_expires_at=pg_catalog.clock_timestamp()+interval '120 seconds' WHERE singleton;
 request_id:=net.http_post(
  url:='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-worker',
  body:=pg_catalog.jsonb_build_object('action','drain'),
  headers:=pg_catalog.jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
  timeout_milliseconds:=90000);
 UPDATE supporter_private.pazo_paypal_live_worker_control SET last_dispatch_at=pg_catalog.clock_timestamp() WHERE singleton;
 RETURN request_id;
END $tick$;

REVOKE ALL ON FUNCTION supporter_private.pazo_live_worker_tick() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_worker_admit(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_worker_admit(text) TO service_role;
COMMIT;
