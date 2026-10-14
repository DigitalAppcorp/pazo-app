-- F16 approved technical architecture — PG17 synthetic / NO HOSTED execution.
-- PayPal transaction status is cumulative; independent refund IDs may arrive
-- after the sale status has already advanced to REFUNDED.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
    OR session_user<>'f14_admin'
    OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR pg_catalog.to_regprocedure(
       'public.f16_lab_commit_claimed_refund(text,uuid,text,text,text,integer,text,timestamptz)'
    ) IS NULL
 THEN RAISE EXCEPTION 'F16 refund status test only in disposable PG17'; END IF;
END $guard$;
CREATE TEMP TABLE f16_pre ON COMMIT DROP AS
 SELECT
  (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events) AS n_refunds,
  (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_sale_holds) AS n_holds;

SET LOCAL ROLE service_role;
DO $setup$
DECLARE a uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        p text:='P-14V25407JP6850922NLHMDKI';
        i text:='intent-a4db927e-98d0-4d2a-af87-e22937cd702c';
        ev text;
BEGIN
 IF NOT public.f16_paypal_create_private_intent(a,i)
 OR public.f16_paypal_bind_private_intent(i,a,'I-REFUND-ORDER-QA',p)<>'new_binding'
 THEN RAISE EXCEPTION 'Expected private bound intent'; END IF;
 FOREACH ev IN ARRAY ARRAY[
   'WH-ORDER-199','WH-ORDER-100','WH-ORDER-REPLAY',
   'WH-ORDER-OVER','WH-ORDER-STALE'
 ] LOOP
  IF NOT public.f16_paypal_record_verified_event(ev,'PAYMENT.SALE.REFUNDED')
  THEN RAISE EXCEPTION 'Synthetic verified event missing'; END IF;
 END LOOP;
END $setup$;

DO $proof$
DECLARE v jsonb; result text; denied boolean;
BEGIN
 -- The LATER $1.99 refund arrives first, while PayPal sale already reads
 -- REFUNDED because the cumulative original $2.99 was refunded.
 v:=public.f16_lab_claim_verified_inbox('WH-ORDER-199',180);
 result:=public.f16_lab_commit_claimed_refund(
  'WH-ORDER-199',(v->>'lease_token')::uuid,
  'SALE-ORDER-QA','I-REFUND-ORDER-QA','REFUND-ORDER-199',199,
  'REFUNDED','2026-10-14T12:15:00Z');
 IF result<>'refund_recorded_partial'
 THEN RAISE EXCEPTION 'Global REFUNDED incorrectly implied 299 local cents'; END IF;

 v:=public.f16_lab_claim_verified_inbox('WH-ORDER-100',180);
 result:=public.f16_lab_commit_claimed_refund(
  'WH-ORDER-100',(v->>'lease_token')::uuid,
  'SALE-ORDER-QA','I-REFUND-ORDER-QA','REFUND-ORDER-100',100,
  'REFUNDED','2026-10-14T12:00:00Z');
 IF result<>'refund_recorded_full'
 THEN RAISE EXCEPTION 'Second distinct refund did not complete 299 cents'; END IF;

 -- Provider transaction status may change between identical refund-ID
 -- replays. Immutable identity/amount/date remain identical; do NOT count twice.
 v:=public.f16_lab_claim_verified_inbox('WH-ORDER-REPLAY',180);
 result:=public.f16_lab_commit_claimed_refund(
  'WH-ORDER-REPLAY',(v->>'lease_token')::uuid,
  'SALE-ORDER-QA','I-REFUND-ORDER-QA','REFUND-ORDER-199',199,
  'PARTIALLY_REFUNDED','2026-10-14T12:15:00Z');
 IF result<>'refund_duplicate'
 THEN RAISE EXCEPTION 'Changing provider snapshot was treated as a second refund'; END IF;

 -- Amount checks must remain strict.
 v:=public.f16_lab_claim_verified_inbox('WH-ORDER-OVER',180);
 denied:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_refund(
   'WH-ORDER-OVER',(v->>'lease_token')::uuid,
   'SALE-ORDER-QA','I-REFUND-ORDER-QA','REFUND-ORDER-EXTRA',1,
   'REFUNDED','2026-10-14T12:16:00Z');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Over-refund bypassed 299-cent limit'; END IF;

 -- Conversely, PARTIALLY_REFUNDED for a *complete* 299 local cents remains
 -- inconsistent and must stay in the inbox unacknowledged.
 v:=public.f16_lab_claim_verified_inbox('WH-ORDER-STALE',180);
 denied:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_refund(
   'WH-ORDER-STALE',(v->>'lease_token')::uuid,
   'SALE-ORDER-OTHER','I-REFUND-ORDER-QA','REFUND-ORDER-OTHER-299',299,
   'PARTIALLY_REFUNDED','2026-10-14T12:17:00Z');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Stale provider status accepted complete 299 cents'; END IF;
END $proof$;

SET LOCAL ROLE postgres;
DO $assertions$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM supporter_private.f16_lab_refund_sale_holds
  WHERE original_sale_id='SALE-ORDER-QA'
  AND subscription_id='I-REFUND-ORDER-QA'
  AND refunded_minor=299 AND refund_count=2 AND refund_state='full')
 THEN RAISE EXCEPTION 'Unsorted refunds broke cumulative state'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events)
   <> (SELECT n_refunds+2 FROM f16_pre)
 OR (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_sale_holds)
   <> (SELECT n_holds+1 FROM f16_pre)
 THEN RAISE EXCEPTION 'Refund replay or rejected events changed money'; END IF;
 IF EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id IN ('WH-ORDER-OVER','WH-ORDER-STALE')
   AND (processing_state='processed' OR retention_hold IS NOT TRUE))
 THEN RAISE EXCEPTION 'Rejected refund acknowledged or retention hold lost'; END IF;
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'No refund event can create paid entitlement'; END IF;
END $assertions$;
ROLLBACK;
SELECT 'PASS F16: cumulative REFUNDED snapshot, 199+100 cents, replay drift, over-refund blocked, no entitlement';
