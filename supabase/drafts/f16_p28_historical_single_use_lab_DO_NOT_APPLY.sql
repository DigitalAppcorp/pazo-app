-- P28 ATOMIC single-use historical review — disposable PG17 only.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'DISPOSABLE ONLY'; END IF;
 IF to_regclass('supporter_private.p28_historical_read_audit') IS NULL
 OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'prerequisites missing'; END IF;
END $guard$;
ALTER TABLE supporter_private.p28_historical_read_audit
 ADD COLUMN consumed_at timestamptz;
CREATE FUNCTION public.f16_p28_lab_consume_historical_candidate(
 p_event_id text,p_request_id uuid,p_event_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $body$
DECLARE result jsonb;
BEGIN
 IF p_request_id IS NULL OR p_event_id IS NULL OR
 p_event_id !~ '^[A-Za-z0-9._-]{3,128}$' OR
 p_event_fingerprint IS NULL OR p_event_fingerprint !~ '^[0-9a-f]{64}$'
 THEN RETURN NULL; END IF;
 -- Lock the audit row and consume it once, including if the candidate is absent.
 -- Concurrent callers of the same request UUID serialize on UPDATE.
 WITH consumed AS (
   UPDATE supporter_private.p28_historical_read_audit a
   SET consumed_at=pg_catalog.clock_timestamp()
   WHERE a.request_id=p_request_id
    AND a.event_fingerprint=p_event_fingerprint
    AND a.action='historical_candidate_exact_read'
    AND a.consumed_at IS NULL
   RETURNING a.request_id
 )
 SELECT pg_catalog.jsonb_build_object('id',e.provider_event_id,'processingState',e.processing_state)
 INTO result
 FROM consumed c
 JOIN supporter_private.paypal_verified_event_inbox e ON e.provider_event_id=p_event_id
 WHERE e.event_type='PAYMENT.SALE.COMPLETED'
 AND e.processing_state='pending' AND e.p05_claim_token IS NULL
 AND e.verified_at IS NOT NULL AND e.retention_hold=true
 LIMIT 1;
 RETURN result;
END $body$;
REVOKE ALL ON FUNCTION public.f16_p28_lab_consume_historical_candidate(text,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_lab_consume_historical_candidate(text,uuid,text)
 TO service_role;
COMMIT;
