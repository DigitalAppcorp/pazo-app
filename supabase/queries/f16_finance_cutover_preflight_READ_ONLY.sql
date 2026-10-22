-- PAZO F16 — READ ONLY, approved for hosted preflight (NO mutations).
-- Do not call an RPC, connect PayPal, print user IDs or inspect sensitive payloads.
-- Readiness is intentionally FALSE while legacy finance RPCs remain executable.
WITH catalog AS (
 SELECT p.oid, p.proname, p.prosecdef,
        pg_catalog.pg_get_userbyid(p.proowner) AS function_owner,
        p.proconfig,
        pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE') AS svc,
        pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon,
        pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authed
 FROM pg_catalog.pg_proc p
 JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN (
  'f16_paypal_commit_verified_sale','f16_paypal_commit_verified_reversal',
  'f16_lab_claim_verified_inbox','f16_lab_commit_claimed_sale',
  'f16_lab_commit_claimed_reversal','f16_lab_read_bound_intent_by_subscription',
  'f16_lab_read_known_reversal_ids'
 )
), acl AS (
 SELECT COUNT(*) FILTER (
   WHERE proname IN ('f16_paypal_commit_verified_sale',
                     'f16_paypal_commit_verified_reversal') AND svc
 ) AS legacy_finance_executable_by_service,
 COUNT(*) FILTER (
   WHERE (anon OR authed)
 ) AS publicly_executable_finance_helpers,
 COUNT(*) FILTER (
   WHERE proname LIKE 'f16_lab_%'
 ) AS disposable_lab_rpc_present
 FROM catalog
), state AS (
 SELECT
  (SELECT COUNT(*) FROM supporter_private.paypal_verified_event_inbox) AS inbox_total,
  (SELECT COUNT(*) FROM supporter_private.paypal_verified_event_inbox
    WHERE processing_state<>'pending' OR retention_hold IS DISTINCT FROM true)
    AS inbox_not_pending_or_unheld,
  (SELECT COUNT(*) FROM supporter_private.paypal_subscription_intents) AS intent_rows,
  (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries) AS payment_rows,
  (SELECT COUNT(*) FROM supporter_private.paypal_payment_reversals) AS reversal_rows,
  (SELECT COUNT(*) FROM supporter_private.wall_consents) AS consent_rows
), rls AS (
 SELECT COUNT(*) FILTER (
 WHERE NOT c.relrowsecurity OR NOT c.relforcerowsecurity) AS rls_not_forced
 FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='supporter_private'
 AND c.relname IN ('paypal_verified_event_inbox',
                   'paypal_subscription_intents',
                   'paypal_payment_entries','paypal_payment_reversals')
)
SELECT
 pg_catalog.current_database() AS database_name,
 acl.legacy_finance_executable_by_service,
 acl.publicly_executable_finance_helpers,
 acl.disposable_lab_rpc_present,
 rls.rls_not_forced,
 state.*,
 (acl.legacy_finance_executable_by_service=0
  AND acl.publicly_executable_finance_helpers=0
  AND acl.disposable_lab_rpc_present=0
  AND rls.rls_not_forced=0
  AND state.inbox_not_pending_or_unheld=0) AS minimum_legacy_cutover_hardening_pass
FROM acl CROSS JOIN state CROSS JOIN rls;
