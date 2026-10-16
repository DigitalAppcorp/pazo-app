-- F16 P42 — structural readiness only. Read-only, zero secrets or writes.
-- This is NOT authorization to provision, activate or register anything.
-- May execute against hosted Supabase or disposable PG17; fails closed.
BEGIN TRANSACTION READ ONLY;
DO $check$
BEGIN
 IF current_database() NOT IN ('postgres','f14_synthetic')
 OR to_regclass('supporter_private.p42_activation_signing_keys') IS NULL
 OR to_regclass('supporter_private.p42_activation_writer_gate') IS NULL
 OR to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 OR to_regprocedure('public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)') IS NULL
 THEN RAISE EXCEPTION 'P42 structural prerequisite missing' USING ERRCODE='55000'; END IF;
 IF (SELECT count(*) FROM supporter_private.p42_activation_signing_keys) <> 0
 OR (SELECT count(*) FROM supporter_private.p42_activation_writer_gate) <> 1
 OR (SELECT enabled FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT not_before FROM supporter_private.p42_activation_writer_gate WHERE id=1) IS NOT NULL
 OR (SELECT enabled FROM supporter_private.p05_inbox_worker_gate WHERE id=1) IS DISTINCT FROM false
 OR (SELECT count(*) FROM supporter_private.paypal_verified_activation_bindings) <> 0
 OR (SELECT count(*) FROM supporter_private.paypal_payment_entries) <> 0
 THEN RAISE EXCEPTION 'P42 is no longer inactive/empty; stop and re-audit' USING ERRCODE='55000'; END IF;
 IF EXISTS (
 SELECT 1 FROM pg_catalog.pg_class c
 WHERE c.oid IN ('supporter_private.p42_activation_signing_keys'::regclass,
 'supporter_private.p42_activation_writer_gate'::regclass)
 AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity))
 THEN RAISE EXCEPTION 'P42 RLS protection missing' USING ERRCODE='42501'; END IF;
 IF pg_catalog.has_table_privilege('anon','supporter_private.p42_activation_signing_keys','SELECT,INSERT,UPDATE,DELETE')
 OR pg_catalog.has_table_privilege('authenticated','supporter_private.p42_activation_signing_keys','SELECT,INSERT,UPDATE,DELETE')
 OR pg_catalog.has_table_privilege('service_role','supporter_private.p42_activation_signing_keys','SELECT,INSERT,UPDATE,DELETE')
 OR pg_catalog.has_table_privilege('service_role','supporter_private.p42_activation_writer_gate','SELECT,INSERT,UPDATE,DELETE')
 OR pg_catalog.has_function_privilege('anon',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 OR pg_catalog.has_function_privilege('service_role',
 'public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'P42 direct privilege unexpectedly available' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (
 SELECT 1 FROM pg_catalog.pg_proc p
 WHERE p.oid='public.f16_p42_register_authenticated_activation(text,text,text,uuid,text,text)'::regprocedure
 AND p.prosecdef AND 'search_path=' = ANY(p.proconfig))
 THEN RAISE EXCEPTION 'P42 RPC definer/search_path drifted' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname='pgcrypto')
 THEN RAISE EXCEPTION 'P42 required pgcrypto absent' USING ERRCODE='55000'; END IF;
END $check$;
SELECT 'P42_STRUCTURAL_PASS_NO_PROVISIONING_AUTHORITY' AS result,
 false AS mayProvisionRealKey,false AS mayEnableWriter,false AS mayRecordActivation,
 false AS mayRecordPayment,false AS mayGrantBenefits;
COMMIT;
