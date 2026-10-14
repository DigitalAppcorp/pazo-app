-- F16 multievent refund + sale hold lab. Test only on disposable PG17.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.to_regprocedure('public.f16_lab_commit_claimed_refund(text,uuid,text,text,text,integer,text,timestamptz)') IS NULL
 OR pg_catalog.has_function_privilege('anon',
   'public.f16_lab_commit_claimed_refund(text,uuid,text,text,text,integer,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
   'public.f16_lab_commit_claimed_refund(text,uuid,text,text,text,integer,text,timestamptz)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
   'public.f16_lab_commit_claimed_refund(text,uuid,text,text,text,integer,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('service_role',
   'public.f16_lab_commit_claimed_reversal(text,uuid,text,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_function_privilege('service_role',
   'public.f16_lab_commit_claimed_sale(text,uuid,text,text,uuid,text,integer,text,timestamptz)','EXECUTE')
 OR pg_catalog.has_table_privilege('service_role',
   'supporter_private.f16_lab_refund_events','SELECT')
 OR pg_catalog.has_table_privilege('service_role',
   'supporter_private.f16_lab_refund_sale_holds','INSERT')
 THEN RAISE EXCEPTION 'Multievent lease writer ACL or PG17 lab guard failed'; END IF;
END $guard$;
CREATE TEMP TABLE f16_refunds_before ON COMMIT DROP AS
 SELECT (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events) events,
 (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_sale_holds) holds,
 (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries) sales;

SET LOCAL ROLE service_role;
DO $setup$
DECLARE owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        plan text:='P-14V25407JP6850922NLHMDKI';
        i text:='intent-911c1554-1c8c-4880-b9be-0744ccf7ce59';
        ev text;
BEGIN
 IF NOT public.f16_paypal_create_private_intent(owner,i)
 OR public.f16_paypal_bind_private_intent(i,owner,'I-REFUND-V2',plan)<>'new_binding'
 THEN RAISE EXCEPTION 'Missing synthetic bound subscription'; END IF;
 FOREACH ev IN ARRAY ARRAY[
 'WH-V2-PARTIAL-A','WH-V2-FINAL-B','WH-V2-DUPLICATE-A',
 'WH-V2-OVERPAY','WH-V2-EARLY-REFUND','WH-V2-SALE-LATE',
 'WH-V2-WRONG-LEASE'] LOOP
  IF NOT public.f16_paypal_record_verified_event(ev,
   CASE WHEN ev='WH-V2-SALE-LATE' THEN 'PAYMENT.SALE.COMPLETED'
        ELSE 'PAYMENT.SALE.REFUNDED' END)
  THEN RAISE EXCEPTION 'Synthetic event missing'; END IF;
 END LOOP;
END $setup$;

