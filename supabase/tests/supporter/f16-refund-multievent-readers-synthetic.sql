-- F16 refund-specific private projections, isolated PG17 only.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.has_function_privilege('anon',
 'public.f16_lab_owner_financial_deletion_exposure(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_lab_read_known_reversal_ids(text)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
 'public.f16_lab_owner_financial_deletion_exposure(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Private reader ACL mismatch'; END IF;
END $guard$;
SET LOCAL ROLE service_role;
DO $setup$
DECLARE a uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
        intent text:='intent-563b12ad-0931-4774-9869-59bdb070c4dc';
BEGIN
 IF NOT public.f16_paypal_create_private_intent(a,intent)
 OR public.f16_paypal_bind_private_intent(intent,a,
   'I-REFUND-READ-V2','P-14V25407JP6850922NLHMDKI')<>'new_binding'
 THEN RAISE EXCEPTION 'Private owner fixture failed'; END IF;
 PERFORM public.f16_paypal_record_verified_event(
 'WH-REFUND-READ-V2','PAYMENT.SALE.REFUNDED');
 PERFORM public.f16_paypal_record_verified_event(
 'WH-SALE-READ-V2','PAYMENT.SALE.COMPLETED');
END $setup$;
DO $proof$
DECLARE c jsonb; summary jsonb; ids jsonb;
BEGIN
 c:=public.f16_lab_claim_verified_inbox('WH-REFUND-READ-V2',180);
 IF public.f16_lab_commit_claimed_refund(
   'WH-REFUND-READ-V2',(c->>'lease_token')::uuid,
   'SALE-REFUND-READ-V2','I-REFUND-READ-V2',
   'REFUND-READ-V2-299',299,'REFUNDED',
   '2026-10-14T11:30:00Z')<>'refund_recorded_full'
 THEN RAISE EXCEPTION 'Original refund ledger unavailable'; END IF;
 summary:=public.f16_lab_owner_financial_deletion_exposure(
   '63e812b0-a7e5-49f6-b2dd-c11d2c72af57');
 IF (summary->>'reversal_count')::integer<1
    OR (summary->>'has_unresolved_global_financial_events')::boolean IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Pre-sale refund lost from deletion preflight'; END IF;
 IF public.f16_lab_read_known_reversal_ids('I-REFUND-READ-V2') IS NOT NULL
 THEN RAISE EXCEPTION 'Orphan refund must make local history UNKNOWN'; END IF;
 c:=public.f16_lab_claim_verified_inbox('WH-SALE-READ-V2',180);
 IF public.f16_lab_commit_claimed_sale_v2(
  'WH-SALE-READ-V2',(c->>'lease_token')::uuid,
  'SALE-REFUND-READ-V2','I-REFUND-READ-V2',
  '63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
  'P-14V25407JP6850922NLHMDKI',299,'USD',
  '2026-10-13T19:00:00Z')<>'inserted_blocked'
 THEN RAISE EXCEPTION 'Sale bypassed private early refund hold'; END IF;
 ids:=public.f16_lab_read_known_reversal_ids('I-REFUND-READ-V2');
 IF ids IS NOT NULL THEN
  IF pg_catalog.jsonb_typeof(ids)<>'array'
    OR NOT ids @> '["SALE-REFUND-READ-V2"]'::jsonb
  THEN RAISE EXCEPTION 'Recorded refund missing from known reversal IDs'; END IF;
 ELSE
  -- Shared synthetic catalog can contain independent unresolved reversed events.
  -- In that case NULL is REQUIRED globally; it must never become [].
  IF NOT EXISTS (
   SELECT 1 FROM supporter_private.paypal_verified_event_inbox i
   WHERE i.event_type IN ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')
    AND i.processing_state<>'processed'
  ) AND NOT EXISTS (
   SELECT 1 FROM supporter_private.paypal_payment_reversals r
   WHERE NOT EXISTS (
    SELECT 1 FROM supporter_private.paypal_payment_entries e
    WHERE e.external_payment_id=r.external_payment_id)
  ) AND NOT EXISTS (
   SELECT 1 FROM supporter_private.f16_lab_refund_events r
   WHERE NOT EXISTS (
    SELECT 1 FROM supporter_private.paypal_payment_entries e
    WHERE e.external_payment_id=r.original_sale_id)
  )
  THEN RAISE EXCEPTION 'Reversal history returned NULL without a reason'; END IF;
 END IF;
END $proof$;
ROLLBACK;
SELECT 'PASS F16: multi-refund reader sees early refund and blocked sale, service-only';
