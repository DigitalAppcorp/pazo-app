-- PAZO F16 — lease-owned atomic financial writer; PG17 CI ONLY.
-- No hosted data or PayPal use. All temporary synthetic rows roll back.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
DECLARE sale text:='public.f16_lab_commit_claimed_sale(text,uuid,text,text,uuid,text,integer,text,timestamptz)';
        rev text:='public.f16_lab_commit_claimed_reversal(text,uuid,text,text,timestamptz)';
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'Unsafe F16 finance QA target'; END IF;
 IF has_function_privilege('anon',sale,'EXECUTE')
 OR has_function_privilege('authenticated',sale,'EXECUTE')
 OR has_function_privilege('anon',rev,'EXECUTE')
 OR has_function_privilege('authenticated',rev,'EXECUTE')
 OR NOT has_function_privilege('service_role',sale,'EXECUTE')
 OR NOT has_function_privilege('service_role',rev,'EXECUTE')
 OR has_function_privilege('service_role',
  'public.f16_paypal_commit_verified_sale(text,text,text,uuid,text,integer,text,timestamptz)',
  'EXECUTE')
 OR has_function_privilege('service_role',
  'public.f16_paypal_commit_verified_reversal(text,text,text,timestamptz)',
  'EXECUTE')
 OR has_table_privilege('service_role',
  'supporter_private.paypal_payment_entries','INSERT')
 OR has_table_privilege('service_role',
  'supporter_private.paypal_verified_event_inbox','UPDATE')
 THEN RAISE EXCEPTION 'Financial writer access/bypass drift'; END IF;
 IF (SELECT count(*) FROM pg_catalog.pg_proc
  WHERE oid IN (sale::regprocedure,rev::regprocedure)
  AND prosecdef
  AND pg_catalog.pg_get_userbyid(proowner)='postgres'
  AND 'search_path=""'=ANY(proconfig))<>2
 THEN RAISE EXCEPTION 'Financial writer security definer drift'; END IF;
END $guard$;
CREATE TEMP TABLE f16_finance_before ON COMMIT DROP AS
SELECT (SELECT count(*) FROM supporter_private.paypal_payment_entries) AS sales,
       (SELECT count(*) FROM supporter_private.paypal_payment_reversals) AS reversals;

SET LOCAL ROLE service_role;
DO $setup$
DECLARE a uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        plan text:='P-14V25407JP6850922NLHMDKI';
        intent text:='intent-099febf9-3aa5-4fb8-8cde-f195624c6f00';
        ev text;
BEGIN
 IF public.f16_paypal_create_private_intent(a,intent) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'No synthetic Auth owner intent'; END IF;
 IF public.f16_paypal_bind_private_intent(intent,a,'I-LEASE-PAY',plan)<>'new_binding'
 THEN RAISE EXCEPTION 'Synthetic subscription not bound'; END IF;
 FOREACH ev IN ARRAY ARRAY[
  'WH-LEASE-FIN-SALE','WH-LEASE-FIN-DUP',
  'WH-LEASE-FIN-REV-FIRST','WH-LEASE-FIN-SALE-LATE',
  'WH-LEASE-FIN-CRASH','WH-LEASE-FIN-EXPIRE',
  'WH-LEASE-FIN-REFUND','WH-LEASE-FIN-LIFECYCLE'] LOOP
  PERFORM public.f16_paypal_record_verified_event(ev,
   CASE WHEN ev LIKE '%REV-FIRST' THEN 'PAYMENT.SALE.REVERSED'
        WHEN ev LIKE '%REFUND' THEN 'PAYMENT.SALE.REFUNDED'
        WHEN ev LIKE '%LIFECYCLE' THEN 'BILLING.SUBSCRIPTION.ACTIVATED'
        ELSE 'PAYMENT.SALE.COMPLETED' END);
 END LOOP;
END $setup$;

DO $suites$
DECLARE a uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        b uuid:='8b134f73-5ee3-49a2-9a36-3e1592e5af81';
        plan text:='P-14V25407JP6850922NLHMDKI';
        paid timestamptz:='2026-10-13 19:00:00+00';
        claim jsonb; token uuid; bad boolean; answer text; num bigint;
