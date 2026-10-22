-- PAZO F16 — financial account deletion exposure, PG17 disposable only.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR pg_catalog.to_regprocedure('public.f16_lab_owner_financial_deletion_exposure(uuid)') IS NULL
 THEN RAISE EXCEPTION 'F16 deletion QA only in disposable PG17'; END IF;
 IF pg_catalog.has_function_privilege('anon',
  'public.f16_lab_owner_financial_deletion_exposure(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege('authenticated',
  'public.f16_lab_owner_financial_deletion_exposure(uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege('service_role',
  'public.f16_lab_owner_financial_deletion_exposure(uuid)','EXECUTE')
 OR pg_catalog.has_table_privilege('service_role',
  'supporter_private.paypal_payment_entries','SELECT')
 THEN RAISE EXCEPTION 'Unsafe private deletion preflight privileges'; END IF;
END $guard$;
CREATE TEMP TABLE before_counts ON COMMIT DROP AS
 SELECT (SELECT COUNT(*) FROM supporter_private.paypal_subscription_intents) intents,
        (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries) payments,
        (SELECT COUNT(*) FROM supporter_private.paypal_verified_event_inbox) inbox;
SET LOCAL ROLE service_role;
DO $zero$
DECLARE v jsonb;
BEGIN
 v:=public.f16_lab_owner_financial_deletion_exposure(
 '63e812b0-a7e5-49f6-b2dd-c11d2c72af57');
 IF v IS NULL OR pg_catalog.jsonb_typeof(v)<>'object'
    OR (SELECT COUNT(*) FROM pg_catalog.jsonb_object_keys(v))<>5
    OR v->>'owner_id'<>'63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
    OR (v->>'intent_count')::integer<0
    OR (v->>'payment_count')::integer<0
 THEN RAISE EXCEPTION 'Private projection unsafe'; END IF;
END $zero$;
SET LOCAL ROLE postgres;
INSERT INTO supporter_private.paypal_subscription_intents
 (intent_id,owner_id,provider,plan_id)
VALUES ('intent-af7c8129-4d60-4296-b3e0-a1c81e318ee7',
 '63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
 'paypal','P-14V25407JP6850922NLHMDKI');
INSERT INTO supporter_private.paypal_payment_entries
 (external_payment_id,external_subscription_id,owner_id,plan_id,
  gross_minor_units,currency,completed_at,entry_state)
VALUES ('PAY-DELETE-REVIEW-QA','I-DELETE-REVIEW-QA',
'63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
'P-14V25407JP6850922NLHMDKI',299,'USD',
'2026-10-13T19:00:00Z','uncredited');
SET LOCAL ROLE service_role;
DO $linked$
DECLARE v jsonb;
BEGIN
 v:=public.f16_lab_owner_financial_deletion_exposure(
 '63e812b0-a7e5-49f6-b2dd-c11d2c72af57');
 IF (v->>'intent_count')::integer<1 OR
    (v->>'payment_count')::integer<1 OR
    (v->>'reversal_count')::integer<0
 THEN RAISE EXCEPTION 'Linked account finance records were missed'; END IF;
END $linked$;
SET LOCAL ROLE postgres;
INSERT INTO supporter_private.paypal_verified_event_inbox
 (provider_event_id,event_type)
VALUES ('WH-DELETE-REVIEW-QA','PAYMENT.SALE.REFUNDED');
SET LOCAL ROLE service_role;
DO $unresolved$
DECLARE v jsonb;
BEGIN
 v:=public.f16_lab_owner_financial_deletion_exposure(
 '63e812b0-a7e5-49f6-b2dd-c11d2c72af57');
 IF (v->>'has_unresolved_global_financial_events')::boolean IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Pending provider refund was ignored in deletion preflight'; END IF;
END $unresolved$;
SET LOCAL ROLE postgres;
DO $safety$
BEGIN
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid)
 THEN RAISE EXCEPTION 'Deletion preflight granted membership'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.paypal_subscription_intents) <>
    (SELECT intents+1 FROM before_counts)
 OR (SELECT COUNT(*) FROM supporter_private.paypal_payment_entries) <>
    (SELECT payments+1 FROM before_counts)
 OR (SELECT COUNT(*) FROM supporter_private.paypal_verified_event_inbox) <>
    (SELECT inbox+1 FROM before_counts)
 THEN RAISE EXCEPTION 'Unexpected financial side effects'; END IF;
END $safety$;
ROLLBACK;
SELECT 'PASS F16: service-only deletion exposure, no PII, financial blockers, rollback';

