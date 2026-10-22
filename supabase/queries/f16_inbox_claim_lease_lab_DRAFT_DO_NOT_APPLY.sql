-- PAZO F16 — OFFLINE POSTGRES 17 LAB ONLY; DRAFT, DO NOT APPLY HOSTED.
-- No migration, worker scheduler, PayPal call, ledger write or entitlement.
-- Prerequisites: F16 verified inbox migration and eleven-event catalog in disposable DB.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'F16 lease lab requires isolated PG17'; END IF;
 IF pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'Verified inbox baseline missing'; END IF;
END $guard$;

ALTER TABLE supporter_private.paypal_verified_event_inbox
 ADD COLUMN f16_lease_token uuid,
 ADD COLUMN f16_lease_expires_at timestamptz,
 ADD CONSTRAINT f16_inbox_lease_shape CHECK (
   (processing_state='processing' AND f16_lease_token IS NOT NULL
     AND f16_lease_expires_at IS NOT NULL)
   OR (processing_state<>'processing' AND f16_lease_token IS NULL
     AND f16_lease_expires_at IS NULL)
 );
-- No direct grants: API roles continue to have zero SELECT/UPDATE privileges.

CREATE FUNCTION public.f16_lab_claim_verified_inbox(
 p_provider_event_id text DEFAULT NULL, p_lease_seconds integer DEFAULT 60
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_verified_event_inbox%ROWTYPE;
        v_token uuid;
BEGIN
 IF (p_provider_event_id IS NOT NULL AND
     p_provider_event_id !~ '^[A-Za-z0-9._-]{1,128}$')
    OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 15 AND 300
 THEN RAISE EXCEPTION 'Invalid claim request' USING ERRCODE='22023'; END IF;
 -- Both candidate choice and state transition occur under one row lock.
 -- Expired leases are NOT silently stolen; the explicit recovery RPC requeues.
 SELECT * INTO v FROM supporter_private.paypal_verified_event_inbox
 WHERE (p_provider_event_id IS NULL OR provider_event_id=p_provider_event_id)
   AND processing_state='pending'
   AND retention_hold IS TRUE
   AND next_attempt_at <= pg_catalog.clock_timestamp()
   AND attempt_count < 5
 ORDER BY verified_at,provider_event_id
 FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN NULL; END IF;
 v_token:=pg_catalog.gen_random_uuid();
 UPDATE supporter_private.paypal_verified_event_inbox SET
   processing_state='processing',
   attempt_count=attempt_count+1,
   f16_lease_token=v_token,
   f16_lease_expires_at=pg_catalog.clock_timestamp()
     + pg_catalog.make_interval(secs=>p_lease_seconds),
   last_error_code=NULL
 WHERE provider_event_id=v.provider_event_id;
 RETURN pg_catalog.jsonb_build_object(
  'provider_event_id',v.provider_event_id,'event_type',v.event_type,
  'lease_token',v_token,'attempt',v.attempt_count+1,
  'lease_expires_at',(SELECT f16_lease_expires_at
     FROM supporter_private.paypal_verified_event_inbox
     WHERE provider_event_id=v.provider_event_id));
END $body$;

CREATE FUNCTION public.f16_lab_ack_lifecycle(
 p_provider_event_id text,p_lease_token uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v_ok boolean;
BEGIN
 -- Payment events must be atomically committed with their matching financial
 -- ledger entries in a FUTURE approved implementation, never via this ack.
 UPDATE supporter_private.paypal_verified_event_inbox SET
  processing_state='processed',processed_at=pg_catalog.clock_timestamp(),
  f16_lease_token=NULL,f16_lease_expires_at=NULL,
  retention_hold=true,retention_released_at=NULL,last_error_code=NULL
 WHERE provider_event_id=p_provider_event_id AND f16_lease_token=p_lease_token
  AND p_lease_token IS NOT NULL
  AND processing_state='processing'
  AND f16_lease_expires_at > pg_catalog.clock_timestamp()
  AND event_type LIKE 'BILLING.SUBSCRIPTION.%'
 RETURNING true INTO v_ok;
 RETURN COALESCE(v_ok,false);
END $body$;

CREATE FUNCTION public.f16_lab_release_claim(
 p_provider_event_id text,p_lease_token uuid,
 p_error_code text,p_terminal boolean DEFAULT false
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v_ok boolean;
BEGIN
 IF p_error_code IS NULL OR p_error_code NOT IN
 ('provider_unavailable','owner_unbound','ambiguous_payment',
  'original_sale_unverified','worker_crash','permanent_invalid',
  'unverified_provider_state')
 THEN RAISE EXCEPTION 'Invalid sanitized error code'
   USING ERRCODE='22023'; END IF;
 UPDATE supporter_private.paypal_verified_event_inbox SET
  processing_state=CASE WHEN p_terminal OR attempt_count>=5
                         THEN 'quarantined' ELSE 'pending' END,
  next_attempt_at=pg_catalog.clock_timestamp()
      + pg_catalog.make_interval(secs=>LEAST(3600,5*(2 ^ LEAST(attempt_count,8))::integer)),
  last_error_code=p_error_code,
  f16_lease_token=NULL,f16_lease_expires_at=NULL,
  retention_hold=true,retention_released_at=NULL
 WHERE provider_event_id=p_provider_event_id AND f16_lease_token=p_lease_token
   AND p_lease_token IS NOT NULL
   AND processing_state='processing'
   AND f16_lease_expires_at > pg_catalog.clock_timestamp()
 RETURNING true INTO v_ok;
 RETURN COALESCE(v_ok,false);
END $body$;

CREATE FUNCTION public.f16_lab_recover_expired(p_max_rows integer DEFAULT 50)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v_count integer;
BEGIN
 IF p_max_rows IS NULL OR p_max_rows NOT BETWEEN 1 AND 100
 THEN RAISE EXCEPTION 'Invalid recovery batch' USING ERRCODE='22023'; END IF;
 WITH locked AS (
  SELECT provider_event_id FROM supporter_private.paypal_verified_event_inbox
  WHERE processing_state='processing'
    AND f16_lease_expires_at<=pg_catalog.clock_timestamp()
  ORDER BY f16_lease_expires_at,provider_event_id
  FOR UPDATE SKIP LOCKED LIMIT p_max_rows
 ), recovered AS (
  UPDATE supporter_private.paypal_verified_event_inbox i SET
   processing_state=CASE WHEN i.attempt_count>=5
                          THEN 'quarantined' ELSE 'pending' END,
   f16_lease_token=NULL,f16_lease_expires_at=NULL,
   next_attempt_at=pg_catalog.clock_timestamp()
       + pg_catalog.make_interval(secs=>LEAST(3600,5*(2 ^ LEAST(i.attempt_count,8))::integer)),
   last_error_code='lease_expired',
   retention_hold=true,retention_released_at=NULL
  FROM locked WHERE i.provider_event_id=locked.provider_event_id
  RETURNING i.provider_event_id
 )
 SELECT count(*) INTO v_count FROM recovered;
 RETURN v_count;
END $body$;

DO $acl$
DECLARE f text;
BEGIN
 FOREACH f IN ARRAY ARRAY[
  'public.f16_lab_claim_verified_inbox(text,integer)',
  'public.f16_lab_ack_lifecycle(text,uuid)',
  'public.f16_lab_release_claim(text,uuid,text,boolean)',
  'public.f16_lab_recover_expired(integer)'
 ] LOOP
  EXECUTE 'ALTER FUNCTION '||f||' OWNER TO postgres';
  EXECUTE 'REVOKE ALL ON FUNCTION '||f||' FROM PUBLIC,anon,authenticated,service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||f||' TO service_role';
 END LOOP;
END $acl$;
COMMIT;
