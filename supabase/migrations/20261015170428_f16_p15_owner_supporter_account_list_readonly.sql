-- PAZO F16-P15 — service-only list of the signed-in owner's OWN
-- PayPal supporter intent references. No subscription ID, PII or paid period.
-- The calling Edge runtime MUST verify Supabase Auth getUser() first.
BEGIN;
CREATE FUNCTION public.f16_p15_list_owner_supporter_intents(p_owner_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $list$
 SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'intentId',s.intent_id,
  'state',s.state,
  'canDownloadAcceptance',(a.intent_id IS NOT NULL)
 ) ORDER BY s.created_at DESC),'[]'::jsonb)
 FROM (
  SELECT intent_id,owner_id,state,created_at
  FROM supporter_private.paypal_subscription_intents
  WHERE p_owner_id IS NOT NULL AND owner_id=p_owner_id
   AND provider='paypal' AND plan_id='P-14V25407JP6850922NLHMDKI'
   AND state IN ('bound','pending')
  ORDER BY created_at DESC LIMIT 5
 ) s
 LEFT JOIN supporter_private.paypal_p06_checkout_attempts a
 ON a.owner_id=s.owner_id AND a.intent_id=s.intent_id
$list$;
REVOKE ALL ON FUNCTION public.f16_p15_list_owner_supporter_intents(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p15_list_owner_supporter_intents(uuid)
 TO service_role;
COMMIT;