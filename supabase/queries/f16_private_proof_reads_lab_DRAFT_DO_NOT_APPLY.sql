-- PAZO F16 — disposable PG17 only. DRAFT, NEVER APPLY TO HOSTED.
-- Service-only exact bound intent / known reversal evidence, no RLS/table grants.
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
 THEN RAISE EXCEPTION 'F16 private proof lab requires isolated PG17 and finance baseline'; END IF;
END $guard$;

CREATE FUNCTION public.f16_lab_read_bound_intent_by_subscription(
 p_subscription_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v supporter_private.paypal_subscription_intents%ROWTYPE;
BEGIN
 IF p_subscription_id IS NULL OR
    p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RAISE EXCEPTION 'Invalid private subscription reference' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM supporter_private.paypal_subscription_intents
 WHERE external_subscription_id=p_subscription_id AND state='bound'
   AND provider='paypal' AND plan_id='P-14V25407JP6850922NLHMDKI';
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object(
  'id',v.intent_id,'owner_id',v.owner_id,'provider',v.provider,
  'plan_id',v.plan_id,'state',v.state,
  'external_subscription_id',v.external_subscription_id);
END $body$;

-- Return NULL when any unmatched reversal or unresolved reversal event is
-- present: absence of known IDs is NOT absence of provider refunds.
-- This intentionally fails closed across the entire private inbox/ledger.
-- Future proofs require a provider-complete reversal view and reconciliation
-- of old notifications before this could authorize any financial worker.
CREATE FUNCTION public.f16_lab_read_known_reversal_ids(
 p_subscription_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE ids jsonb;
BEGIN
 IF p_subscription_id IS NULL OR
    p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RAISE EXCEPTION 'Invalid reversal subscription reference' USING ERRCODE='22023'; END IF;
 IF EXISTS (
  SELECT 1 FROM supporter_private.paypal_payment_reversals r
  WHERE NOT EXISTS (
   SELECT 1 FROM supporter_private.paypal_payment_entries e
   WHERE e.external_payment_id=r.external_payment_id)
 ) OR EXISTS(
  SELECT 1 FROM supporter_private.paypal_verified_event_inbox i
  WHERE i.event_type IN ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED')
    AND i.processing_state<>'processed'
 )
 THEN RETURN NULL; END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(e.external_payment_id
                     ORDER BY e.external_payment_id),'[]'::jsonb)
 INTO ids
 FROM supporter_private.paypal_payment_entries e
 JOIN supporter_private.paypal_payment_reversals r
   ON r.external_payment_id=e.external_payment_id
 WHERE e.external_subscription_id=p_subscription_id;
 RETURN ids;
END $body$;

ALTER FUNCTION public.f16_lab_read_bound_intent_by_subscription(text) OWNER TO postgres;
ALTER FUNCTION public.f16_lab_read_known_reversal_ids(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_lab_read_bound_intent_by_subscription(text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_lab_read_known_reversal_ids(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_read_bound_intent_by_subscription(text)
 TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_lab_read_known_reversal_ids(text)
 TO service_role;
COMMIT;
