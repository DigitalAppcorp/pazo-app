-- Exact migration against PG17; fake Vault/network from the disposable lab.
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE PG17 ONLY'; END IF;
END $guard$;
\i supabase/migrations/20261021162301_pazo_f16_live_dispute_monitor.sql
BEGIN;
INSERT INTO supporter_private.pazo_paypal_live_checkout_intents(
 intent_id,owner_id,request_key,merchant_generation,plan_id,locale,terms_version,terms_digest,
 affirmative_consent,created_at,provider_create_claimed_at,provider_subscription_id,state)
SELECT 'intent-77777777-1234-4234-8234-123456789abc','12345678-1234-4234-8234-123456789abc',
 '77777777-1234-4234-8234-123456789abc',generation,plan_id,'es','pazo-supporter-live.test',repeat('b',64),
 true,'2026-10-01','2026-10-01','I-DISPUTE-MONITOR-TEST','bound'
 FROM admin_private.pazo_paypal_merchant_generations WHERE generation=1;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $seed$
DECLARE evidence jsonb;
BEGIN
 evidence:=jsonb_build_object('proofSource','paypal_live_postback_success','signedBodySha256',repeat('b',64),
  'webhookId','WH-12345678900','subscriptionId','I-DISPUTE-MONITOR-TEST','subjectId','9AB12345678901234',
  'providerEventAt','2026-10-01T12:00:01.000Z','subjectAt','2026-10-01T12:00:00.000Z',
  'activationAt',NULL,'nextBillingAt',NULL);
 IF public.pazo_f16_live_service_signed_event_queue('12345678-1234-4234-8234-123456789abc',
  'intent-77777777-1234-4234-8234-123456789abc','I-DISPUTE-MONITOR-TEST',1,'WH-DISPUTE-MONITOR-TEST',
  'PAYMENT.SALE.COMPLETED',evidence) NOT IN('queued','already_queued') THEN RAISE EXCEPTION 'signed fixture queue failed'; END IF;
END $seed$;
INSERT INTO supporter_private.pazo_paypal_live_paid_periods(sale_id,intent_id,merchant_generation,provider_event_id,
 cycle_key,service_start,service_end,merchant_verified_at)
VALUES('9AB12345678901234','intent-77777777-1234-4234-8234-123456789abc',1,'WH-DISPUTE-MONITOR-TEST',
 'DISPUTE_CYCLE_TEST','2026-10-01','2026-11-01',clock_timestamp());
-- This fixture's sale is settled; the monitor is scheduled separately.
UPDATE supporter_private.pazo_paypal_live_event_inbox SET processing_state='processed' WHERE provider_event_id='WH-DISPUTE-MONITOR-TEST';
CREATE FUNCTION supporter_private.synthetic_dispute_ack_crash() RETURNS trigger LANGUAGE plpgsql AS $fake$
BEGIN
 IF NEW.last_result='held' AND NEW.last_completed_lease IS NOT NULL AND current_setting('pazo.synthetic_dispute_crash',true)='yes'
 THEN RAISE EXCEPTION 'synthetic dispute acknowledgement crash' USING ERRCODE='P9998'; END IF;
 RETURN NEW;
END $fake$;
CREATE TRIGGER synthetic_dispute_ack_crash BEFORE UPDATE ON supporter_private.pazo_live_dispute_monitors
 FOR EACH ROW EXECUTE FUNCTION supporter_private.synthetic_dispute_ack_crash();
DO $monitor$
DECLARE batch uuid; lease uuid; admitted jsonb; claim jsonb; evidence jsonb; item jsonb; malformed jsonb;
 result text; request_id bigint; token text; before_count bigint;
