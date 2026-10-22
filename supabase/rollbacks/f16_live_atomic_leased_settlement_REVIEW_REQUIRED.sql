-- Reverse only an unused technical release. Never discard a real commit.
BEGIN;
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox WHERE completed_lease_token IS NOT NULL)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods)
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'atomic settlement rollback requires unused Live OFF database'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_leased_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz,uuid);
DROP FUNCTION public.pazo_f16_live_service_leased_refund_record(uuid,text,text,bigint,text,text,text,text,uuid);
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox DROP COLUMN completed_lease_token;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_sale_record(uuid,text,text,bigint,text,text,text,integer,text,timestamptz,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_verified_refund_record(uuid,text,text,bigint,text,text,text,text) TO service_role;
COMMIT;
