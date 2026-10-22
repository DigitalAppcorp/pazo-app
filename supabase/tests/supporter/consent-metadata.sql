-- ONLY on disposable f14_synthetic PostgreSQL after applying the DRAFT there.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $guard$
DECLARE r text; f regprocedure;
BEGIN
  IF current_database() <> 'f14_synthetic'
    OR session_user <> 'f14_admin'
  THEN RAISE EXCEPTION 'Not the authorized synthetic PostgreSQL lab'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'supporter_private.wall_consents'::regclass
      AND relrowsecurity AND relforcerowsecurity
  ) THEN RAISE EXCEPTION 'Consent table lacks forced RLS'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='supporter_private' AND tablename='wall_consents'
  ) THEN RAISE EXCEPTION 'Consent table must have no direct RLS access policies'; END IF;
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_schema_privilege(r, 'supporter_private', 'USAGE')
      OR has_table_privilege(r,'supporter_private.wall_consents','SELECT')
      OR has_table_privilege(r,'supporter_private.wall_consents','INSERT')
      OR has_table_privilege(r,'supporter_private.wall_consents','UPDATE')
      OR has_table_privilege(r,'supporter_private.wall_consents','DELETE')
    THEN RAISE EXCEPTION 'Consent storage is directly exposed to %',r; END IF;
  END LOOP;
  IF has_function_privilege('anon','public.pazo_wall_consent_enable(uuid,text)','EXECUTE')
    OR has_function_privilege('anon','public.pazo_wall_consent_disable(uuid)','EXECUTE')
    OR has_function_privilege('anon','public.pazo_wall_my_consents()','EXECUTE')
  THEN RAISE EXCEPTION 'Anonymous RPC execution is exposed'; END IF;
  FOREACH f IN ARRAY ARRAY[
    'public.pazo_wall_consent_enable(uuid,text)'::regprocedure,
    'public.pazo_wall_consent_disable(uuid)'::regprocedure,
    'public.pazo_wall_my_consents()'::regprocedure,
    'supporter_private.wall_has_verified_entitlement(uuid)'::regprocedure
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE oid=f AND prosecdef AND proconfig @> ARRAY['search_path=""']
        AND pg_get_userbyid(proowner)='postgres'
    ) THEN RAISE EXCEPTION 'Unsafe owner/search_path/security-definer for %',f; END IF;
  END LOOP;
  IF has_function_privilege('authenticated',
      'supporter_private.wall_has_verified_entitlement(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Authenticated must not execute payment gate directly'; END IF;
  IF NOT has_function_privilege('authenticated',
      'public.pazo_wall_consent_disable(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Owner revocation must be available'; END IF;
  IF to_regprocedure('public.pazo_wall_public_list(text,integer,integer)') IS NOT NULL
  THEN RAISE EXCEPTION 'Public roster must not be deployed in consent-only gate'; END IF;
END;
$guard$;
ROLLBACK;
