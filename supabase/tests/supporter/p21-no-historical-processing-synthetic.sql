-- P21: history freeze, strictly prospective enabled gate; no ledger or credit.
\set ON_ERROR_STOP on
BEGIN;
DO $gate$
DECLARE old_at timestamptz:=pg_catalog.clock_timestamp()-interval '2 days';
 cutoff timestamptz:=pg_catalog.clock_timestamp()-interval '5 seconds';
 a jsonb; i integer; key text;
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P21 synthetic only'; END IF;
 -- Snapshot of 8 old Sandbox webhook references; no owner/payment payload.
 FOR i IN 1..8 LOOP
  key:='P21-OLD-'||i;
  INSERT INTO supporter_private.paypal_verified_event_inbox
   (provider_event_id,event_type,verified_at)
  VALUES (key,'PAYMENT.SALE.COMPLETED',old_at);
 END LOOP;
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P21 worker ran before gate'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_verified_event_inbox
      WHERE provider_event_id LIKE 'P21-OLD-%'
       AND processing_state='pending' AND attempt_count=0
       AND retention_hold AND p05_claim_token IS NULL)<>8
 THEN RAISE EXCEPTION 'P21 mutated historical rows on disabled gate'; END IF;

 UPDATE supporter_private.p05_inbox_worker_gate
 SET enabled=true,not_before=cutoff WHERE id=1;
 -- Future cutoff does not retroactively make the 8 QA refs claimable.
 IF public.f16_p05_draft_claim_next_verified_event() IS NOT NULL
 THEN RAISE EXCEPTION 'P21 claimed a historical Sandbox event'; END IF;

 INSERT INTO supporter_private.paypal_verified_event_inbox
  (provider_event_id,event_type,verified_at)
 VALUES ('P21-NEW-SALE','PAYMENT.SALE.COMPLETED',
  pg_catalog.clock_timestamp());
 a:=public.f16_p05_draft_claim_next_verified_event();
 IF a IS NULL OR a->>'eventId'<>'P21-NEW-SALE'
  OR a->>'processingState'<>'processing'
 THEN RAISE EXCEPTION 'P21 could not claim prospective event'; END IF;
 IF public.f16_p05_draft_finish_claimed_event(
  'P21-NEW-SALE',pg_catalog.gen_random_uuid(),
  'review','cycle_unproven')
 THEN RAISE EXCEPTION 'P21 accepted wrong fencing token'; END IF;
 IF NOT public.f16_p05_draft_finish_claimed_event(
  'P21-NEW-SALE',(a->>'leaseToken')::uuid,
  'review','cycle_unproven')
 THEN RAISE EXCEPTION 'P21 refused valid conservative disposition'; END IF;
 IF EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id='P21-NEW-SALE'
   AND (processing_state<>'quarantined'
    OR last_error_code<>'cycle_unproven'
    OR NOT retention_hold OR reconciled_payment_id IS NOT NULL)
 ) THEN RAISE EXCEPTION 'P21 incorrectly credited future sale'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_verified_event_inbox
      WHERE provider_event_id LIKE 'P21-OLD-%'
       AND processing_state='pending' AND attempt_count=0
       AND retention_hold AND p05_claim_token IS NULL)<>8
 THEN RAISE EXCEPTION 'P21 changed historical QA after future claim'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>0
 THEN RAISE EXCEPTION 'P21 ledger modified'; END IF;
END
$gate$;
ROLLBACK;
