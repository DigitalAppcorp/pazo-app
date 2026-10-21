-- PAZO F16-P11 | READ-ONLY hosted readiness snapshot.
-- Does not fetch or output owner IDs, payer identity, event IDs or secrets.
-- Run manually with a trusted read-only administrative connection only.
-- Do not confuse financial table population with verified payment periods.
WITH private_counts AS (
 SELECT
   (SELECT count(*)::integer FROM supporter_private.paypal_subscription_intents) AS intents_total,
   (SELECT count(*)::integer FROM supporter_private.paypal_subscription_intents WHERE state='bound') AS intents_bound,
   (SELECT count(*)::integer FROM supporter_private.paypal_verified_event_inbox) AS inbox_total,
   (SELECT count(*)::integer FROM supporter_private.paypal_verified_event_inbox WHERE processing_state='pending') AS inbox_pending,
   (SELECT count(*)::integer FROM supporter_private.paypal_payment_entries) AS ledger_sales,
   (SELECT count(*)::integer FROM supporter_private.paypal_payment_reversals) AS ledger_reversals
),
catalog AS (
 SELECT
   to_regclass('supporter_private.paypal_p06_offers') IS NOT NULL AS p06_offers_installed,
   to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NOT NULL AS p06_checkout_installed,
   to_regprocedure('public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)') IS NOT NULL AS p06_checkout_rpc_installed,
   to_regprocedure('public.f16_p07_claim_provider_create(uuid,uuid,text)') IS NOT NULL AS p07_create_claim_rpc_installed,
   to_regprocedure('public.f16_p08_read_checkout_recovery(uuid,uuid)') IS NOT NULL AS p08_recovery_rpc_installed,
   to_regprocedure('public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)') IS NOT NULL AS p10_recovery_bind_rpc_installed,
   (
    SELECT count(*)::integer
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND (p.proname LIKE 'f16_paypal_%' OR p.proname LIKE 'f16_p0%' OR p.proname LIKE 'f16_p10%')
      AND (pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
           OR pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))
   ) AS potentially_exposed_financial_rpcs
)
SELECT 'sandbox' AS intended_environment,
 private_counts.*, catalog.*,
 -- None of the fields below attests merchant completeness, legal release or
 -- an accepted contractual service period. They are NEVER derived from counts.
 false AS may_activate_checkout,
 false AS may_record_new_financial_payment,
 false AS may_create_paid_period,
 false AS may_grant_benefits,
 false AS may_enable_live
FROM private_counts CROSS JOIN catalog;
