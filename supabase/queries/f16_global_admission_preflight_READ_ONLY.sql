-- PAZO F16 global admission — read-only hosted preflight/postflight.
-- No DDL, no mutations, no event/payment/PII rows, no secret material.
-- Expected BEFORE migration: installed=false; AFTER explicitly approved migration:
-- installed=true, RLS forced, only service_role may EXECUTE RPC.
WITH objs AS (
  SELECT
    pg_catalog.to_regclass('supporter_private.f16_webhook_request_budget') AS table_oid,
    pg_catalog.to_regprocedure('public.f16_paypal_try_admit_global()') AS rpc_oid
),
acl AS (
 SELECT table_oid, rpc_oid,
   (SELECT c.relrowsecurity AND c.relforcerowsecurity
    FROM pg_catalog.pg_class AS c WHERE c.oid=table_oid) AS rls_forced,
   (SELECT p.prosecdef AND
       pg_catalog.pg_get_userbyid(p.proowner)='postgres' AND
       p.proconfig @> ARRAY['search_path=""']
    FROM pg_catalog.pg_proc AS p WHERE p.oid=rpc_oid) AS secure_definer
 FROM objs
)
SELECT
 table_oid IS NOT NULL AS budget_table_installed,
 rpc_oid IS NOT NULL AS admission_rpc_installed,
 COALESCE(rls_forced,false) AS table_rls_forced,
 COALESCE(secure_definer,false) AS rpc_secure_definer,
 COALESCE(pg_catalog.has_function_privilege('anon',rpc_oid,'EXECUTE'),false) AS anon_can_execute,
 COALESCE(pg_catalog.has_function_privilege('authenticated',rpc_oid,'EXECUTE'),false) AS authenticated_can_execute,
 COALESCE(pg_catalog.has_function_privilege('service_role',rpc_oid,'EXECUTE'),false) AS service_role_can_execute
FROM acl;
