\connect f14_synthetic
BEGIN;
SELECT gradual_test.assert('ISSUE85_QA_SCOPE_SERVICE_ONLY',NOT has_function_privilege('anon','public.pazo_f16_live_service_qa_original_scope()','EXECUTE') AND NOT has_function_privilege('authenticated','public.pazo_f16_live_service_qa_original_scope()','EXECUTE') AND has_function_privilege('service_role','public.pazo_f16_live_service_qa_original_scope()','EXECUTE'));
SELECT gradual_test.assert('ISSUE85_QA_DISPATCH_DB_ONLY',NOT has_function_privilege('service_role','supporter_private.pazo_live_original_qa_audit_dispatch()','EXECUTE'));
UPDATE supporter_private.gradual_campaign SET lifecycle='inactive',started_at=NULL;
UPDATE admin_private.pazo_live_release_control SET canary_owner='82000000-0000-4000-8000-000000000002';
UPDATE auth.users SET created_at='2026-10-23 22:58:00+00' WHERE id='82000000-0000-4000-8000-000000000002';
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT gradual_test.assert('ISSUE85_QA_SCOPE_ORIGINAL_BINDING',public.pazo_f16_live_service_qa_original_scope()->>'intentId'='intent-82000000-0000-4000-8000-000000000002');
UPDATE auth.users SET created_at='2026-10-23 23:01:00+00' WHERE id='82000000-0000-4000-8000-000000000002';
SELECT gradual_test.assert('ISSUE85_REAL_ACCOUNT_NEVER_AUDITED',public.pazo_f16_live_service_qa_original_scope() IS NULL);
DO $$ BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 BEGIN PERFORM public.pazo_f16_live_service_qa_original_scope();RAISE EXCEPTION 'Role accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
