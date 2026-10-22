-- Read-only aggregates of PAZO's verified Live ledger. Not PayPal balances.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE FUNCTION public.pazo_admin_live_finance_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE totals jsonb; subscriptions jsonb; at timestamptz:=pg_catalog.statement_timestamp();
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin()
 THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object(
  'verifiedPayments',count(*),
  'grossVerifiedMinor',COALESCE(sum(p.amount_minor),0),
  'heldPayments',count(*) FILTER(WHERE EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
    WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),
  'heldGrossMinor',COALESCE(sum(p.amount_minor) FILTER(WHERE EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
    WHERE h.sale_id=p.sale_id AND h.released_at IS NULL)),0))
 INTO totals FROM supporter_private.pazo_paypal_live_paid_periods p;
 SELECT pg_catalog.jsonb_build_object(
  'openRequests',count(*) FILTER(WHERE i.closed_at IS NULL),
  'unboundRequests',count(*) FILTER(WHERE i.closed_at IS NULL AND i.state='pending'),
  'closedUnsentRequests',count(*) FILTER(WHERE i.closed_reason='unclaimed_abandoned'),
  'confirmedCancellations',count(*) FILTER(WHERE EXISTS(
   SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims c
    WHERE c.intent_id=i.intent_id AND c.state='confirmed'
     AND c.provider_confirmed_at IS NOT NULL)))
 INTO subscriptions FROM supporter_private.pazo_paypal_live_checkout_intents i;
 RETURN pg_catalog.jsonb_build_object('source','pazo_verified_live_ledger',
  'environment','live','currency','USD','asOf',at,
  'providerStatement',false,'paidThrough',NULL,
  'payments',totals,'subscriptions',subscriptions,
  'activePaidAccounts',(SELECT count(*) FROM (
   SELECT DISTINCT owner_id FROM supporter_private.pazo_paypal_live_checkout_intents
  ) owners WHERE supporter_private.pazo_live_project_paid_periods(owners.owner_id,at)->>'active'='true'));
END $f$;
REVOKE ALL ON FUNCTION public.pazo_admin_live_finance_summary() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_live_finance_summary() TO authenticated;
COMMIT;