BEGIN
 IF has_function_privilege('anon','public.pazo_f16_live_service_dispute_claim(uuid)','EXECUTE') OR
  has_function_privilege('authenticated','public.pazo_f16_live_service_dispute_finish(uuid,text,uuid,jsonb)','EXECUTE') OR
  has_table_privilege('service_role','supporter_private.pazo_live_dispute_cases','SELECT') OR
  has_function_privilege('service_role','supporter_private.pazo_live_enqueue_dispute_monitor()','EXECUTE')
 THEN RAISE EXCEPTION 'dispute ACL bypass'; END IF;
 IF public.pazo_f16_live_service_dispute_claim(gen_random_uuid()) IS NOT NULL THEN RAISE EXCEPTION 'disabled batch admitted'; END IF;
 UPDATE supporter_private.pazo_paypal_live_worker_control SET enabled=true,processing_enabled=true WHERE singleton;
 request_id:=supporter_private.pazo_live_worker_tick();
 SELECT substr(headers->>'Authorization',8) INTO token FROM net.synthetic_requests WHERE id=request_id;
 admitted:=public.pazo_f16_live_service_worker_admit(token);batch:=(admitted->>'leaseToken')::uuid;
 IF admitted->>'monitorDue'<>'true' OR admitted->'event'<>'null'::jsonb THEN RAISE EXCEPTION 'monitor fairness admission missing'; END IF;
 claim:=public.pazo_f16_live_service_dispute_claim(batch);lease:=(claim->>'leaseToken')::uuid;
 IF claim->>'saleId'<>'9AB12345678901234' OR claim->>'merchantGeneration'<>'1' OR
  claim->>'originalPaymentAt'<>'2026-10-01T12:00:00.000Z' OR lease IS NULL OR
  public.pazo_f16_live_service_dispute_claim(batch) IS NOT NULL OR
  public.pazo_f16_live_service_dispute_claim(gen_random_uuid()) IS NOT NULL
 THEN RAISE EXCEPTION 'original dispute claim/one candidate per batch failed'; END IF;
 evidence:=jsonb_build_object('verified',true,'coverageComplete',true,'saleId','9AB12345678901234',
  'originalPaymentAt','2026-10-01T12:00:00.000Z','source','original_generation_paypal_disputes_get','cases','[]'::jsonb);
 IF public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',gen_random_uuid(),evidence)<>'dispute_lease_unverified'
 THEN RAISE EXCEPTION 'wrong monitor lease accepted'; END IF;
 FOR malformed IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
  'null'::jsonb,'[]'::jsonb,'{}'::jsonb,evidence||'{"coverageComplete":null}'::jsonb,
  evidence||'{"saleId":"UNRELATED"}'::jsonb,evidence||'{"cases":null}'::jsonb,
  evidence||'{"payer_email":"PRIVATE"}'::jsonb)) LOOP
  IF public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,malformed)<>'dispute_evidence_invalid'
  THEN RAISE EXCEPTION 'malformed evidence accepted'; END IF;
 END LOOP;
 -- SQL must not turn RESOLVED + NULL outcome into a full hold through
 -- three-valued boolean logic, even if a faulty service sends that decision.
 item:=jsonb_build_object('disputeId','PP-D-NULL-123','providerUpdatedAt','2026-10-03T00:00:00.000Z',
  'status','RESOLVED','outcome',NULL,'disputedMinor',299,'decision','hold');
 IF public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,
   jsonb_set(evidence,'{cases}',jsonb_build_array(item)))<>'dispute_case_invalid'
 THEN RAISE EXCEPTION 'NULL resolved outcome created arbitrary full hold'; END IF;
 result:=public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence);
 IF result<>'recorded' OR public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence)<>'already_recorded' OR
  NOT (SELECT ever_clear FROM supporter_private.pazo_live_dispute_monitors WHERE sale_id='9AB12345678901234')
 THEN RAISE EXCEPTION 'dispute clear/idempotency failed'; END IF;
 -- New private batch, same original sale. Partial case must retain coverage.
 batch:=gen_random_uuid();UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=batch,drain_expires_at=clock_timestamp()+interval '3 minutes' WHERE singleton;
 UPDATE supporter_private.pazo_live_dispute_monitors SET next_check_at=clock_timestamp()-interval '1 second' WHERE sale_id='9AB12345678901234';
 lease:=(public.pazo_f16_live_service_dispute_claim(batch)->>'leaseToken')::uuid;
 item:=jsonb_build_object('disputeId','PP-D-1234567','providerUpdatedAt','2026-10-03T00:00:00.000Z',
  'status','OPEN','outcome',NULL,'disputedMinor',100,'decision','review');
 evidence:=jsonb_set(evidence,'{cases}',jsonb_build_array(item));
 result:=public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence);
 IF result<>'recorded' OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds WHERE sale_id='9AB12345678901234') OR
  NOT (SELECT ever_clear AND last_result='review' FROM supporter_private.pazo_live_dispute_monitors WHERE sale_id='9AB12345678901234')
 THEN RAISE EXCEPTION 'partial dispute invariant failed: result %, monitor %, holds %',result,
  (SELECT jsonb_build_object('clear',ever_clear,'result',last_result,'lease',lease_token IS NOT NULL)
   FROM supporter_private.pazo_live_dispute_monitors WHERE sale_id='9AB12345678901234'),
  (SELECT count(*) FROM supporter_private.pazo_paypal_live_period_holds WHERE sale_id='9AB12345678901234'); END IF;
 -- A newer full open dispute holds the original period.
 batch:=gen_random_uuid();UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=batch WHERE singleton;
 UPDATE supporter_private.pazo_live_dispute_monitors SET next_check_at=clock_timestamp()-interval '1 second' WHERE sale_id='9AB12345678901234';
 lease:=(public.pazo_f16_live_service_dispute_claim(batch)->>'leaseToken')::uuid;
 item:=item||'{"providerUpdatedAt":"2026-10-04T00:00:00.000Z","disputedMinor":299,"decision":"hold"}'::jsonb;
 evidence:=jsonb_set(evidence,'{cases}',jsonb_build_array(item));
 result:=public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence);
 IF result<>'recorded' OR
  NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds WHERE sale_id='9AB12345678901234' AND released_at IS NULL)
 THEN RAISE EXCEPTION 'verified full dispute failed to hold original period'; END IF;
 -- Empty list cannot erase a known case. Expired monitor lease cannot write.
 batch:=gen_random_uuid();UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=batch WHERE singleton;
 UPDATE supporter_private.pazo_live_dispute_monitors SET next_check_at=clock_timestamp()-interval '1 second' WHERE sale_id='9AB12345678901234';
 lease:=(public.pazo_f16_live_service_dispute_claim(batch)->>'leaseToken')::uuid;
 IF public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,jsonb_set(evidence,'{cases}','[]'))<>'dispute_coverage_incomplete'
 THEN RAISE EXCEPTION 'disappeared dispute released hold'; END IF;
 item:=item||'{"providerUpdatedAt":"2026-10-05T00:00:00.000Z","status":"RESOLVED","outcome":"RESOLVED_SELLER_FAVOUR","decision":"clear"}'::jsonb;
 evidence:=jsonb_set(evidence,'{cases}',jsonb_build_array(item));
 UPDATE supporter_private.pazo_live_dispute_monitors SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE sale_id='9AB12345678901234';
 IF public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence)<>'dispute_lease_unverified'
 THEN RAISE EXCEPTION 'expired monitor released hold'; END IF;
 UPDATE supporter_private.pazo_live_dispute_monitors SET lease_expires_at=clock_timestamp()+interval '1 minute' WHERE sale_id='9AB12345678901234';
 result:=public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence);
 IF result<>'recorded' OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds WHERE sale_id='9AB12345678901234' AND released_at IS NULL)
 THEN RAISE EXCEPTION 'corroborated seller win failed to release own dispute hold'; END IF;
 -- Crash after hold insertion, before ACK, rolls back case and hold together.
 batch:=gen_random_uuid();UPDATE supporter_private.pazo_paypal_live_worker_control SET drain_token=batch WHERE singleton;
 UPDATE supporter_private.pazo_live_dispute_monitors SET next_check_at=clock_timestamp()-interval '1 second' WHERE sale_id='9AB12345678901234';
 lease:=(public.pazo_f16_live_service_dispute_claim(batch)->>'leaseToken')::uuid;
 item:=item||'{"disputeId":"PP-D-CRASH-123","providerUpdatedAt":"2026-10-06T00:00:00.000Z","status":"OPEN","outcome":null,"decision":"hold"}'::jsonb;
 evidence:=jsonb_set(evidence,'{cases}',(evidence->'cases')||jsonb_build_array(item));
 PERFORM set_config('pazo.synthetic_dispute_crash','yes',true);
 BEGIN
  PERFORM public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,evidence);
  RAISE EXCEPTION 'injected dispute crash ignored';
 EXCEPTION WHEN SQLSTATE 'P9998' THEN NULL; END;
 PERFORM set_config('pazo.synthetic_dispute_crash','no',true);
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_cases WHERE dispute_id='PP-D-CRASH-123') OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds WHERE hold_id='dispute.PP-D-CRASH-123') OR
  NOT EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_monitors WHERE sale_id='9AB12345678901234' AND lease_token=lease)
 THEN RAISE EXCEPTION 'partial dispute transaction survived acknowledgement crash'; END IF;
 -- Provider unavailable schedules retry and preserves prior paid coverage.
 result:=public.pazo_f16_live_service_dispute_finish(batch,'9AB12345678901234',lease,NULL);
 IF result<>'recorded' OR
  NOT EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_monitors WHERE sale_id='9AB12345678901234'
   AND last_result='unavailable' AND ever_clear AND next_check_at>clock_timestamp()+interval '4 minutes')
 THEN RAISE EXCEPTION 'provider outage became absence or revoked coverage'; END IF;
 RAISE NOTICE 'F16_DISPUTE_MONITOR_PG17_ACL_LEASE_REVIEW_HOLD_RELEASE_CRASH_PASS';
END $monitor$;
ROLLBACK;
\i supabase/rollbacks/f16_live_worker_single_use_dispatch_DISABLE_ONLY.sql
DO $disabled$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_monitors) OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_live_dispute_cases) OR
  supporter_private.pazo_live_worker_tick() IS NOT NULL
 THEN RAISE EXCEPTION 'dispute fixture rollback or disabled scheduler failed'; END IF;
 RAISE NOTICE 'F16_DISPUTE_MONITOR_FIXTURE_ROLLBACK_PASS';
END $disabled$;
