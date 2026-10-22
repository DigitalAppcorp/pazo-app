-- Remove only the service read bridge while Live remains OFF. No CASCADE or data deletion.
BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND NOT live_enabled
  AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'Reader rollback requires Live OFF' USING ERRCODE='42501'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_recorded_sale_read(uuid,text,text,bigint,text);
COMMIT;
