-- PAZO F16 P42: ONE-TIME PRODUCT OWNER ADMINISTRATIVE SQL EDITOR PATCH.
-- AUTHORIZATION: PO approved only absolute expiry fix; DO NOT run via blocked ChatGPT connector.
-- EXECUTION: project mrybvqdebbgcayuvgkkr, Supabase Dashboard SQL Editor, owner session.
-- This is prepared for HUMAN review/execution; THIS FILE HAS NOT BEEN EXECUTED.
-- Never use on another project. Never provision HMAC secrets or activate P21/P42.
-- Tested function body = existing inert P42 function plus absolute 24h expiry check.
-- Preflight aborts on ANY drift, key rows, enabled gates, paid ledger or permissions.
-- Single transaction, explicit 4s lock and 30s statement timeout.
-- Original (PG17 lab-PASS) blob 2961f9a8933d2e342cb04c681e8adbb8fae82046.
-- At success, only public.f16_p42_register_authenticated_activation FUNCTION changes.
-- Does not auto-record a Supabase CLI schema_migrations migration; reconcile later.
BEGIN;
SET LOCAL lock_timeout='4s';
SET LOCAL statement_timeout='30s';
SELECT pg_catalog.set_config('pazo.f16_p42_expiry_patch_go',
 'specific_po_sql_gate',true);
-- Snapshot guard: refuse changes since latest hosted read-only audit.
DO $snapshot_preflight$
BEGIN
 IF (SELECT pg_catalog.md5(pg_catalog.pg_get_functiondef(oid))
     FROM pg_catalog.pg_proc
     WHERE oid='public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)'::regprocedure
    ) IS DISTINCT FROM 'a18502d4798d9bdce72b50ff98cd50a9'
 THEN RAISE EXCEPTION 'P42 source definition drift: abort; no patch applied'
 USING ERRCODE='55000'; END IF;
END $snapshot_preflight$;
DO $preflight$
BEGIN
 IF current_user<>'postgres'
 OR NOT (
  (pg_catalog.current_database()='f14_synthetic' AND session_user='f14_admin')
  OR (pg_catalog.current_database()='postgres' AND
   pg_catalog.current_setting('pazo.f16_p42_expiry_patch_go',true)='specific_po_sql_gate')
 ) THEN RAISE EXCEPTION 'P42 expiry patch requires isolated lab or specific SQL GO'
 USING ERRCODE='42501'; END IF;
 IF pg_catalog.to_regprocedure(
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p42_activation_signing_keys') IS NULL
 OR pg_catalog.to_regclass('supporter_private.p42_activation_writer_gate') IS NULL
 OR (SELECT pg_catalog.count(*) FROM supporter_private.p42_activation_signing_keys)<>0
 OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_activation_bindings)<>0
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR pg_catalog.has_function_privilege('service_role',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P42 expiry patch preflight denied'
 USING ERRCODE='55000'; END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.f16_p42_register_authenticated_activation(
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
 OR v_key_end IS NULL
 OR v_issued_at>=v_key_end
 OR pg_catalog.clock_timestamp()>=v_key_end
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

-- CREATE OR REPLACE preserves existing privileges; assert no app grants.
DO $postflight$
BEGIN
 IF pg_catalog.has_function_privilege('service_role',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT pg_catalog.count(*) FROM supporter_private.p42_activation_signing_keys)<>0
 THEN RAISE EXCEPTION 'P42 expiry patch altered security posture'
 USING ERRCODE='55000'; END IF;
END $postflight$;
DO $strict_postflight$
BEGIN
 IF (
  SELECT pg_catalog.strpos(
   pg_catalog.regexp_replace(pg_catalog.pg_get_functiondef(oid),
    '[[:space:]]+','','g'),
   'clock_timestamp()>=v_key_end')
  FROM pg_catalog.pg_proc
  WHERE oid='public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)'::regprocedure
 )=0
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_activation_bindings)<>0
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_entries)<>0
 OR (SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_reversals)<>0
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR pg_catalog.has_function_privilege('service_role',
   'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
   'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon',
   'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR EXISTS (
  SELECT 1 FROM pg_catalog.pg_proc p,
   LATERAL pg_catalog.aclexplode(p.proacl) a
  WHERE p.oid='public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)'::regprocedure
   AND a.grantee=0 AND a.privilege_type='EXECUTE'
 )
 THEN RAISE EXCEPTION 'P42 strict postflight mismatch: rollback'
 USING ERRCODE='55000'; END IF;
END $strict_postflight$;
COMMIT;
-- Human operator: success requires COMMIT and final result with all flags expected.
SELECT pg_catalog.jsonb_build_object(
 'p42_absolute_expiry',
 (SELECT pg_catalog.strpos(
  pg_catalog.regexp_replace(pg_catalog.pg_get_functiondef(p.oid),
   '[[:space:]]+','','g'),
  'clock_timestamp()>=v_key_end')>0
  FROM pg_catalog.pg_proc p
  WHERE p.oid='public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)'::regprocedure),
 'p42_signing_keys',(SELECT pg_catalog.count(*) FROM supporter_private.p42_activation_signing_keys),
 'p42_writer',(SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1),
 'p21_worker',(SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1),
 'p40_bindings',(SELECT pg_catalog.count(*) FROM supporter_private.paypal_verified_activation_bindings),
 'ledger',(SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_entries),
 'reversals',(SELECT pg_catalog.count(*) FROM supporter_private.paypal_payment_reversals),
 'p42_anon_execute',pg_catalog.has_function_privilege('anon',
  'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE'),
 'p42_authenticated_execute',pg_catalog.has_function_privilege('authenticated',
  'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE'),
 'p42_service_execute',pg_catalog.has_function_privilege('service_role',
  'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
) AS p42_operator_postflight;
