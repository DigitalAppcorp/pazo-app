-- PAZO F14 A2: read-only privileges regression (no fixtures or files touched).
BEGIN;
DO $f14_acl$
DECLARE v_schema oid;
BEGIN
 SELECT oid INTO v_schema FROM pg_namespace WHERE nspname='moderation_private';
 IF v_schema IS NULL THEN RAISE EXCEPTION 'Missing moderation_private schema'; END IF;
 IF has_schema_privilege('anon',v_schema,'USAGE') OR
    has_schema_privilege('authenticated',v_schema,'USAGE') OR
    has_schema_privilege('service_role',v_schema,'USAGE')
 THEN RAISE EXCEPTION 'Private moderation schema inadvertently exposed to API roles'; END IF;
 IF has_function_privilege('anon','public.f14_prepare_media_claim(text,uuid)','EXECUTE') OR
    has_function_privilege('authenticated','public.f14_prepare_media_claim(text,uuid)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f14_prepare_media_claim(text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Claim preparation role grants changed'; END IF;
 IF has_function_privilege('anon','public.f14_recheck_media_claim(uuid)','EXECUTE') OR
    has_function_privilege('authenticated','public.f14_recheck_media_claim(uuid)','EXECUTE') OR
    NOT has_function_privilege('service_role','public.f14_recheck_media_claim(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Claim recheck role grants changed'; END IF;
 IF has_function_privilege('anon','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE') OR
    has_function_privilege('authenticated','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE') OR
    has_function_privilege('service_role','public.f14_confirm_media_cleanup(text,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Disabled cleanup confirmation can be called'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
 WHERE tgname='f14_no_unverified_media_purge'
 AND tgrelid='moderation_private.content_restrictions'::regclass
 AND tgenabled in ('O','A'))
 THEN RAISE EXCEPTION 'No-false-purge trigger missing or disabled'; END IF;
END $f14_acl$;
ROLLBACK;
