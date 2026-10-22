-- PAZO F16-P42 — PO-approved empty/disabled infrastructure installation only.
-- PO expressly approved install of ONLY two private tables (zero signing keys;
-- P42 writer gate OFF) plus an RPC with no EXECUTE for application roles.
-- No provisioning of key material, grants, activation, PayPal requests,
-- Edge deployment, worker processing, payments or benefits is authorized.
-- Derived from PG17-tested F16-P42 hosted disabled candidate.
BEGIN;
-- One-time migration latch only; not a runtime permission or worker gate.
SET LOCAL pazo.f16_p42_hosted_ddl_go = 'independent_po_install_go';
SET LOCAL lock_timeout = '4s';
SET LOCAL statement_timeout = '30s';
DO $p42_preflight$
BEGIN
 IF current_user<>'postgres' OR NOT (
   (pg_catalog.current_database()='f14_synthetic' AND session_user='f14_admin')
   OR
   (pg_catalog.current_database()='postgres' AND
    pg_catalog.current_setting('pazo.f16_p42_hosted_ddl_go',true)='independent_po_install_go')
 ) THEN RAISE EXCEPTION 'P42 DDL requires independent install authorization'
  USING ERRCODE='42501'; END IF;
 IF pg_catalog.to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p05_inbox_worker_gate') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_payment_entries') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p42_activation_signing_keys') IS NOT NULL
 OR pg_catalog.to_regclass('supporter_private.p42_activation_writer_gate') IS NOT NULL
 OR pg_catalog.to_regprocedure('public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'P42 prerequisites or conflicts' USING ERRCODE='55000'; END IF;
 IF (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_activation_bindings)<>0
 THEN RAISE EXCEPTION 'P42 requires empty P40 and disabled financial processing'
 USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pgcrypto')
 THEN RAISE EXCEPTION 'P42 requires installed pgcrypto' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c
 WHERE c.oid='supporter_private.paypal_verified_activation_bindings'::pg_catalog.regclass
 AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'P42 requires P40 forced RLS' USING ERRCODE='55000'; END IF;
END $p42_preflight$;

-- No key rows can be added without a later separately approved provisioning.
CREATE TABLE supporter_private.p42_activation_signing_keys(
 key_id text PRIMARY KEY CHECK (key_id ~ '^P42_V[1-9][0-9]{0,3}$'),
 key_bytes bytea NOT NULL CHECK(pg_catalog.octet_length(key_bytes)>=32),
 enabled boolean NOT NULL DEFAULT false,
 not_before timestamptz NOT NULL,
 not_after timestamptz,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CONSTRAINT p42_key_valid_window CHECK(not_after IS NULL OR not_after>not_before)
);
ALTER TABLE supporter_private.p42_activation_signing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p42_activation_signing_keys FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p42_activation_signing_keys FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE supporter_private.p42_activation_writer_gate(
 id smallint PRIMARY KEY CHECK(id=1),
 enabled boolean NOT NULL DEFAULT false,
 not_before timestamptz,
 CONSTRAINT p42_gate_needs_cutoff CHECK(NOT enabled OR not_before IS NOT NULL)
);
INSERT INTO supporter_private.p42_activation_writer_gate(id,enabled,not_before)
 VALUES(1,false,NULL);
ALTER TABLE supporter_private.p42_activation_writer_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p42_activation_writer_gate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p42_activation_writer_gate FROM PUBLIC,anon,authenticated,service_role;

-- No public/API-role invocation is authorized. This function is inert unless
-- an admin separately provisions a valid key, enables the gate, and grants
-- controlled EXECUTE. None of those are part of this draft or current PO GO.
CREATE FUNCTION public.f16_p42_register_authenticated_activation(
 p_event_id text,p_subscription_id text,p_issued_at text,p_nonce uuid,
 p_key_id text,p_mac_hex text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $p42_register$
DECLARE v_key bytea; v_key_cutoff timestamptz; v_key_end timestamptz;
        v_gate_cutoff timestamptz; v_owner uuid; v_count bigint;
        v_issued_at timestamptz; v_pgcrypto_schema text;
        v_expected text; v_message text; v_inserted boolean; v_exists boolean;
BEGIN
 IF p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
 OR p_subscription_id IS NULL OR p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 OR p_issued_at IS NULL OR p_issued_at !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$'
 OR p_nonce IS NULL OR p_key_id IS NULL OR p_key_id !~ '^P42_V[1-9][0-9]{0,3}$'
 OR p_mac_hex IS NULL OR p_mac_hex !~ '^[0-9a-f]{64}$'
 THEN RETURN false; END IF;
 SELECT g.not_before INTO v_gate_cutoff
 FROM supporter_private.p42_activation_writer_gate g
 WHERE g.id=1 AND g.enabled=true;
 IF v_gate_cutoff IS NULL THEN RETURN false; END IF;
 BEGIN
  v_issued_at:=p_issued_at::timestamptz;
 EXCEPTION WHEN others THEN RETURN false; END;
 IF pg_catalog.abs(pg_catalog.date_part('epoch',
 (pg_catalog.clock_timestamp()-v_issued_at)))>120 THEN RETURN false; END IF;
 SELECT k.key_bytes,k.not_before,k.not_after
 INTO v_key,v_key_cutoff,v_key_end
 FROM supporter_private.p42_activation_signing_keys k
 WHERE k.key_id=p_key_id AND k.enabled=true;
 IF v_key IS NULL OR v_issued_at<v_key_cutoff
 OR (v_key_end IS NOT NULL AND v_issued_at>=v_key_end)
 OR v_issued_at<v_gate_cutoff THEN RETURN false; END IF;
 v_message:='p42|sandbox|'||p_key_id||'|'||p_event_id||'|'||
 p_subscription_id||'|'||p_issued_at||'|'||p_nonce::text;
 SELECT n.nspname INTO v_pgcrypto_schema
 FROM pg_catalog.pg_extension x
 JOIN pg_catalog.pg_namespace n ON n.oid=x.extnamespace
 WHERE x.extname='pgcrypto';
 IF v_pgcrypto_schema IS NULL THEN RETURN false; END IF;
 EXECUTE pg_catalog.format(
  'SELECT pg_catalog.encode(%I.hmac($1,$2,$3),''hex'')',v_pgcrypto_schema)
 INTO v_expected USING pg_catalog.convert_to(v_message,'UTF8'),v_key,'sha256';
 IF v_expected IS DISTINCT FROM p_mac_hex THEN RETURN false; END IF;
 SELECT pg_catalog.count(*),(pg_catalog.array_agg(i.owner_id))[1]
 INTO v_count,v_owner
 FROM supporter_private.paypal_subscription_intents i
 WHERE i.external_subscription_id=p_subscription_id AND i.provider='paypal'
 AND i.state='bound' AND i.plan_id='P-14V25407JP6850922NLHMDKI';
 IF v_count<>1 THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_event_inbox e
 WHERE e.provider_event_id=p_event_id
 AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
 AND e.verified_at>=v_key_cutoff AND e.verified_at>=v_gate_cutoff
 AND e.retention_hold=true)
 THEN RETURN false; END IF;
 -- The P40 trigger independently verifies BOUND owner + exact activation.
 INSERT INTO supporter_private.paypal_verified_activation_bindings
 (provider_event_id,subscription_id,owner_id)
 VALUES(p_event_id,p_subscription_id,v_owner)
 ON CONFLICT(provider_event_id) DO NOTHING RETURNING true INTO v_inserted;
 IF v_inserted IS TRUE THEN RETURN true; END IF;
 SELECT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings b
 WHERE b.provider_event_id=p_event_id AND b.subscription_id=p_subscription_id
 AND b.owner_id=v_owner) INTO v_exists;
 RETURN COALESCE(v_exists,false);
END $p42_register$;

-- PostgreSQL defaults new function EXECUTE to PUBLIC. Explicitly revoke in
-- the SAME migration transaction, including service_role. Zero users can call.
REVOKE ALL ON FUNCTION public.f16_p42_register_authenticated_activation(
 text,text,text,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
