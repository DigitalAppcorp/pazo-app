-- Disposable PG17 only: versioned synthetic HMAC checks and explicit revocation.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'P28 synthetic-only'; END IF;
END $guard$;
ALTER TABLE supporter_private.p28_historical_read_audit
 ADD COLUMN key_version text NOT NULL DEFAULT 'v1'
 CHECK (key_version ~ '^v[1-9][0-9]{0,5}$');
CREATE TABLE supporter_private.p28_lab_key_versions(
 key_version text PRIMARY KEY,
 active boolean NOT NULL,
 revoked boolean NOT NULL DEFAULT false,
 synthetic_secret text NOT NULL
);
CREATE UNIQUE INDEX p28_lab_one_active_key ON supporter_private.p28_lab_key_versions ((active)) WHERE active=true AND revoked=false;
INSERT INTO supporter_private.p28_lab_key_versions(key_version,active,revoked,synthetic_secret)
VALUES ('v1',false,true,'P28_SYNTHETIC_V1_ONLY_NOT_REAL_SECRET_2026'),
 ('v2',true,false,'P28_SYNTHETIC_V2_ONLY_NOT_REAL_SECRET_2026');
REVOKE ALL ON supporter_private.p28_lab_key_versions FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.f16_p28_lab_versioned_consume(p_event_id text,p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE extension_schema text; expected text; chosen text; chosen_version text; success boolean;
BEGIN
 IF p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$' OR p_request_id IS NULL
 THEN RETURN false; END IF;
 SELECT n.nspname INTO extension_schema FROM pg_catalog.pg_extension x
 JOIN pg_catalog.pg_namespace n ON n.oid=x.extnamespace WHERE x.extname='pgcrypto';
 IF extension_schema IS NULL THEN RETURN false; END IF;
 SELECT synthetic_secret,key_version INTO chosen,chosen_version
 FROM supporter_private.p28_lab_key_versions
 WHERE active=true AND revoked=false;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Use qualified function lookup from installed extension, never from the search path.
 SELECT n.nspname INTO extension_schema FROM pg_catalog.pg_extension x
 JOIN pg_catalog.pg_namespace n ON n.oid=x.extnamespace WHERE x.extname='pgcrypto';
 EXECUTE pg_catalog.format('SELECT pg_catalog.encode(%I.hmac($1,$2,$3),''hex'')',extension_schema)
 INTO expected USING pg_catalog.convert_to(p_event_id,'UTF8'),
 pg_catalog.convert_to(chosen,'UTF8'),'sha256';
 WITH spent AS (
 UPDATE supporter_private.p28_historical_read_audit a
 SET consumed_at=pg_catalog.clock_timestamp()
 WHERE a.request_id=p_request_id AND a.consumed_at IS NULL
 AND a.key_version=chosen_version
 AND a.event_fingerprint=expected
 RETURNING a.request_id
 )
 SELECT EXISTS(SELECT 1 FROM spent s JOIN supporter_private.paypal_verified_event_inbox e
 ON e.provider_event_id=p_event_id WHERE e.event_type='PAYMENT.SALE.COMPLETED'
 AND e.processing_state='pending' AND e.p05_claim_token IS NULL
 AND e.verified_at IS NOT NULL AND e.retention_hold=true) INTO success;
 RETURN COALESCE(success,false);
END $fn$;
REVOKE ALL ON FUNCTION public.f16_p28_lab_versioned_consume(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p28_lab_versioned_consume(text,uuid) TO service_role;
COMMIT;
