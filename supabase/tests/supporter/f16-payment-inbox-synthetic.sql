-- F16 lab-only: prove scoped permissions and idempotency.
\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ROLE anon;
DO $guard$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.f16_paypal_record_verified_event(
      'WH-NEVER-ANON','PAYMENT.SALE.COMPLETED');
  EXCEPTION WHEN insufficient_privilege THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'anon reached privileged F16 function'; END IF;
END;
$guard$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $guard$
DECLARE rejected boolean := false;
BEGIN
  BEGIN
    PERFORM public.f16_paypal_record_verified_event(
      'WH-NEVER-AUTH','PAYMENT.SALE.COMPLETED');
  EXCEPTION WHEN insufficient_privilege THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'authenticated reached privileged F16 function'; END IF;
END;
$guard$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $case$
DECLARE first_insert boolean; retry_insert boolean; bad_ref boolean:=false; bad_type boolean:=false;
BEGIN
  first_insert := public.f16_paypal_record_verified_event(
    'WH-F16-VALID-001','PAYMENT.SALE.COMPLETED');
  retry_insert := public.f16_paypal_record_verified_event(
    'WH-F16-VALID-001','PAYMENT.SALE.COMPLETED');
  IF first_insert IS DISTINCT FROM true OR retry_insert IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'F16 event must insert once and dedupe retries'; END IF;

  BEGIN
    PERFORM public.f16_paypal_record_verified_event(
      'WH/INVALID?REF','PAYMENT.SALE.COMPLETED');
  EXCEPTION WHEN invalid_parameter_value THEN bad_ref:=true;
  END;
  IF NOT bad_ref THEN RAISE EXCEPTION 'Bad F16 event ID was accepted'; END IF;

  BEGIN
    PERFORM public.f16_paypal_record_verified_event(
      'WH-F16-UNKNOWN','PRIVATE.USER.DATA');
  EXCEPTION WHEN invalid_parameter_value THEN bad_type:=true;
  END;
  IF NOT bad_type THEN RAISE EXCEPTION 'Unrecognized F16 event type was accepted'; END IF;
END;
$case$;
RESET ROLE;

UPDATE supporter_private.paypal_verified_event_inbox
SET processing_state='quarantined',attempt_count=4,last_error_code='provider_unavailable'
WHERE provider_event_id='WH-F16-VALID-001';

SET LOCAL ROLE service_role;
DO $case$
DECLARE duplicate boolean; conflict_rejected boolean:=false;
BEGIN
  duplicate:=public.f16_paypal_record_verified_event(
    'WH-F16-VALID-001','PAYMENT.SALE.COMPLETED');
  IF duplicate IS DISTINCT FROM false THEN RAISE EXCEPTION 'Stateful retry falsely inserted'; END IF;
  BEGIN
    PERFORM public.f16_paypal_record_verified_event(
      'WH-F16-VALID-001','PAYMENT.SALE.REFUNDED');
  EXCEPTION WHEN invalid_parameter_value THEN conflict_rejected:=true;
  END;
  IF NOT conflict_rejected THEN
    RAISE EXCEPTION 'Same ID with mismatched event type was accepted'; END IF;
END;
$case$;
RESET ROLE;

DO $case$
DECLARE saved record;
BEGIN
  SELECT * INTO saved FROM supporter_private.paypal_verified_event_inbox
  WHERE provider_event_id='WH-F16-VALID-001';
  IF saved.processing_state<>'quarantined' OR saved.attempt_count<>4
     OR saved.last_error_code<>'provider_unavailable'
     OR saved.event_type<>'PAYMENT.SALE.COMPLETED'
  THEN RAISE EXCEPTION 'F16 duplicate modified the original durable event'; END IF;
  IF (SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_event_inbox)<>1
  THEN RAISE EXCEPTION 'F16 inbox count differs from unique event IDs'; END IF;
END;
$case$;
ROLLBACK;
