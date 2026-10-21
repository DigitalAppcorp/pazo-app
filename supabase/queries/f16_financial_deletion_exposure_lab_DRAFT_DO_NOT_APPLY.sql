-- PAZO F16 — LAB ONLY. No hosted deployment, financial purging or Auth action.
-- Strict, aggregate-only financial exposure for future F14 deletion preflight.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_payment_entries') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_payment_reversals') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'F16 financial deletion reviewer requires disposable PG17'; END IF;
END $guard$;

CREATE FUNCTION public.f16_lab_owner_financial_deletion_exposure(
 p_owner_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v_intents bigint; v_payments bigint; v_reversals bigint;
        v_unresolved boolean;
BEGIN
 IF p_owner_id IS NULL
 THEN RAISE EXCEPTION 'Owner identity missing' USING ERRCODE='22023'; END IF;
 SELECT COUNT(*) INTO v_intents
 FROM supporter_private.paypal_subscription_intents i WHERE i.owner_id=p_owner_id;
 SELECT COUNT(*) INTO v_payments
 FROM supporter_private.paypal_payment_entries p WHERE p.owner_id=p_owner_id;
 SELECT COUNT(*) INTO v_reversals
 FROM supporter_private.paypal_payment_entries p
 JOIN supporter_private.paypal_payment_reversals r
 ON r.external_payment_id=p.external_payment_id
 WHERE p.owner_id=p_owner_id;
 -- A signed payment or refund notification is unlinked until definitely
 -- reconciled; financial deletion is blocked for ANY such global uncertainty.
 -- An orphaned reversal means we cannot attribute it to a particular owner.
 SELECT EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox e
  WHERE e.event_type IN ('PAYMENT.SALE.COMPLETED',
    'PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')
  AND (e.processing_state<>'processed' OR
    e.reconciled_payment_id IS NULL)
 ) OR EXISTS (
  SELECT 1 FROM supporter_private.paypal_payment_reversals r
  WHERE NOT EXISTS (
   SELECT 1 FROM supporter_private.paypal_payment_entries p
   WHERE p.external_payment_id=r.external_payment_id)
 ) INTO v_unresolved;
 RETURN pg_catalog.jsonb_build_object(
  'owner_id',p_owner_id,'intent_count',v_intents,'payment_count',v_payments,
  'reversal_count',v_reversals,
  'has_unresolved_global_financial_events',v_unresolved);
END $body$;
ALTER FUNCTION public.f16_lab_owner_financial_deletion_exposure(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_lab_owner_financial_deletion_exposure(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_owner_financial_deletion_exposure(uuid)
 TO service_role;
COMMIT;
