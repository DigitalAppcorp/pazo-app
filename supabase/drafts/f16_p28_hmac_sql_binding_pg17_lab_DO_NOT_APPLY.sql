-- P28 cryptographically linked historical review. SYNTHETIC PG17 LAB ONLY.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres' THEN RAISE EXCEPTION 'DISPOSABLE ONLY'; END IF;
END $guard$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Lab-only normalization: pgcrypto may be preinstalled under a different schema.
-- Do not move an extension owned by another lab role.
CREATE FUNCTION public.f16_p28_lab_hmac_consume(
 p_event_id text,p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE consumed boolean; ext_schema text; expected_fingerprint text;
BEGIN
 IF p_request_id IS NULL OR p_event_id IS NULL
 OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$' THEN RETURN false; END IF;
 -- Discover pgcrypto schema without changing extension ownership.
 SELECT n.nspname INTO ext_schema FROM pg_catalog.pg_extension x
 JOIN pg_catalog.pg_namespace n ON n.oid=x.extnamespace WHERE x.extname='pgcrypto';
 IF ext_schema IS NULL THEN RETURN false; END IF;
 EXECUTE pg_catalog.format('SELECT pg_catalog.encode(%I.hmac($1,$2,$3),''hex'')',ext_schema)
 INTO expected_fingerprint USING pg_catalog.convert_to(p_event_id,'UTF8'),
 pg_catalog.convert_to('PAZO_P28_DISPOSABLE_KEY_2026_NOT_A_REAL_SECRET','UTF8'),'sha256';
 -- Fixed TEST key is disposable-only fixture. NEVER ship this function.
 WITH spent AS (
 UPDATE supporter_private.p28_historical_read_audit a
 SET consumed_at=pg_catalog.clock_timestamp()
 WHERE a.request_id=p_request_id
 AND a.consumed_at IS NULL
 AND a.action='historical_candidate_exact_read'
 AND a.event_fingerprint=expected_fingerprint
 RETURNING a.request_id
 )
 SELECT EXISTS(
 SELECT 1 FROM spent s
 JOIN supporter_private.paypal_verified_event_inbox e
 ON e.provider_event_id=p_event_id
 WHERE e.event_type='PAYMENT.SALE.COMPLETED'
 AND e.processing_state='pending'
 AND e.p05_claim_token IS NULL AND e.verified_at IS NOT NULL
 AND e.retention_hold=true
 ) INTO consumed;
 RETURN COALESCE(consumed,false);
END $fn$;
REVOKE ALL ON FUNCTION public.f16_p28_lab_hmac_consume(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_lab_hmac_consume(text,uuid) TO service_role;
COMMIT;