DO $refunds$
DECLARE v jsonb; decision text; denied boolean;
BEGIN
 v:=public.f16_lab_claim_verified_inbox('WH-V2-PARTIAL-A',120);
 decision:=public.f16_lab_commit_claimed_refund(
  'WH-V2-PARTIAL-A',(v->>'lease_token')::uuid,
  'SALE-V2-ONE','I-REFUND-V2','REFUND-V2-100',100,
  'PARTIALLY_REFUNDED','2026-10-14T12:00:00Z');
 IF decision<>'refund_recorded_partial'
 THEN RAISE EXCEPTION 'First partial refund was not durably recorded'; END IF;
 v:=public.f16_lab_claim_verified_inbox('WH-V2-FINAL-B',120);
 decision:=public.f16_lab_commit_claimed_refund(
  'WH-V2-FINAL-B',(v->>'lease_token')::uuid,
  'SALE-V2-ONE','I-REFUND-V2','REFUND-V2-199',199,
  'REFUNDED','2026-10-14T12:15:00Z');
 IF decision<>'refund_recorded_full'
 THEN RAISE EXCEPTION 'Second refund failed to reach exactly 299 cents'; END IF;
 v:=public.f16_lab_claim_verified_inbox('WH-V2-DUPLICATE-A',120);
 decision:=public.f16_lab_commit_claimed_refund(
  'WH-V2-DUPLICATE-A',(v->>'lease_token')::uuid,
  'SALE-V2-ONE','I-REFUND-V2','REFUND-V2-100',100,
  'PARTIALLY_REFUNDED','2026-10-14T12:00:00Z');
 IF decision<>'refund_duplicate'
 THEN RAISE EXCEPTION 'Refund ID replay double-counted'; END IF;

 v:=public.f16_lab_claim_verified_inbox('WH-V2-OVERPAY',120);
 denied:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_refund(
   'WH-V2-OVERPAY',(v->>'lease_token')::uuid,
   'SALE-V2-ONE','I-REFUND-V2','REFUND-V2-EXTRA',1,
   'REFUNDED','2026-10-14T12:16:00Z');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Over-refund unexpectedly committed'; END IF;

 -- Single full refund before its sale appears.
 v:=public.f16_lab_claim_verified_inbox('WH-V2-EARLY-REFUND',120);
 decision:=public.f16_lab_commit_claimed_refund(
  'WH-V2-EARLY-REFUND',(v->>'lease_token')::uuid,
  'SALE-V2-BEFORE','I-REFUND-V2','REFUND-V2-BEFORE',299,
  'REFUNDED','2026-10-14T12:20:00Z');
 IF decision<>'refund_recorded_full' THEN RAISE EXCEPTION 'Early refund refused'; END IF;

 v:=public.f16_lab_claim_verified_inbox('WH-V2-WRONG-LEASE',120);
 denied:=false;
 BEGIN
  PERFORM public.f16_lab_commit_claimed_refund(
   'WH-V2-WRONG-LEASE',pg_catalog.gen_random_uuid(),
   'SALE-V2-ONE','I-REFUND-V2','REFUND-V2-NEW',1,
   'PARTIALLY_REFUNDED','2026-10-14T12:25:00Z');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Stolen lease accepted'; END IF;
END $refunds$;

DO $sale$
DECLARE v jsonb; decision text;
BEGIN
 v:=public.f16_lab_claim_verified_inbox('WH-V2-SALE-LATE',120);
 decision:=public.f16_lab_commit_claimed_sale_v2(
  'WH-V2-SALE-LATE',(v->>'lease_token')::uuid,
  'SALE-V2-BEFORE','I-REFUND-V2',
  '63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
  'P-14V25407JP6850922NLHMDKI',299,'USD',
  '2026-10-13T19:00:00Z');
 IF decision<>'inserted_blocked'
 THEN RAISE EXCEPTION 'Late sale bypassed refund hold'; END IF;
END $sale$;

SET LOCAL ROLE postgres;
DO $assertions$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM supporter_private.f16_lab_refund_sale_holds
 WHERE original_sale_id='SALE-V2-ONE'
 AND refunded_minor=299 AND refund_count=2 AND refund_state='full')
 OR NOT EXISTS (SELECT 1 FROM supporter_private.f16_lab_refund_sale_holds
 WHERE original_sale_id='SALE-V2-BEFORE'
 AND refunded_minor=299 AND refund_count=1 AND refund_state='full')
 THEN RAISE EXCEPTION 'Incorrect cumulative refund totals or duplicate counts'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events) <>
 (SELECT events+3 FROM f16_refunds_before)
 OR (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_sale_holds) <>
 (SELECT holds+2 FROM f16_refunds_before)
 OR (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries) <>
 (SELECT sales+1 FROM f16_refunds_before)
 THEN RAISE EXCEPTION 'Unexpected financial rows'; END IF;
 IF NOT EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries
   WHERE external_payment_id='SALE-V2-BEFORE'
   AND entry_state='blocked_reversal')
 THEN RAISE EXCEPTION 'Refund-before-sale was credited'; END IF;
 IF NOT EXISTS (SELECT 1 FROM supporter_private.paypal_verified_event_inbox
   WHERE provider_event_id='WH-V2-OVERPAY' AND processing_state='processing'
   AND retention_hold AND f16_lease_token IS NOT NULL)
 THEN RAISE EXCEPTION 'Rejected over-refund was silently acknowledged'; END IF;
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'No entitlement must be conferred'; END IF;
END $assertions$;
ROLLBACK;
SELECT 'PASS F16: three distinct refunds, dedupe, sum 299, overrun deny, early hold, late sale block, ACL and no entitlement';
