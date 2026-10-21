-- F16 disposable PostgreSQL lab cases; no hosted database writes.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 THEN RAISE EXCEPTION 'financial ledger lab requires disposable fixture'; END IF;
END $guard$;

DO $permissions$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_class
   WHERE oid IN ('supporter_private.paypal_payment_entries'::regclass,
                 'supporter_private.paypal_payment_reversals'::regclass)
   AND (NOT relrowsecurity OR NOT relforcerowsecurity))
 THEN RAISE EXCEPTION 'Financial tables must force RLS'; END IF;
 IF has_schema_privilege('anon','supporter_private','USAGE')
    OR has_schema_privilege('authenticated','supporter_private','USAGE')
    OR has_schema_privilege('service_role','supporter_private','USAGE')
    OR has_table_privilege('anon','supporter_private.paypal_payment_entries','SELECT')
    OR has_table_privilege('authenticated','supporter_private.paypal_payment_reversals','SELECT')
    OR has_table_privilege('service_role','supporter_private.paypal_payment_entries','INSERT')
    OR has_function_privilege('anon','supporter_private.f16_lab_record_payment(text,text,uuid,text,integer,text,timestamptz)','EXECUTE')
    OR has_function_privilege('service_role','supporter_private.f16_lab_record_reversal(text,text,timestamptz)','EXECUTE')
 THEN RAISE EXCEPTION 'Financial ledger permissions exposed'; END IF;
END $permissions$;

DO $scenario$
DECLARE
  owner uuid:='63e812b0-a7e5-49f6-b2dd-c11d2c72af57';
  event_time timestamptz:='2026-10-13 19:00:00+00';
  status text;
  rejected boolean;
BEGIN
  -- Payment arriving first and duplicate retry.
  status:=supporter_private.f16_lab_record_payment(
    'PAY-001','I-SUB-001',owner,'P-14V25407JP6850922NLHMDKI',
    299,'USD',event_time);
  IF status<>'inserted_uncredited' THEN RAISE EXCEPTION 'payment insert failed'; END IF;
  status:=supporter_private.f16_lab_record_payment(
    'PAY-001','I-SUB-001',owner,'P-14V25407JP6850922NLHMDKI',
    299,'USD',event_time);
  IF status<>'duplicate_uncredited' THEN RAISE EXCEPTION 'payment replay not idempotent'; END IF;

  -- Reversal arriving BEFORE payment: tombstone must survive.
  status:=supporter_private.f16_lab_record_reversal('PAY-002','reversed',event_time);
  IF status<>'reversal_recorded' THEN RAISE EXCEPTION 'out-of-order reversal failed'; END IF;
  status:=supporter_private.f16_lab_record_payment(
    'PAY-002','I-SUB-001',owner,'P-14V25407JP6850922NLHMDKI',
    299,'USD',event_time);
  IF status<>'inserted_blocked' THEN RAISE EXCEPTION 'tombstone ignored'; END IF;

  -- Reversal AFTER payment: original candidate becomes blocked atomically.
  status:=supporter_private.f16_lab_record_reversal('PAY-001','refunded',event_time);
  IF status<>'reversal_recorded' THEN RAISE EXCEPTION 'refund failed'; END IF;
  status:=supporter_private.f16_lab_record_reversal('PAY-001','refunded',event_time);
  IF status<>'reversal_duplicate' THEN RAISE EXCEPTION 'refund duplicate not idempotent'; END IF;
  status:=supporter_private.f16_lab_record_payment(
    'PAY-001','I-SUB-001',owner,'P-14V25407JP6850922NLHMDKI',
    299,'USD',event_time);
  IF status<>'duplicate_blocked' THEN RAISE EXCEPTION 'replayed refund resumed payment'; END IF;

  IF (SELECT count(*) FROM supporter_private.paypal_payment_entries)<>2 OR
     (SELECT count(*) FROM supporter_private.paypal_payment_reversals)<>2 OR
     (SELECT count(*) FROM supporter_private.paypal_payment_entries
       WHERE entry_state='blocked_reversal')<>2
  THEN RAISE EXCEPTION 'ledger tombstone cardinality/state incorrect'; END IF;

  rejected:=false;
  BEGIN
    PERFORM supporter_private.f16_lab_record_payment(
      'PAY-001','I-SUB-OTH',owner,'P-14V25407JP6850922NLHMDKI',299,'USD',event_time);
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'conflicting payment identity accepted'; END IF;

  rejected:=false;
  BEGIN
    PERFORM supporter_private.f16_lab_record_payment(
      'PAY-BAD','I-SUB-001',owner,'P-14V25407JP6850922NLHMDKI',300,'USD',event_time);
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'wrong paid amount accepted'; END IF;

  rejected:=false;
  BEGIN
    PERFORM supporter_private.f16_lab_record_payment(
      'PAY-BAD','I-SUB-001',owner,'P-WRONG',299,'USD',event_time);
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'wrong plan accepted'; END IF;

  rejected:=false;
  BEGIN
    PERFORM supporter_private.f16_lab_record_reversal(
      'PAY-001','partially_refunded',event_time);
  EXCEPTION WHEN invalid_parameter_value THEN rejected:=true; END;
  IF NOT rejected THEN RAISE EXCEPTION 'conflicting refund details silently overwritten'; END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE
    oid=to_regclass('supporter_private.coverage_periods'))
  THEN RAISE EXCEPTION 'ledger lab must not create entitlement periods'; END IF;
  RAISE NOTICE 'PASS F16 lab ledger: exact amount, dedup, reversal before and after payment, no coverage';
END $scenario$;
ROLLBACK;
