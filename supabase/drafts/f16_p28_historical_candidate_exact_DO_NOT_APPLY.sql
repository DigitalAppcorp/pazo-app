-- F16-P28 historical candidate exact-ID read — PG17 DISPOSABLE LAB ONLY.
-- NEVER APPLY HOSTED without separate PO approval and privacy/audit review.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P28 synthetic-only draft' USING ERRCODE='42501';
 END IF;
 IF to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL OR
 to_regclass('supporter_private.p28_historical_read_audit') IS NULL THEN
  RAISE EXCEPTION 'P28 inbox absent' USING ERRCODE='55000';
 END IF;
END
$guard$;
CREATE FUNCTION public.f16_p28_read_historical_candidate_exact(
 p_event_id text,p_request_id uuid,p_event_fingerprint text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $read$
 SELECT pg_catalog.jsonb_build_object(
    'id',e.provider_event_id,'processingState',e.processing_state)
 FROM supporter_private.paypal_verified_event_inbox e
 JOIN supporter_private.p28_historical_read_audit a
 ON a.request_id=p_request_id AND a.event_fingerprint=p_event_fingerprint
 AND a.action='historical_candidate_exact_read'
 WHERE p_event_id ~ '^[A-Za-z0-9._-]{3,128}$'
  AND p_request_id IS NOT NULL
  AND p_event_fingerprint ~ '^[0-9a-f]{64}
  AND e.provider_event_id=p_event_id
  AND e.event_type='PAYMENT.SALE.COMPLETED'
  AND e.processing_state='pending'
  AND e.p05_claim_token IS NULL
  AND e.verified_at IS NOT NULL
  AND e.retention_hold=true
 LIMIT 1
$read$;
REVOKE ALL ON FUNCTION public.f16_p28_read_historical_candidate_exact(text,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_read_historical_candidate_exact(text,uuid)
 TO service_role;
COMMIT;

  AND e.provider_event_id=p_event_id
  AND e.event_type='PAYMENT.SALE.COMPLETED'
  AND e.processing_state='pending'
  AND e.p05_claim_token IS NULL
  AND e.verified_at IS NOT NULL
  AND e.retention_hold=true
 LIMIT 1
$read$;
REVOKE ALL ON FUNCTION public.f16_p28_read_historical_candidate_exact(text,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_read_historical_candidate_exact(text,uuid)
 TO service_role;
COMMIT;
