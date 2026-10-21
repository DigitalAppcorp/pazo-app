-- Private worker control. No cron/network extension yet; no processing enabled.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF to_regprocedure('vault.create_secret(text,text,text,uuid)') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_leased_lifecycle_record(bigint,text,uuid,text,timestamptz)') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_worker_control') IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
  OR (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid=to_regprocedure(
   'public.pazo_f16_live_service_inbox_claim(bigint,text)')) IS DISTINCT FROM '642e6663ae517e30ac9f0250df6a01c4'
 THEN RAISE EXCEPTION 'private worker prerequisite drift'; END IF;
END $guard$;
CREATE TABLE supporter_private.pazo_paypal_live_worker_control(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 processing_enabled boolean NOT NULL DEFAULT false CHECK(NOT processing_enabled OR enabled),
 invoker_vault_id uuid NOT NULL UNIQUE,
 invoker_sha256 bytea NOT NULL CHECK(pg_catalog.octet_length(invoker_sha256)=32),
 expected_build text NOT NULL DEFAULT 'pazo_live_worker_v1' CHECK(expected_build='pazo_live_worker_v1'),
 drain_token uuid,drain_expires_at timestamptz,
 last_admitted_at timestamptz,last_heartbeat_at timestamptz,last_dispatch_at timestamptz,
 last_outcome text CHECK(last_outcome IN('idle','processed','retry','review','unknown')),
 last_code text CHECK(last_code ~ '^[a-z][a-z0-9_]{2,100}$'),
 completed_runs bigint NOT NULL DEFAULT 0 CHECK(completed_runs>=0),
 processed_events bigint NOT NULL DEFAULT 0 CHECK(processed_events>=0),
 CHECK((drain_token IS NULL AND drain_expires_at IS NULL) OR
  (drain_token IS NOT NULL AND drain_expires_at IS NOT NULL))
);
ALTER TABLE supporter_private.pazo_paypal_live_worker_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_worker_control FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_worker_control FROM PUBLIC,anon,authenticated,service_role;
DO $invoker$
DECLARE token text; vault_id uuid;
BEGIN
 -- Two independent random UUIDs, 244 random bits. Never leaves server memory
 -- in clear; encrypted Vault custody and a comparison hash are persisted.
 token:=pg_catalog.replace(pg_catalog.gen_random_uuid()::text||pg_catalog.gen_random_uuid()::text,'-','');
 vault_id:=vault.create_secret(token,NULL,'PAZO private Live worker invoker');
 INSERT INTO supporter_private.pazo_paypal_live_worker_control(singleton,invoker_vault_id,invoker_sha256)
 VALUES(true,vault_id,pg_catalog.sha256(pg_catalog.convert_to(token,'UTF8')));
END $invoker$;
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox
 ADD COLUMN retry_after timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 ADD COLUMN last_diagnostic_code text CHECK(last_diagnostic_code ~ '^[a-z][a-z0-9_]{2,100}$');
CREATE INDEX pazo_live_worker_due ON supporter_private.pazo_paypal_live_event_inbox(retry_after,verified_at)
 WHERE processing_state IN('pending','processing');

