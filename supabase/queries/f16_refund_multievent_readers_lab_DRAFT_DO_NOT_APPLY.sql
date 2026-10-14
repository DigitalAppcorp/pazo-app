-- F16 multievent read projections — disposable PG17 ONLY. NOT HOSTED.
-- Replaces old private read projections to include distinct refund IDs and
-- refund-before-sale holds; no new privileges, no direct table reads by clients.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
 OR session_user<>'f14_admin'
 OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
 OR pg_catalog.to_regclass('supporter_private.f16_lab_refund_events') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_lab_read_known_reversal_ids(text)') IS NULL
 OR pg_catalog.to_regprocedure('public.f16_lab_owner_financial_deletion_exposure(uuid)') IS NULL
 THEN RAISE EXCEPTION 'F16 multievent private readers require PG17 lab'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.f16_lab_read_known_reversal_ids(
 p_subscription_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE ids jsonb;
BEGIN
 IF p_subscription_id IS NULL OR
    p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RAISE EXCEPTION 'Invalid reversal subscription reference' USING ERRCODE='22023'; END IF;
 -- Any orphan across the provider remains UNKNOWN, not a fabricated empty set.
 IF EXISTS (
  SELECT 1 FROM supporter_private.paypal_payment_reversals r
  WHERE NOT EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries e
    WHERE e.external_payment_id=r.external_payment_id)
 ) OR EXISTS (
  SELECT 1 FROM supporter_private.f16_lab_refund_events r
  WHERE NOT EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries e
    WHERE e.external_payment_id=r.original_sale_id)
 ) OR EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox i
  WHERE i.event_type IN ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')
    AND i.processing_state<>'processed'
 ) THEN RETURN NULL; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(x.sale_id ORDER BY x.sale_id),'[]'::jsonb)
 INTO ids FROM (
  SELECT e.external_payment_id AS sale_id
   FROM supporter_private.paypal_payment_entries e
   JOIN supporter_private.paypal_payment_reversals r
     ON r.external_payment_id=e.external_payment_id
   WHERE e.external_subscription_id=p_subscription_id
  UNION
  SELECT r.original_sale_id AS sale_id
   FROM supporter_private.f16_lab_refund_events r
   WHERE r.subscription_id=p_subscription_id
 ) x;
 RETURN ids;
END $body$;

CREATE OR REPLACE FUNCTION public.f16_lab_owner_financial_deletion_exposure(
 p_owner_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE n_intents bigint; n_payments bigint; n_reversals bigint;
        unresolved boolean;
BEGIN
 IF p_owner_id IS NULL
 THEN RAISE EXCEPTION 'Owner ID missing' USING ERRCODE='22023'; END IF;
 SELECT COUNT(*) INTO n_intents FROM supporter_private.paypal_subscription_intents
  WHERE owner_id=p_owner_id;
 SELECT COUNT(*) INTO n_payments FROM supporter_private.paypal_payment_entries
  WHERE owner_id=p_owner_id;
 SELECT
  (SELECT COUNT(*) FROM supporter_private.paypal_payment_reversals r
   JOIN supporter_private.paypal_payment_entries e
    ON e.external_payment_id=r.external_payment_id
   WHERE e.owner_id=p_owner_id)
   +
  (SELECT COUNT(*) FROM supporter_private.f16_lab_refund_events r
   JOIN supporter_private.paypal_subscription_intents i
    ON i.external_subscription_id=r.subscription_id
   WHERE i.owner_id=p_owner_id) INTO n_reversals;
 SELECT EXISTS (
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox i
  WHERE i.event_type IN ('PAYMENT.SALE.COMPLETED',
     'PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')
   AND (i.processing_state<>'processed' OR i.reconciled_payment_id IS NULL)
 ) OR EXISTS (
  SELECT 1 FROM supporter_private.paypal_payment_reversals r
  WHERE NOT EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries e
   WHERE e.external_payment_id=r.external_payment_id)
 ) OR EXISTS (
  SELECT 1 FROM supporter_private.f16_lab_refund_events r
  WHERE NOT EXISTS (SELECT 1 FROM supporter_private.paypal_payment_entries e
   WHERE e.external_payment_id=r.original_sale_id)
 ) INTO unresolved;
 RETURN pg_catalog.jsonb_build_object(
  'owner_id',p_owner_id,'intent_count',n_intents,'payment_count',n_payments,
  'reversal_count',n_reversals,'has_unresolved_global_financial_events',unresolved);
END $body$;

ALTER FUNCTION public.f16_lab_read_known_reversal_ids(text) OWNER TO postgres;
ALTER FUNCTION public.f16_lab_owner_financial_deletion_exposure(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_lab_read_known_reversal_ids(text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_lab_owner_financial_deletion_exposure(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_read_known_reversal_ids(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_owner_financial_deletion_exposure(uuid) TO service_role;
COMMIT;
