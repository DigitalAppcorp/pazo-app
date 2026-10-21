-- PAZO F16-P05: synthetic retry/quarantine finish; NEVER posted to hosted.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 ev text := 'WH-FINISH-SYNTHETIC-001';
 exhausted text := 'WH-FINISH-EXHAUSTED-001';
 expired text := 'WH-FINISH-EXPIRED-001';
 first jsonb; second jsonb; proof jsonb; token uuid;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
   OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P05 finish tests restricted to disposable DB'; END IF;
 INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type,verified_at,processing_state,next_attempt_at)
 VALUES
  (ev,'PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp()-interval '30 seconds',
    'pending',pg_catalog.clock_timestamp()-interval '1 second'),
  (exhausted,'PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp()-interval '29 seconds',
    'pending',pg_catalog.clock_timestamp()+interval '10 hours'),
  (expired,'PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp()-interval '28 seconds',
    'pending',pg_catalog.clock_timestamp()+interval '10 hours');

 IF public.f16_p05_draft_finish_claimed_event(ev,pg_catalog.gen_random_uuid(),
  'review','manual_review') THEN
   RAISE EXCEPTION 'P05 unclaimed finish unexpectedly succeeded'; END IF;
 UPDATE supporter_private.p05_inbox_worker_gate
 SET enabled=true,not_before=pg_catalog.clock_timestamp()-interval '2 minutes'
 WHERE id=1;
 first:=public.f16_p05_draft_claim_next_verified_event();
 IF first IS NULL OR first->>'eventId'<>ev
 THEN RAISE EXCEPTION 'P05 first claim for finish missing'; END IF;
 token:=(first->>'leaseToken')::uuid;
 IF public.f16_p05_draft_finish_claimed_event(ev,pg_catalog.gen_random_uuid(),
  'review','manual_review') THEN
  RAISE EXCEPTION 'P05 wrong token finalized claim'; END IF;

 -- Never accept untrusted arbitrary error strings as financial audit reasons.
 BEGIN
  PERFORM public.f16_p05_draft_finish_claimed_event(ev,token,
   'processed','manual_review');
  RAISE EXCEPTION 'P05 processed outcome became callable';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_p05_draft_finish_claimed_event(ev,token,
   'retry','private@example.com');
  RAISE EXCEPTION 'P05 PII reason became callable';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;
 BEGIN
  PERFORM public.f16_p05_draft_finish_claimed_event(ev,token,
   'review',NULL);
  RAISE EXCEPTION 'P05 null reason became callable';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
 END;

 IF NOT public.f16_p05_draft_finish_claimed_event(
  ev,token,'retry','merchant_unavailable')
 THEN RAISE EXCEPTION 'P05 retry with valid lease failed'; END IF;
 IF public.f16_p05_draft_finish_claimed_event(
  ev,token,'retry','merchant_unavailable')
 THEN RAISE EXCEPTION 'P05 duplicate retry succeeded'; END IF;
 IF EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id=ev
    AND (processing_state<>'pending' OR p05_claim_token IS NOT NULL
     OR next_attempt_at<=pg_catalog.clock_timestamp()
     OR processed_at IS NOT NULL OR NOT retention_hold
     OR last_error_code<>'merchant_unavailable')
 ) THEN RAISE EXCEPTION 'P05 retry should be pending with backoff and hold'; END IF;
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P05 backoff not honored'; END IF;

 UPDATE supporter_private.paypal_verified_event_inbox
 SET next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
 WHERE provider_event_id=ev;
 second:=public.f16_p05_draft_claim_next_verified_event();
 IF second IS NULL OR second->>'eventId'<>ev OR
  (second->>'attemptCount')::int<>2 OR
  (second->>'leaseToken')=token::text
 THEN RAISE EXCEPTION 'P05 retry did not rotate lease'; END IF;
 IF public.f16_p05_draft_finish_claimed_event(ev,token,'review','manual_review')
 THEN RAISE EXCEPTION 'P05 previous lease finished newly claimed event'; END IF;
 IF NOT public.f16_p05_draft_finish_claimed_event(
  ev,(second->>'leaseToken')::uuid,'review','cycle_unproven')
 THEN RAISE EXCEPTION 'P05 manual review failed'; END IF;
 IF public.f16_p05_draft_read_claimed_event(
  ev,(second->>'leaseToken')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 quarantined row remained readable'; END IF;
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id=ev AND (processing_state<>'quarantined'
   OR p05_claim_token IS NOT NULL OR processed_at IS NOT NULL
   OR NOT retention_hold OR last_error_code<>'cycle_unproven'))
 THEN RAISE EXCEPTION 'P05 review must preserve evidence without processing'; END IF;

 -- Expired lease cannot finish; another worker must be able to re-claim.
 UPDATE supporter_private.paypal_verified_event_inbox
  SET next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
 WHERE provider_event_id=expired;
 proof:=public.f16_p05_draft_claim_next_verified_event();
 IF proof IS NULL OR proof->>'eventId'<>expired
 THEN RAISE EXCEPTION 'P05 expired-fixture claim missing'; END IF;
 UPDATE supporter_private.paypal_verified_event_inbox
  SET next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
 WHERE provider_event_id=expired;
 IF public.f16_p05_draft_finish_claimed_event(expired,
  (proof->>'leaseToken')::uuid,'review','manual_review')
 THEN RAISE EXCEPTION 'P05 expired token unexpectedly finalized'; END IF;

 -- Exhaustion must quarantine even when the worker requested another retry.
 UPDATE supporter_private.paypal_verified_event_inbox
 SET attempt_count=4,next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
 WHERE provider_event_id=exhausted;
 proof:=public.f16_p05_draft_claim_next_verified_event();
 IF proof IS NULL OR proof->>'eventId'<>exhausted OR
   (proof->>'attemptCount')::int<>5
 THEN RAISE EXCEPTION 'P05 fifth attempt not claimed'; END IF;
 IF NOT public.f16_p05_draft_finish_claimed_event(exhausted,
   (proof->>'leaseToken')::uuid,'retry','read_unavailable')
 THEN RAISE EXCEPTION 'P05 exhaustion finished unsuccessfully'; END IF;
 IF NOT EXISTS (SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id=exhausted AND
   processing_state='quarantined' AND attempt_count=5
   AND last_error_code='retry_exhausted' AND retention_hold
   AND p05_claim_token IS NULL AND processed_at IS NULL)
 THEN RAISE EXCEPTION 'P05 retry exhaustion did not quarantine'; END IF;

 -- Gate disable must prevent a previously claimed worker from finishing.
 UPDATE supporter_private.p05_inbox_worker_gate
 SET enabled=false,not_before=NULL WHERE id=1;
 IF public.f16_p05_draft_finish_claimed_event(
   expired,(proof->>'leaseToken')::uuid,'review','manual_review')
 THEN RAISE EXCEPTION 'P05 finish succeeded while gate disabled'; END IF;
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries)
 OR EXISTS (SELECT 1 FROM supporter_private.paypal_first_period_reviews)
 THEN RAISE EXCEPTION 'P05 safe finish wrote financial records'; END IF;
END
$test$;
ROLLBACK;