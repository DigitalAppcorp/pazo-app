-- F16-P39 LAB ONLY. Review-only activation linkage during signed webhook intake.
-- The DB cannot verify the external PayPal signature; caller is a trusted server.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
 OR current_user<>'postgres'
 OR to_regclass('supporter_private.p38_lab_verified_activation_binding') IS NULL
 THEN RAISE EXCEPTION 'F16 P39 disposable P38 prerequisite required'; END IF;
END $guard$;
CREATE FUNCTION public.f16_p39_lab_register_signed_activation(
 p_event_id text,p_subscription_id text,p_server_origin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $body$
DECLARE v_owner uuid; v_count bigint; v_inserted boolean; v_existing boolean;
BEGIN
 IF p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
 OR p_subscription_id IS NULL OR p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 OR p_server_origin IS DISTINCT FROM 'postback_verified_sandbox_activation'
 THEN RETURN false; END IF;
 -- The inbox row must already have been persisted after PayPal signature
 -- verification by the trusted receiver. This RPC itself does not verify RSA.
 IF NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_event_inbox e
 WHERE e.provider_event_id=p_event_id AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
 AND e.verified_at IS NOT NULL AND e.retention_hold=true)
 THEN RETURN false; END IF;
 SELECT pg_catalog.count(*),(pg_catalog.array_agg(i.owner_id))[1]
 INTO v_count,v_owner FROM supporter_private.paypal_subscription_intents i
 WHERE i.external_subscription_id=p_subscription_id
 AND i.provider='paypal' AND i.state='bound'
 AND i.plan_id='P-14V25407JP6850922NLHMDKI';
 IF v_count<>1 THEN RETURN false; END IF;
 INSERT INTO supporter_private.p38_lab_verified_activation_binding
 (provider_event_id,subscription_id,owner_id,provider_provenance)
 VALUES(p_event_id,p_subscription_id,v_owner,'verified_provider_ingestion')
 ON CONFLICT(provider_event_id) DO NOTHING
 RETURNING true INTO v_inserted;
 IF v_inserted IS TRUE THEN RETURN true; END IF;
 -- Duplicate is idempotent ONLY if it retains its original exact identity.
 SELECT EXISTS(SELECT 1 FROM supporter_private.p38_lab_verified_activation_binding b
 WHERE b.provider_event_id=p_event_id AND b.subscription_id=p_subscription_id
 AND b.owner_id=v_owner AND b.provider_provenance='verified_provider_ingestion')
 INTO v_existing;
 RETURN COALESCE(v_existing,false);
END $body$;
REVOKE ALL ON FUNCTION public.f16_p39_lab_register_signed_activation(text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p39_lab_register_signed_activation(text,text,text)
 TO service_role;
COMMIT;