BEGIN
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-SALE',120);
 token:=(claim->>'lease_token')::uuid;
 IF token IS NULL THEN RAISE EXCEPTION 'No sale lease issued'; END IF;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE',
   NULL,'PAY-LEASE-1','I-LEASE-PAY',a,plan,299,'USD',paid);
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Null lease allowed money'; END IF;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE',
   pg_catalog.gen_random_uuid(),'PAY-LEASE-1','I-LEASE-PAY',a,plan,299,'USD',paid);
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Stolen lease allowed money'; END IF;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE',
   token,'PAY-LEASE-1','I-LEASE-PAY',b,plan,299,'USD',paid);
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Wrong owner was accepted'; END IF;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE',
   token,'PAY-LEASE-1','I-LEASE-PAY',a,plan,300,'USD',paid);
 EXCEPTION WHEN invalid_parameter_value OR check_violation THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Wrong payment amount was accepted'; END IF;
 bad:=false;
 BEGIN
  PERFORM public.f16_paypal_commit_verified_sale('WH-LEASE-FIN-SALE',
   'PAY-LEASE-1','I-LEASE-PAY',a,plan,299,'USD',paid);
 EXCEPTION WHEN insufficient_privilege THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Legacy non-lease sale bypass available'; END IF;
 answer:=public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE',
  token,'PAY-LEASE-1','I-LEASE-PAY',a,plan,299,'USD',paid);
 IF answer<>'inserted_uncredited' THEN RAISE EXCEPTION 'Sale atomic commit failed'; END IF;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE',
   token,'PAY-LEASE-1','I-LEASE-PAY',a,plan,299,'USD',paid);
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Replayed finalized token accepted'; END IF;
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-DUP',120);
 token:=(claim->>'lease_token')::uuid;
 answer:=public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-DUP',
  token,'PAY-LEASE-1','I-LEASE-PAY',a,plan,299,'USD',paid);
 IF answer<>'duplicate_uncredited' THEN RAISE EXCEPTION 'Duplicate payment generated credit'; END IF;

 -- Original reversal/tombstone FIRST, matching sale arrives LATER.
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-REV-FIRST',120);
 token:=(claim->>'lease_token')::uuid;
 answer:=public.f16_lab_commit_claimed_reversal('WH-LEASE-FIN-REV-FIRST',
  token,'PAY-LEASE-2','reversed',paid);
 IF answer<>'reversal_recorded' THEN RAISE EXCEPTION 'Early reversal not durable'; END IF;
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-SALE-LATE',120);
 token:=(claim->>'lease_token')::uuid;
 answer:=public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-SALE-LATE',
  token,'PAY-LEASE-2','I-LEASE-PAY',a,plan,299,'USD',paid);
 IF answer<>'inserted_blocked' THEN RAISE EXCEPTION 'Late sale escaped reversal'; END IF;
 -- Refund for the first sale after it was inserted.
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-REFUND',120);
 token:=(claim->>'lease_token')::uuid;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_reversal('WH-LEASE-FIN-REFUND',
   token,'PAY-LEASE-1','reversed',paid);
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Refund event improperly became reversal type'; END IF;
 answer:=public.f16_lab_commit_claimed_reversal('WH-LEASE-FIN-REFUND',
  token,'PAY-LEASE-1','refunded',paid);
 IF answer<>'reversal_recorded' THEN RAISE EXCEPTION 'Refund failed'; END IF;
 -- Subscription state never becomes paid ledger, even with a lease.
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-LIFECYCLE',120);
 token:=(claim->>'lease_token')::uuid;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-LIFECYCLE',
   token,'PAY-LEASE-FAKE','I-LEASE-PAY',a,plan,299,'USD',paid);
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Lifecycle status paid money'; END IF;
 IF NOT public.f16_lab_ack_lifecycle('WH-LEASE-FIN-LIFECYCLE',token)
 THEN RAISE EXCEPTION 'Lifecycle ack regression'; END IF;
 -- Simulate DB crash after writing but before transaction commit:
 -- subtransaction must rollback BOTH sale row and inbox processing.
 claim:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-CRASH',120);
 token:=(claim->>'lease_token')::uuid;
 bad:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-CRASH',
    token,'PAY-LEASE-CRASH','I-LEASE-PAY',a,plan,299,'USD',paid);
  RAISE EXCEPTION 'simulate_transient_connection_loss';
 EXCEPTION WHEN OTHERS THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Synthetic DB crash not simulated'; END IF;
 SELECT count(*) INTO num FROM supporter_private.paypal_payment_entries
 WHERE external_payment_id='PAY-LEASE-CRASH';
 IF num<>0 THEN RAISE EXCEPTION 'Crash left orphan payment'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id='WH-LEASE-FIN-CRASH'
    AND processing_state='processing' AND f16_lease_token=token)
 THEN RAISE EXCEPTION 'Crash incorrectly ACKed event'; END IF;
END $suites$;

-- Force an expired lease in LAB only to simulate worker death / stale token.
DO $expire_setup$
BEGIN
 -- Deliberately fail if the fixture unexpectedly has writes.
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries
 WHERE external_payment_id='PAY-LEASE-EXPIRE')
 THEN RAISE EXCEPTION 'Expired lease fixture already paid'; END IF;
END $expire_setup$;
DO $claim_for_expiry$
DECLARE v jsonb;
BEGIN
 v:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-EXPIRE',120);
 IF v IS NULL THEN RAISE EXCEPTION 'Expiry fixture not claimed'; END IF;
END $claim_for_expiry$;
SET LOCAL ROLE postgres;
UPDATE supporter_private.paypal_verified_event_inbox SET
 f16_lease_expires_at=pg_catalog.clock_timestamp()-interval '2 seconds'
WHERE provider_event_id='WH-LEASE-FIN-EXPIRE';
SET LOCAL ROLE service_role;
DO $expired$
DECLARE v uuid; bad boolean:=false;
        owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
