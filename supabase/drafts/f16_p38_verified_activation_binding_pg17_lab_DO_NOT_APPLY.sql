-- F16-P38 ONLY in disposable PG17; never install on hosted Supabase.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$ BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin' OR current_user<>'postgres'
 OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
 THEN RAISE EXCEPTION 'P38 LAB ONLY'; END IF;
END $guard$;
-- A durable subscription binding must come from independently verified ingestion,
-- NOT from the requester's subscriptionId.
CREATE TABLE supporter_private.p38_lab_verified_activation_binding(
 provider_event_id text PRIMARY KEY REFERENCES supporter_private.paypal_verified_event_inbox(provider_event_id),
 subscription_id text NOT NULL CHECK(subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 owner_id uuid NOT NULL,
 provider_provenance text NOT NULL CHECK(provider_provenance='verified_provider_ingestion'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE supporter_private.p38_lab_verified_activation_binding ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.p38_lab_verified_activation_binding FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.p38_lab_verified_activation_binding FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.f16_p38_lab_read_activation_binding(p_event_id text,p_claim_token uuid,p_subscription_id text,p_owner_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE ok boolean;
BEGIN
 IF p_event_id IS NULL OR p_claim_token IS NULL OR p_subscription_id IS NULL OR p_owner_id IS NULL THEN RETURN false; END IF;
 SELECT EXISTS(
 SELECT 1 FROM supporter_private.paypal_verified_event_inbox e
 JOIN supporter_private.p05_inbox_worker_gate g ON g.id=1
 JOIN supporter_private.p38_lab_verified_activation_binding b ON b.provider_event_id=e.provider_event_id
 JOIN supporter_private.paypal_subscription_intents i ON i.external_subscription_id=b.subscription_id
 WHERE g.enabled=true AND g.not_before IS NOT NULL AND e.verified_at>=g.not_before
 AND e.provider_event_id=p_event_id AND e.event_type='BILLING.SUBSCRIPTION.ACTIVATED'
 AND e.processing_state='processing' AND e.p05_claim_token=p_claim_token
 AND e.next_attempt_at>clock_timestamp() AND e.retention_hold=true
 AND b.provider_provenance='verified_provider_ingestion'
 AND b.subscription_id=p_subscription_id AND b.owner_id=p_owner_id
 AND i.owner_id=p_owner_id AND i.state='bound' AND i.provider='paypal'
 ) INTO ok;
 RETURN ok;
END $fn$;
REVOKE ALL ON FUNCTION public.f16_p38_lab_read_activation_binding(text,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p38_lab_read_activation_binding(text,uuid,text,uuid) TO service_role;
COMMIT;
