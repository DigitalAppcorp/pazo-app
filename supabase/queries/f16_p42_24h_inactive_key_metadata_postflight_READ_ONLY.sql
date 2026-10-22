-- PAZO F16 P42 — key present, 24h UTC, but INACTIVE.
-- FUTURE METADATA-ONLY POSTFLIGHT. DO NOT RUN BEFORE AN INDEPENDENT
-- PO-APPROVED PROVISIONING: existing EMPTY preflight is canonical now.
-- NO DML, NO secrets, NO SELECT of key_bytes, NO HMAC calculations.
-- This verifies only DB metadata, not Edge secret existence or key equality.
BEGIN TRANSACTION READ ONLY;

DO $p42_inactive$
DECLARE
  v_key record;
  v_gate record;
BEGIN
  IF current_database() NOT IN ('postgres','f14_synthetic')
    OR to_regclass('supporter_private.p42_activation_signing_keys') IS NULL
    OR to_regclass('supporter_private.p42_activation_writer_gate') IS NULL
    OR to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
    OR to_regprocedure('public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)') IS NULL
  THEN
    RAISE EXCEPTION 'P42 prerequisite missing' USING ERRCODE='55000';
  END IF;

  IF (SELECT count(*) FROM supporter_private.p42_activation_signing_keys) <> 1
  THEN
    RAISE EXCEPTION 'P42 expected exactly one inert key row' USING ERRCODE='55000';
  END IF;

  -- Select ONLY nonsecret key metadata. Never SELECT key_bytes or derive a hash.
  SELECT key_id, enabled, not_before, not_after
  INTO v_key
  FROM supporter_private.p42_activation_signing_keys;

  IF v_key.key_id IS DISTINCT FROM 'P42_V1'
    OR v_key.enabled IS DISTINCT FROM false
    OR v_key.not_before IS NULL
    OR v_key.not_after IS NULL
    OR v_key.not_before <= clock_timestamp()
    OR v_key.not_after IS DISTINCT FROM v_key.not_before + interval '24 hours'
  THEN
    RAISE EXCEPTION 'P42 key version, status or prospective 24h window drift'
      USING ERRCODE='55000';
  END IF;

  IF (SELECT count(*) FROM supporter_private.p42_activation_writer_gate) <> 1
  THEN
    RAISE EXCEPTION 'P42 expected single disabled writer gate' USING ERRCODE='55000';
  END IF;

  SELECT enabled, not_before
  INTO v_gate
  FROM supporter_private.p42_activation_writer_gate
  WHERE id = 1;

  IF v_gate.enabled IS DISTINCT FROM false OR v_gate.not_before IS NOT NULL
    OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
    OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings) <> 0
    OR (SELECT count(*) FROM supporter_private.paypal_payment_entries) <> 0
  THEN
    RAISE EXCEPTION 'P42/P21 gates or financial state drifted'
      USING ERRCODE='55000';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid IN (
      'supporter_private.p42_activation_signing_keys'::regclass,
      'supporter_private.p42_activation_writer_gate'::regclass
    )
    AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)
  )
  THEN
    RAISE EXCEPTION 'P42 forced RLS absent' USING ERRCODE='42501';
  END IF;

  IF pg_catalog.has_table_privilege('anon','supporter_private.p42_activation_signing_keys','SELECT,INSERT,UPDATE,DELETE')
    OR pg_catalog.has_table_privilege('authenticated','supporter_private.p42_activation_signing_keys','SELECT,INSERT,UPDATE,DELETE')
    OR pg_catalog.has_table_privilege('service_role','supporter_private.p42_activation_signing_keys','SELECT,INSERT,UPDATE,DELETE')
    OR pg_catalog.has_table_privilege('service_role','supporter_private.p42_activation_writer_gate','SELECT,INSERT,UPDATE,DELETE')
    OR pg_catalog.has_function_privilege('anon','public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated','public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
    OR pg_catalog.has_function_privilege('service_role','public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
  THEN
    RAISE EXCEPTION 'P42 API role permission drift' USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)'::regprocedure
      AND p.prosecdef
      AND ('search_path=' = ANY(p.proconfig) OR 'search_path=""' = ANY(p.proconfig))
  )
  THEN
    RAISE EXCEPTION 'P42 definer/search_path drift' USING ERRCODE='42501';
  END IF;
END $p42_inactive$;

SELECT
  'P42_24H_INACTIVE_KEY_METADATA_PASS' AS result,
  false AS mayEnableWriter,
  false AS mayRecordActivation,
  false AS mayRecordPayment,
  false AS mayGrantBenefits;

COMMIT;