BEGIN
 IF public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-EXPIRE',120) IS NOT NULL
 THEN RAISE EXCEPTION 'Expired lease was silently stolen'; END IF;
 -- A worker cannot commit even with its stale token.
 -- Test obtains the known fixture token through the privileged synthetic test,
 -- separately below, never through a production client.
END $expired$;
SET LOCAL ROLE postgres;
CREATE TEMP TABLE f16_old_token ON COMMIT DROP AS
 SELECT f16_lease_token AS token FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-LEASE-FIN-EXPIRE';
GRANT SELECT ON f16_old_token TO service_role;
SET LOCAL ROLE service_role;
DO $expire_commit$
DECLARE v uuid; bad boolean:=false;
 owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
BEGIN
 SELECT token INTO v FROM f16_old_token;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-EXPIRE',
   v,'PAY-LEASE-EXPIRE','I-LEASE-PAY',owner,
   'P-14V25407JP6850922NLHMDKI',299,'USD','2026-10-13 19:00:00+00');
 EXCEPTION WHEN invalid_parameter_value THEN bad:=true; END;
 IF NOT bad THEN RAISE EXCEPTION 'Expired token committed sale'; END IF;
 IF public.f16_lab_recover_expired(50)<1
 THEN RAISE EXCEPTION 'Dead lease not recovered'; END IF;
END $expire_commit$;

SET LOCAL ROLE postgres;
DO $recover$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id='WH-LEASE-FIN-EXPIRE'
  AND processing_state='pending' AND f16_lease_token IS NULL
  AND last_error_code='lease_expired' AND retention_hold=true
  AND next_attempt_at>pg_catalog.clock_timestamp())
 THEN RAISE EXCEPTION 'Recovery did not enforce hold and backoff'; END IF;
 -- Bypass backoff ONLY to simulate time advance in disposable fixture.
 UPDATE supporter_private.paypal_verified_event_inbox
 SET next_attempt_at=pg_catalog.clock_timestamp()-interval '2 seconds'
 WHERE provider_event_id='WH-LEASE-FIN-EXPIRE';
END $recover$;
SET LOCAL ROLE service_role;
DO $recover_new_claim$
DECLARE v jsonb; answer text;
 owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
BEGIN
 v:=public.f16_lab_claim_verified_inbox('WH-LEASE-FIN-EXPIRE',120);
 IF v->>'lease_token' IS NULL OR (v->>'attempt')::integer<>2
 THEN RAISE EXCEPTION 'Recovery did not issue a fresh token'; END IF;
 answer:=public.f16_lab_commit_claimed_sale('WH-LEASE-FIN-EXPIRE',
   (v->>'lease_token')::uuid,'PAY-LEASE-EXPIRE','I-LEASE-PAY',owner,
   'P-14V25407JP6850922NLHMDKI',299,'USD','2026-10-13 19:00:00+00');
 IF answer<>'inserted_uncredited' THEN RAISE EXCEPTION 'Recovery commit failed'; END IF;
END $recover_new_claim$;

SET LOCAL ROLE postgres;
DO $final$
DECLARE before_sales bigint; before_reversals bigint;
BEGIN
 SELECT sales,reversals INTO before_sales,before_reversals FROM f16_finance_before;
 IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)
    <> before_sales+3
 OR (SELECT count(*) FROM supporter_private.paypal_payment_reversals)
    <> before_reversals+2
 THEN RAISE EXCEPTION 'Financial outcomes / idempotency wrong'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries
   WHERE external_payment_id IN ('PAY-LEASE-1','PAY-LEASE-2')
     AND entry_state<>'blocked_reversal')
 THEN RAISE EXCEPTION 'Reversal did not block previously credited sale'; END IF;
 IF EXISTS (SELECT 1 FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id LIKE 'WH-LEASE-FIN-%'
   AND provider_event_id<>'WH-LEASE-FIN-CRASH'
   AND (processing_state<>'processed' OR f16_lease_token IS NOT NULL
        OR f16_lease_expires_at IS NOT NULL
        OR reconciled_payment_id IS NULL AND event_type LIKE 'PAYMENT.%'
        OR retention_hold IS DISTINCT FROM true))
 THEN RAISE EXCEPTION 'Claims were not retired atomically'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_event_inbox
 WHERE provider_event_id='WH-LEASE-FIN-CRASH'
 AND processing_state='processing' AND retention_hold IS TRUE
 AND f16_lease_token IS NOT NULL)
 THEN RAISE EXCEPTION 'Crashed worker fixture lost recoverability'; END IF;
 IF supporter_private.wall_has_verified_entitlement(
 '63e812b0-a7e5-49f6-b2dd-c11d2c72af57'::uuid) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Lab sale activated PAZO entitlement'; END IF;
END $final$;
ROLLBACK;
SELECT 'PASS F16: lease-bound atomic ledger, stale token reject, retry, reversal, crash rollback, ACL, no entitlement';
