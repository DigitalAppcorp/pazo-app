-- GET-only dispute monitoring of signed, already-recorded original Live sales.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE supporter_private.pazo_paypal_live_worker_control IN ACCESS EXCLUSIVE MODE;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
  WHERE singleton AND NOT processing_enabled AND drain_token IS NULL)
  OR to_regclass('supporter_private.pazo_live_dispute_monitors') IS NOT NULL
  OR (SELECT md5(replace(prosrc,E'\r','')) FROM pg_proc
   WHERE oid='public.pazo_f16_live_service_worker_admit(text)'::regprocedure) IS DISTINCT FROM '021b5eaa04d16dc01c583d757cbdb365'
 THEN RAISE EXCEPTION 'dispute monitor prerequisite drift'; END IF;
END $guard$;
-- Stop health dispatch until the reviewed v2 worker is installed. An old
-- transport must never report a new monitoring protocol as healthy.
ALTER TABLE supporter_private.pazo_paypal_live_worker_control
 DROP CONSTRAINT pazo_paypal_live_worker_control_expected_build_check,
 ALTER COLUMN expected_build SET DEFAULT 'pazo_live_worker_v2';
UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=false,expected_build='pazo_live_worker_v2',
 dispatch_sha256=NULL,dispatch_expires_at=NULL,last_heartbeat_at=NULL,last_code='worker_upgrade_pending' WHERE singleton;
ALTER TABLE supporter_private.pazo_paypal_live_worker_control
 ADD CONSTRAINT pazo_paypal_live_worker_control_expected_build_check CHECK(expected_build='pazo_live_worker_v2');
CREATE TABLE supporter_private.pazo_live_dispute_monitors(
 sale_id text PRIMARY KEY REFERENCES supporter_private.pazo_paypal_live_paid_periods(sale_id),
 next_check_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 last_checked_at timestamptz,
 last_result text NOT NULL DEFAULT 'pending' CHECK(last_result IN('pending','clear','held','review','unavailable')),
 ever_clear boolean NOT NULL DEFAULT false,
 lease_token uuid,lease_expires_at timestamptz,batch_token uuid UNIQUE,last_completed_lease uuid,last_evidence_sha256 bytea,
 CHECK((lease_token IS NULL)=(lease_expires_at IS NULL))
);
CREATE INDEX pazo_live_dispute_due ON supporter_private.pazo_live_dispute_monitors(next_check_at,sale_id);
CREATE TABLE supporter_private.pazo_live_dispute_cases(
 merchant_generation bigint NOT NULL,
 dispute_id text NOT NULL CHECK(dispute_id ~ '^[A-Za-z0-9-]{3,100}$'),
 sale_id text NOT NULL REFERENCES supporter_private.pazo_paypal_live_paid_periods(sale_id),
 provider_updated_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN('OPEN','WAITING_FOR_BUYER_RESPONSE','WAITING_FOR_SELLER_RESPONSE','UNDER_REVIEW','RESOLVED','OTHER')),
 outcome text CHECK(outcome IN('RESOLVED_BUYER_FAVOUR','RESOLVED_SELLER_FAVOUR','RESOLVED_WITH_PAYOUT','CANCELED_BY_BUYER','ACCEPTED','DENIED','NONE')),
 disputed_minor integer NOT NULL CHECK(disputed_minor BETWEEN 0 AND 299),
 decision text NOT NULL CHECK(decision IN('clear','hold','review')),
 observed_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(merchant_generation,dispute_id),UNIQUE(sale_id,dispute_id)
);
ALTER TABLE supporter_private.pazo_live_dispute_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_live_dispute_monitors FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_live_dispute_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_live_dispute_cases FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_live_dispute_monitors,supporter_private.pazo_live_dispute_cases
 FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION supporter_private.pazo_live_enqueue_dispute_monitor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $enqueue$
BEGIN
 INSERT INTO supporter_private.pazo_live_dispute_monitors(sale_id) VALUES(NEW.sale_id) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $enqueue$;
REVOKE ALL ON FUNCTION supporter_private.pazo_live_enqueue_dispute_monitor() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER pazo_live_dispute_monitor_enqueue AFTER INSERT ON supporter_private.pazo_paypal_live_paid_periods
 FOR EACH ROW EXECUTE FUNCTION supporter_private.pazo_live_enqueue_dispute_monitor();
INSERT INTO supporter_private.pazo_live_dispute_monitors(sale_id)
 SELECT sale_id FROM supporter_private.pazo_paypal_live_paid_periods;

