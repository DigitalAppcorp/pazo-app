-- PAZO F16-P05 atomic event claim / fencing: synthetic transaction only.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
 first jsonb;
 stolen jsonb;
 second jsonb;
 stale jsonb;
 event_id text := 'WH-NEW-CLAIM-001';
 old_id text := 'WH-HISTORICAL-001';
 lease uuid;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P05 tests must not run outside disposable PostgreSQL'; END IF;
 -- Historicals must NEVER be acquired by the future rollout gate.
 INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type,verified_at,processing_state)
 VALUES (old_id,'PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp()-interval '5 days','pending'),
        (event_id,'PAYMENT.SALE.COMPLETED',pg_catalog.clock_timestamp()-interval '1 minute','pending');
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P05 claim executed while rollout disabled'; END IF;

 UPDATE supporter_private.p05_inbox_worker_gate SET
  enabled=true,not_before=pg_catalog.clock_timestamp()+interval '1 hour'
 WHERE id=1;
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P05 claimed event older than future cutoff'; END IF;

 UPDATE supporter_private.p05_inbox_worker_gate SET
   not_before=pg_catalog.clock_timestamp()-interval '2 minutes' WHERE id=1;
 first:=public.f16_p05_draft_claim_next_verified_event();
 IF first IS NULL OR first->>'eventId'<>event_id OR
  first->>'eventType'<>'PAYMENT.SALE.COMPLETED' OR
  first->>'processingState'<>'processing' OR
  (first->>'attemptCount')::integer<>1
 THEN RAISE EXCEPTION 'P05 first claim invalid'; END IF;
 lease:=(first->>'leaseToken')::uuid;
 IF lease IS NULL THEN RAISE EXCEPTION 'P05 missing fencing token'; END IF;
 IF public.f16_p05_draft_read_claimed_event(event_id,lease) IS NULL
 THEN RAISE EXCEPTION 'P05 own lease cannot read'; END IF;
 IF public.f16_p05_draft_read_claimed_event(event_id,pg_catalog.gen_random_uuid()) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 incorrect lease can read'; END IF;
 IF public.f16_p05_draft_read_claimed_event(old_id,lease) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 read historical row with claim token'; END IF;
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P05 claimed event twice during active lease'; END IF;

 -- Expire the first lease as if the worker crashed. Reclaim rotates token,
 -- increments attempt_count and invalidates stale workers.
 UPDATE supporter_private.paypal_verified_event_inbox
 SET next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
 WHERE provider_event_id=event_id;
 second:=public.f16_p05_draft_claim_next_verified_event();
 IF second IS NULL OR second->>'eventId'<>event_id OR
  (second->>'attemptCount')::integer<>2 OR
  (second->>'leaseToken')=lease::text
 THEN RAISE EXCEPTION 'P05 lease re-acquire not fenced'; END IF;
 stale:=public.f16_p05_draft_read_claimed_event(event_id,lease);
 IF stale IS NOT NULL THEN RAISE EXCEPTION 'P05 stale lease still reads'; END IF;
 IF public.f16_p05_draft_read_claimed_event(
   event_id,(second->>'leaseToken')::uuid) IS NULL
 THEN RAISE EXCEPTION 'P05 new lease cannot read'; END IF;

 -- Quarantined and completed events stay unclaimable, never credit payments.
 UPDATE supporter_private.paypal_verified_event_inbox
  SET processing_state='quarantined',next_attempt_at=pg_catalog.clock_timestamp()-interval '1 second'
 WHERE provider_event_id=event_id;
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P05 quarantined event was claimed'; END IF;
 IF public.f16_p05_draft_read_claimed_event(event_id,(second->>'leaseToken')::uuid) IS NOT NULL
 THEN RAISE EXCEPTION 'P05 read quarantined event'; END IF;

 -- PENDING max attempts cannot loop indefinitely.
 UPDATE supporter_private.paypal_verified_event_inbox
 SET processing_state='pending',attempt_count=5
 WHERE provider_event_id=event_id;
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P05 max-attempts event was claimed'; END IF;

 -- Must NOT mutate ledger/reversals or subscriptions.
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries)
 OR EXISTS (SELECT 1 FROM supporter_private.paypal_first_period_reviews)
 THEN RAISE EXCEPTION 'P05 unexpectedly touched financial evidence'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id=old_id AND attempt_count=0 AND processing_state='pending')<>1
 THEN RAISE EXCEPTION 'P05 historical event changed'; END IF;
END
$test$;
ROLLBACK;