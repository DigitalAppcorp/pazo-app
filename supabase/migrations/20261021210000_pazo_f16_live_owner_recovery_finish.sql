-- Owner recovery metadata only. Does not release Live or grant paid coverage.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE FUNCTION public.pazo_f16_live_service_recovery_finish(
 p_owner uuid,p_intent text,p_generation bigint,p_lease uuid,
 p_request_key uuid,p_plan text,p_subscription text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE; result text;
BEGIN
 IF COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role'
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR p_generation IS NULL OR p_lease IS NULL OR
  p_request_key IS NULL OR p_plan IS NULL OR p_subscription IS NULL THEN RETURN false; END IF;
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE owner_id=p_owner AND intent_id=p_intent AND merchant_generation=p_generation
  AND request_key=p_request_key AND plan_id=p_plan AND source_environment='live'
  AND closed_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 -- A signed webhook may have bound the SAME subscription while recovery ran.
 IF i.state='bound' THEN RETURN i.provider_subscription_id=p_subscription; END IF;
 IF i.state<>'pending' OR i.recovery_lease IS DISTINCT FROM p_lease OR
  i.recovery_expires_at IS NULL OR i.recovery_expires_at<=pg_catalog.clock_timestamp() OR
  i.provider_create_claimed_at IS NULL OR i.provider_request_origin IS NULL OR
  i.provider_request_version IS DISTINCT FROM 'pazo_subscription_create_v1'
 THEN RETURN false; END IF;
 -- Edge has independently GET-verified the subscription using original Vault.
 result:=supporter_private.pazo_live_bind_verified_subscription(
  p_owner,p_intent,p_request_key,p_generation,p_plan,p_subscription);
 RETURN result IN ('bound','already_bound');
END $f$;

CREATE FUNCTION public.pazo_f16_live_service_terminal_checkout_close(
 p_owner uuid,p_intent text,p_generation bigint,p_subscription text,p_status text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $f$
DECLARE i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
BEGIN
 IF COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role'
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF p_owner IS NULL OR p_intent IS NULL OR p_generation IS NULL OR p_subscription IS NULL OR
  p_status IS NULL OR p_status NOT IN ('CANCELLED','EXPIRED') THEN RETURN false; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,1602));
 SELECT * INTO i FROM supporter_private.pazo_paypal_live_checkout_intents
 WHERE owner_id=p_owner AND intent_id=p_intent AND merchant_generation=p_generation
  AND provider_subscription_id=p_subscription AND source_environment='live' FOR UPDATE;
 IF NOT FOUND OR i.state<>'bound' THEN RETURN false; END IF;
 IF i.closed_at IS NOT NULL THEN RETURN i.closed_reason='provider_terminal_reconciled'; END IF;
 -- No retry while any known event or cancellation is unresolved, or while
 -- a paid period remains unexpired, INCLUDING periods with holds.
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox
   WHERE linked_intent_id=p_intent AND processing_state<>'processed') OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods
   WHERE intent_id=p_intent AND service_end>pg_catalog.clock_timestamp()) OR
  EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims
   WHERE intent_id=p_intent AND state<>'confirmed') THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_checkout_intents
 SET closed_at=pg_catalog.clock_timestamp(),closed_reason='provider_terminal_reconciled',
  recovery_lease=NULL,recovery_expires_at=NULL,
  provider_status=p_status,provider_observed_at=pg_catalog.clock_timestamp()
 WHERE intent_id=p_intent;
 RETURN true;
END $f$;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_terminal_checkout_close(uuid,text,bigint,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_terminal_checkout_close(uuid,text,bigint,text,text) TO service_role;
COMMIT;