CREATE FUNCTION public.pazo_f16_live_service_dispute_claim(p_batch uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $claim$
DECLARE m supporter_private.pazo_live_dispute_monitors%ROWTYPE; original jsonb; token uuid;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled
  AND p_batch IS NOT NULL AND drain_token=p_batch AND drain_expires_at>=pg_catalog.clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_monitors WHERE batch_token=p_batch) THEN RETURN NULL; END IF;
 SELECT * INTO m FROM supporter_private.pazo_live_dispute_monitors
 WHERE next_check_at<=pg_catalog.clock_timestamp() AND (lease_token IS NULL OR lease_expires_at<pg_catalog.clock_timestamp())
 ORDER BY next_check_at,sale_id LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT pg_catalog.jsonb_build_object('saleId',p.sale_id,'merchantGeneration',p.merchant_generation,
  'subscriptionId',i.provider_subscription_id,'intentId',i.intent_id,'planId',i.plan_id,
  'originalPaymentAt',pg_catalog.to_char(r.subject_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'knownDisputeIds',COALESCE((SELECT pg_catalog.jsonb_agg(d.dispute_id ORDER BY d.dispute_id)
   FROM supporter_private.pazo_live_dispute_cases d WHERE d.sale_id=p.sale_id),'[]'::jsonb)) INTO original
 FROM supporter_private.pazo_paypal_live_paid_periods p
 JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
 JOIN supporter_private.pazo_paypal_live_signed_receipts r ON r.merchant_generation=p.merchant_generation
  AND r.provider_event_id=p.provider_event_id AND r.event_type='PAYMENT.SALE.COMPLETED' AND r.subject_id=p.sale_id
  AND r.subscription_id=i.provider_subscription_id AND r.proof_source='paypal_live_postback_success'
 WHERE p.sale_id=m.sale_id AND i.state='bound';
 IF original IS NULL THEN
  UPDATE supporter_private.pazo_live_dispute_monitors SET last_result='review',
   last_checked_at=pg_catalog.clock_timestamp(),next_check_at=pg_catalog.clock_timestamp()+interval '1 day',batch_token=p_batch
  WHERE sale_id=m.sale_id;
  RETURN pg_catalog.jsonb_build_object('state','REVIEW_REQUIRED','code','dispute_signed_sale_missing');
 END IF;
 token:=pg_catalog.gen_random_uuid();
 UPDATE supporter_private.pazo_live_dispute_monitors SET lease_token=token,
  lease_expires_at=pg_catalog.clock_timestamp()+interval '2 minutes',batch_token=p_batch WHERE sale_id=m.sale_id;
 RETURN original||pg_catalog.jsonb_build_object('source','private_original_live_dispute_claim','leaseToken',token);
END $claim$;

CREATE FUNCTION public.pazo_f16_live_service_dispute_finish(p_batch uuid,p_sale text,p_lease uuid,p_evidence jsonb)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $finish$
DECLARE m supporter_private.pazo_live_dispute_monitors%ROWTYPE; p supporter_private.pazo_paypal_live_paid_periods%ROWTYPE;
 item jsonb; previous supporter_private.pazo_live_dispute_cases%ROWTYPE; at timestamptz; original_at timestamptz;
 result text:='clear'; n integer; digest bytea; canonical CONSTANT text:='YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND enabled AND processing_enabled
  AND p_batch IS NOT NULL AND drain_token=p_batch AND drain_expires_at>=pg_catalog.clock_timestamp() FOR UPDATE;
 IF NOT FOUND OR p_sale IS NULL OR p_lease IS NULL THEN RETURN 'dispute_batch_unverified'; END IF;
 SELECT * INTO m FROM supporter_private.pazo_live_dispute_monitors WHERE sale_id=p_sale FOR UPDATE;
 IF NOT FOUND THEN RETURN 'dispute_original_sale_missing'; END IF;
 digest:=pg_catalog.sha256(pg_catalog.convert_to(COALESCE(p_evidence::text,'null'),'UTF8'));
 IF m.batch_token IS DISTINCT FROM p_batch THEN RETURN 'dispute_batch_unverified'; END IF;
 IF m.last_completed_lease=p_lease AND m.last_evidence_sha256=digest THEN RETURN 'already_recorded'; END IF;
 IF m.lease_token IS DISTINCT FROM p_lease OR m.lease_expires_at<pg_catalog.clock_timestamp()
 THEN RETURN 'dispute_lease_unverified'; END IF;
 SELECT * INTO p FROM supporter_private.pazo_paypal_live_paid_periods WHERE sale_id=p_sale FOR UPDATE;
 SELECT r.subject_at INTO original_at FROM supporter_private.pazo_paypal_live_signed_receipts r
 WHERE r.merchant_generation=p.merchant_generation AND r.provider_event_id=p.provider_event_id
  AND r.subject_id=p.sale_id AND r.event_type='PAYMENT.SALE.COMPLETED';
 IF original_at IS NULL THEN RETURN 'dispute_signed_sale_missing'; END IF;
 IF p_evidence IS NOT NULL THEN
  IF pg_catalog.jsonb_typeof(p_evidence) IS DISTINCT FROM 'object' THEN RETURN 'dispute_evidence_invalid'; END IF;
  IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_evidence))<>6 OR
   NOT (p_evidence ?& ARRAY['verified','coverageComplete','saleId','originalPaymentAt','source','cases']) OR
   p_evidence->'verified' IS DISTINCT FROM 'true'::jsonb OR p_evidence->'coverageComplete' IS DISTINCT FROM 'true'::jsonb OR
   p_evidence->>'saleId' IS DISTINCT FROM p_sale OR
   p_evidence->>'originalPaymentAt' IS DISTINCT FROM pg_catalog.to_char(original_at AT TIME ZONE 'UTC',canonical) OR
   p_evidence->>'source' IS DISTINCT FROM 'original_generation_paypal_disputes_get' OR
   pg_catalog.jsonb_typeof(p_evidence->'cases') IS DISTINCT FROM 'array'
  THEN RETURN 'dispute_evidence_invalid'; END IF;
  IF pg_catalog.jsonb_array_length(p_evidence->'cases')>20 THEN RETURN 'dispute_evidence_invalid'; END IF;
  SELECT count(DISTINCT v->>'disputeId') INTO n FROM pg_catalog.jsonb_array_elements(p_evidence->'cases') v;
  IF n<>pg_catalog.jsonb_array_length(p_evidence->'cases') OR EXISTS(
   SELECT 1 FROM supporter_private.pazo_live_dispute_cases d WHERE d.sale_id=p_sale AND NOT EXISTS(
    SELECT 1 FROM pg_catalog.jsonb_array_elements(p_evidence->'cases') v WHERE v->>'disputeId'=d.dispute_id))
  THEN RETURN 'dispute_coverage_incomplete'; END IF;
  -- Validate every case before the first mutation. Stale/conflicting responses
  -- cannot release a hold or partially commit another case in this batch.
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_evidence->'cases') LOOP
   IF pg_catalog.jsonb_typeof(item) IS DISTINCT FROM 'object' THEN RETURN 'dispute_case_invalid'; END IF;
   IF (SELECT count(*) FROM pg_catalog.jsonb_object_keys(item))<>6 OR
    NOT (item ?& ARRAY['disputeId','providerUpdatedAt','status','outcome','disputedMinor','decision']) OR
    EXISTS(SELECT 1 FROM pg_catalog.jsonb_each(item) x WHERE x.key<>'outcome' AND x.key<>'disputedMinor'
     AND pg_catalog.jsonb_typeof(x.value)<>'string') OR
    pg_catalog.jsonb_typeof(item->'outcome') NOT IN('string','null') OR
    item->>'disputeId' !~ '^[A-Za-z0-9-]{3,100}$' OR
    item->>'providerUpdatedAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$' OR
    item->>'status' NOT IN('OPEN','WAITING_FOR_BUYER_RESPONSE','WAITING_FOR_SELLER_RESPONSE','UNDER_REVIEW','RESOLVED','OTHER') OR
    (item->>'outcome' IS NOT NULL AND item->>'outcome' NOT IN('RESOLVED_BUYER_FAVOUR','RESOLVED_SELLER_FAVOUR','RESOLVED_WITH_PAYOUT','CANCELED_BY_BUYER','ACCEPTED','DENIED','NONE')) OR
    pg_catalog.jsonb_typeof(item->'disputedMinor') IS DISTINCT FROM 'number' OR item->>'disputedMinor' !~ '^[0-9]{1,3}$' OR
    item->>'decision' NOT IN('clear','hold','review')
   THEN RETURN 'dispute_case_invalid'; END IF;
   IF (item->>'disputedMinor')::int>299 THEN RETURN 'dispute_case_invalid'; END IF;
   BEGIN at:=(item->>'providerUpdatedAt')::timestamptz;
   EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN 'dispute_case_invalid'; END;
   IF pg_catalog.to_char(at AT TIME ZONE 'UTC',canonical)<>item->>'providerUpdatedAt' OR at<original_at OR
    at>pg_catalog.clock_timestamp()+interval '5 minutes' OR
    (item->>'decision' IN('clear','hold') AND (item->>'disputedMinor')::int<>299) OR
    (item->>'decision'='clear' AND (item->>'status'<>'RESOLVED' OR COALESCE(item->>'outcome','') NOT IN('RESOLVED_SELLER_FAVOUR','CANCELED_BY_BUYER'))) OR
    (item->>'decision'='hold' AND NOT (item->>'status' IN('OPEN','WAITING_FOR_BUYER_RESPONSE','WAITING_FOR_SELLER_RESPONSE','UNDER_REVIEW') OR
      (item->>'status'='RESOLVED' AND COALESCE(item->>'outcome','')='RESOLVED_BUYER_FAVOUR')))
   THEN RETURN 'dispute_case_invalid'; END IF;
   SELECT * INTO previous FROM supporter_private.pazo_live_dispute_cases
   WHERE merchant_generation=p.merchant_generation AND dispute_id=item->>'disputeId';
   IF FOUND AND (previous.sale_id<>p_sale OR previous.provider_updated_at>at OR
    (previous.provider_updated_at=at AND (previous.status<>item->>'status' OR previous.outcome IS DISTINCT FROM item->>'outcome'
     OR previous.disputed_minor<>(item->>'disputedMinor')::int OR previous.decision<>item->>'decision')))
   THEN RETURN 'dispute_case_conflict'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_evidence->'cases') LOOP
   INSERT INTO supporter_private.pazo_live_dispute_cases(merchant_generation,dispute_id,sale_id,provider_updated_at,status,outcome,disputed_minor,decision)
   VALUES(p.merchant_generation,item->>'disputeId',p_sale,(item->>'providerUpdatedAt')::timestamptz,
    item->>'status',item->>'outcome',(item->>'disputedMinor')::int,item->>'decision')
   ON CONFLICT(merchant_generation,dispute_id) DO UPDATE SET provider_updated_at=EXCLUDED.provider_updated_at,
    status=EXCLUDED.status,outcome=EXCLUDED.outcome,disputed_minor=EXCLUDED.disputed_minor,
    decision=EXCLUDED.decision,observed_at=pg_catalog.clock_timestamp();
   IF item->>'decision'='hold' THEN
    INSERT INTO supporter_private.pazo_paypal_live_period_holds(sale_id,hold_id,kind,verified_at,merchant_generation)
    VALUES(p_sale,'dispute.'||(item->>'disputeId'),'dispute',pg_catalog.clock_timestamp(),p.merchant_generation)
    ON CONFLICT(sale_id,hold_id) DO UPDATE SET released_at=NULL,verified_at=pg_catalog.clock_timestamp()
     WHERE pazo_paypal_live_period_holds.kind='dispute';
    result:='held';
   ELSIF item->>'decision'='clear' THEN
    UPDATE supporter_private.pazo_paypal_live_period_holds SET released_at=pg_catalog.clock_timestamp()
    WHERE sale_id=p_sale AND hold_id='dispute.'||(item->>'disputeId') AND kind='dispute' AND released_at IS NULL;
   ELSIF result<>'held' THEN result:='review'; END IF;
  END LOOP;
 ELSE result:='unavailable'; END IF;
 UPDATE supporter_private.pazo_live_dispute_monitors SET last_checked_at=pg_catalog.clock_timestamp(),last_result=result,
  ever_clear=ever_clear OR result='clear',lease_token=NULL,lease_expires_at=NULL,
  last_completed_lease=p_lease,last_evidence_sha256=digest,
  next_check_at=pg_catalog.clock_timestamp()+CASE WHEN result<>'clear' THEN interval '5 minutes'
   WHEN p.service_end>pg_catalog.clock_timestamp() THEN interval '30 minutes' ELSE interval '1 day' END
 WHERE sale_id=p_sale;
 RETURN 'recorded';
END $finish$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_dispute_claim(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_dispute_finish(uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_dispute_claim(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_dispute_finish(uuid,text,uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_worker_admit(p_invoker text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $admit$
DECLARE c supporter_private.pazo_paypal_live_worker_control%ROWTYPE; due jsonb; token uuid; monitor_due boolean:=false;
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
  SELECT EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_monitors m
   WHERE m.next_check_at<=pg_catalog.clock_timestamp() AND
    (m.lease_token IS NULL OR m.lease_expires_at<pg_catalog.clock_timestamp())) INTO monitor_due;
  -- Reserve one in five busy batches for monitoring, so renewals cannot starve disputes.
  IF due IS NOT NULL AND c.completed_runs%5<>0 THEN monitor_due:=false; END IF;
  IF monitor_due THEN due:=NULL; END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('authenticated',true,'enabled',true,'busy',false,
  'processingAllowed',c.processing_enabled,'leaseToken',token,'expectedBuild',c.expected_build,'event',due,'monitorDue',monitor_due);
END $admit$;



COMMIT;
