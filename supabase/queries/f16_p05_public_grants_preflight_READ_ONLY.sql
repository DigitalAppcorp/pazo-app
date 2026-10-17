-- PAZO F16-P05: hosted catalog security preflight (READ ONLY).
-- Never run migrations, alter defaults, or read buyer/payment records.
-- Suitable for Supabase SQL Editor/MCP read-only review.
-- A SAFE existing baseline does NOT authorize new SQL or a deploy.
WITH
f16_rpc AS (
 SELECT p.oid,p.proname,p.prosecdef,
        has_function_privilege('anon',p.oid,'EXECUTE') anon_exec,
        has_function_privilege('authenticated',p.oid,'EXECUTE') auth_exec,
        has_function_privilege('service_role',p.oid,'EXECUTE') service_exec
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'f16_paypal_%'
),
private_tables AS (
 SELECT c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,
        has_table_privilege('anon',c.oid,'SELECT') anon_select,
        has_table_privilege('authenticated',c.oid,'SELECT') auth_select,
        has_table_privilege('service_role',c.oid,'SELECT') service_select
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='supporter_private' AND c.relkind='r'
),
new_public_function_grants AS (
 SELECT EXISTS(
  SELECT 1 FROM pg_default_acl d
  JOIN pg_namespace n ON n.oid=d.defaclnamespace
  JOIN pg_roles owner ON owner.oid=d.defaclrole
  CROSS JOIN LATERAL aclexplode(d.defaclacl) grant_item
  LEFT JOIN pg_roles grantee ON grantee.oid=grant_item.grantee
  WHERE n.nspname='public' AND owner.rolname='postgres'
    AND d.defaclobjtype='f'
    AND grant_item.privilege_type='EXECUTE'
    AND (grantee.rolname IN ('anon','authenticated')
      OR grant_item.grantee=0)
 ) AS has_client_execute_default
),
pending_private_rpc AS (
 SELECT count(*)::integer AS count
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public'
 AND p.proname IN (
  'f16_p05_draft_resolve_claimed_subscription',
  'f16_p05_draft_read_pazo_payment_by_sale',
  'f16_p05_draft_read_bound_intent_for_sale',
  'f16_p05_draft_claim_next_verified_event',
  'f16_p05_draft_finish_claimed_event'
 )
),
checks AS (
 SELECT 'f16_existing_rpc_least_privilege' check_name,
  CASE WHEN count(*)=7 AND bool_and(
   prosecdef AND NOT anon_exec AND NOT auth_exec AND service_exec)
  THEN 'PASS' ELSE 'BLOCK' END outcome,
  'Existing f16_paypal_* execute only as service_role' explanation
 FROM f16_rpc
 UNION ALL
 SELECT 'supporter_private_access',
  CASE WHEN count(*)=6 AND bool_and(
   relrowsecurity AND relforcerowsecurity AND
   NOT anon_select AND NOT auth_select AND NOT service_select)
  THEN 'PASS' ELSE 'BLOCK' END,
  'Private tables FORCE RLS; no direct SELECT for Data API roles'
 FROM private_tables
 UNION ALL
 SELECT 'new_public_function_default_execute',
  CASE WHEN has_client_execute_default THEN 'BLOCK_NEW_DDL'
  ELSE 'PASS' END,
  'Public functions created by postgres may inherit EXECUTE for API clients; explicit REVOKE PUBLIC/anon/authenticated required in the SAME transaction'
 FROM new_public_function_grants
 UNION ALL
 SELECT 'p05_privileged_drafts_not_installed',
  CASE WHEN count=0 THEN 'PASS' ELSE 'REVIEW' END,
  'P05 privileged claim/ledger draft RPCs must not be assumed deployed'
 FROM pending_private_rpc
)
SELECT check_name,outcome,explanation
FROM checks ORDER BY check_name;
