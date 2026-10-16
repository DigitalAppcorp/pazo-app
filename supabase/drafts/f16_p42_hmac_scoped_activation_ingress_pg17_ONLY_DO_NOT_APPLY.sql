-- PAZO F16-P42 -- DISPOSABLE PG17 ONLY. NOT HOSTED MIGRATION.
-- Signing key intentionally synthetic; postgres owner controls key table.
-- Event receiver must sign ONLY after PayPal postback verification. This
-- protects against service_role callers merely spoofing an 'origin' string.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin' OR current_user<>'postgres'
 OR to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 THEN RAISE EXCEPTION 'P42 disposable P40 prerequisite only' USING ERRCODE='42501'; END IF;
END $guard$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE supporter_private.p42_lab_activation_signing_keys(
 key_id text PRIMARY KEY CHECK(key_id='LAB_V1'),
 key_bytes bytea NOT NULL CHECK(pg_catalog.octet_length(key_bytes)>=32),
 enabled boolean NOT NULL DEFAULT false,
 rotated_at timestamptz
);
ALTER TABLE supporter_private.p42_lab_activation_signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p42_lab_activation_signing_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p42_lab_activation_signing_keys
 FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO supporter_private.p42_lab_activation_signing_keys(key_id,key_bytes,enabled)
VALUES('LAB_V1',pg_catalog.convert_to('P42_SYNTHETIC_NEVER_USE_IN_PRODUCTION_2026','UTF8'),true);
CREATE FUNCTION public.f16_p42_lab_register_authenticated_activation(
 p_event_id text,p_subscription_id text,p_issued_at text,p_nonce uuid,
 p_key_id text,p_mac_hex text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_secret bytea; v_expected text; v_owner uuid; v_count integer;
        v_inserted boolean; v_match boolean;
        v_issued_at timestamptz; v_message text;
BEGIN
 IF p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
 OR p_subscription_id IS NULL OR p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 OR p_key_id IS DISTINCT FROM 'LAB_V1' OR p_nonce IS NULL
 OR p_issued_at IS NULL OR p_issued_at !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'
 OR p_mac_hex IS NULL OR p_mac_hex !~ '^[0-9a-f]{64}$'
 THEN RETURN false; END IF;
 BEGIN
  v_issued_at:=p_issued_at::timestamptz;
 EXCEPTION WHEN others THEN RETURN false; END;
 IF pg_catalog.abs(pg_catalog.date_part('epoch',
 (pg_catalog.clock_timestamp()-v_issued_at)))>120
 THEN RETURN false; END IF;
 SELECT k.key_bytes INTO v_secret
 FROM supporter_private.p42_lab_activation_signing_keys k
 WHERE k.key_id=p_key_id AND k.enabled=true;
 IF v_secret IS NULL THEN RETURN false; END IF;
 v_message:='p42|LAB_V1|'||p_event_id||'|'||p_subscription_id
   ||'|'||p_issued_at||'|'||p_nonce::text;
 v_expected:=pg_catalog.encode(public.hmac(
   pg_catalog.convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
 IF v_expected<>p_mac_hex THEN RETURN false; END IF;
 -- No marker asserted by an arbitrary caller counts as provider attestation.
 -- The receiver signing key is NOT proof of a PayPal settlement or paid period.
 SELECT pg_catalog.count(*),(pg_catalog.array_agg(i.owner_id))[1]
 INTO v_count,v_owner FROM supporter_private.paypal_subscription_intents i
 WHERE i.external_subscription_id=p_subscription_id
 AND i.provider='paypal' AND i.state='bound'
 AND i.plan_id='P-14V25407JP6850922NLHMDKI';
 IF v_count<>1 THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_event_inbox e
 WHERE e.provider_event_id=p_event_id AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
 AND e.verified_at IS NOT NULL AND e.retention_hold=true)
 THEN RETURN false; END IF;
 INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
 VALUES(p_event_id,p_subscription_id,v_owner)
 ON CONFLICT (provider_event_id) DO NOTHING
 RETURNING true INTO v_inserted;
 IF v_inserted IS TRUE THEN RETURN true; END IF;
 SELECT EXISTS (SELECT 1 FROM supporter_private.paypal_verified_activation_bindings b
 WHERE b.provider_event_id=p_event_id AND b.subscription_id=p_subscription_id
 AND b.owner_id=v_owner) INTO v_match;
 RETURN COALESCE(v_match,false);
END $fn$;
REVOKE ALL ON FUNCTION public.f16_p42_lab_register_authenticated_activation(
 text,text,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p42_lab_register_authenticated_activation(
 text,text,text,uuid,text,text) TO service_role;
COMMIT;
