BEGIN;
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents
  WHERE provider_status IS NOT NULL OR last_payment_failure_at IS NOT NULL)
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'lifecycle rollback requires unused Live OFF release'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_refund_sale_binding_read(bigint,text);
DROP FUNCTION public.pazo_f16_live_service_leased_lifecycle_record(bigint,text,uuid,text,timestamptz);
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents DROP COLUMN provider_status,
 DROP COLUMN provider_status_at,DROP COLUMN provider_observed_at,DROP COLUMN last_payment_failure_at;
COMMIT;