CREATE FUNCTION public.pazo_f16_live_service_worker_admit(p_invoker text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $admit$
DECLARE c supporter_private.pazo_paypal_live_worker_control%ROWTYPE; due jsonb; token uuid;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_invoker IS NULL OR p_invoker !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
 SELECT * INTO c FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton FOR UPDATE SKIP LOCKED;
 IF NOT FOUND OR c.invoker_sha256 IS DISTINCT FROM pg_catalog.sha256(pg_catalog.convert_to(p_invoker,'UTF8'))
 THEN RETURN NULL; END IF;
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

CREATE FUNCTION public.pazo_f16_live_service_worker_claim(p_generation bigint,p_event_id text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $claim$
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
  WHERE singleton AND enabled AND processing_enabled AND drain_expires_at>=pg_catalog.clock_timestamp())
 THEN RETURN NULL; END IF;
 PERFORM 1 FROM supporter_private.pazo_paypal_live_event_inbox e
 WHERE e.merchant_generation=p_generation AND e.provider_event_id=p_event_id
  AND e.retry_after<=pg_catalog.clock_timestamp() FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN public.pazo_f16_live_service_inbox_claim(p_generation,p_event_id);
END $claim$;

CREATE FUNCTION public.pazo_f16_live_service_worker_event_finish(
 p_generation bigint,p_event_id text,p_lease uuid,p_result text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $finish$
DECLARE attempts integer; result text; ok boolean;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_result IS NULL OR p_result NOT IN('pending','held') THEN RETURN false; END IF;
 SELECT claim_attempts INTO attempts FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 result:=CASE WHEN p_result='pending' AND attempts>=3 THEN 'held' ELSE p_result END;
 ok:=public.pazo_f16_live_service_inbox_finish(p_generation,p_event_id,p_lease,result);
 IF ok THEN
  UPDATE supporter_private.pazo_paypal_live_event_inbox SET
   retry_after=pg_catalog.clock_timestamp()+CASE WHEN attempts<=1 THEN interval '1 minute' ELSE interval '5 minutes' END,
   last_diagnostic_code=CASE WHEN attempts>=3 THEN 'worker_retry_exhausted'
    WHEN result='pending' THEN 'worker_retry_scheduled' ELSE 'worker_review_required' END
  WHERE merchant_generation=p_generation AND provider_event_id=p_event_id;
 END IF;
 RETURN ok;
END $finish$;

CREATE FUNCTION public.pazo_f16_live_service_worker_complete(
 p_lease uuid,p_outcome text,p_code text,p_build text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $complete$
DECLARE changed integer;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_lease IS NULL OR p_outcome IS NULL OR p_outcome NOT IN('idle','processed','retry','review','unknown')
  OR p_code IS NULL OR p_code !~ '^[a-z][a-z0-9_]{2,100}$' OR p_build IS NULL THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=NULL,drain_expires_at=NULL,
  last_heartbeat_at=pg_catalog.clock_timestamp(),last_outcome=p_outcome,last_code=p_code,
  completed_runs=completed_runs+1,processed_events=processed_events+CASE WHEN p_outcome='processed' THEN 1 ELSE 0 END
 WHERE singleton AND enabled AND drain_token=p_lease AND drain_expires_at>=pg_catalog.clock_timestamp()
  AND expected_build=p_build;
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $complete$;

CREATE FUNCTION public.pazo_f16_live_service_worker_health_read()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $health$
DECLARE result jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object('source','private_live_worker_health','enabled',c.enabled,
  'processingAllowed',c.processing_enabled,'expectedBuild',c.expected_build,
  'healthy',c.enabled AND COALESCE(c.last_heartbeat_at>=pg_catalog.clock_timestamp()-interval '5 minutes',false),
  'lastHeartbeatAt',pg_catalog.to_char(c.last_heartbeat_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'lastDispatchAt',pg_catalog.to_char(c.last_dispatch_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'lastOutcome',c.last_outcome,'lastCode',c.last_code,'completedRuns',c.completed_runs,
  'processedEvents',c.processed_events,'pending',(SELECT count(*) FROM supporter_private.pazo_paypal_live_event_inbox
   WHERE processing_state IN('pending','processing')),'held',(SELECT count(*) FROM supporter_private.pazo_paypal_live_event_inbox
   WHERE processing_state='held')) INTO result FROM supporter_private.pazo_paypal_live_worker_control c WHERE c.singleton;
 RETURN result;
END $health$;

ALTER FUNCTION public.pazo_f16_live_service_worker_admit(text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_worker_claim(bigint,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_worker_event_finish(bigint,text,uuid,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_worker_complete(uuid,text,text,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_worker_health_read() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_worker_admit(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_worker_claim(bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_worker_event_finish(bigint,text,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_worker_complete(uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_worker_health_read() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_worker_admit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_worker_claim(bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_worker_event_finish(bigint,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_worker_complete(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_worker_health_read() TO service_role;
-- All real worker traffic uses due/backoff wrappers; no non-leased bypass.
REVOKE EXECUTE ON FUNCTION public.pazo_f16_live_service_inbox_claim(bigint,text) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text) FROM service_role;
COMMIT;
