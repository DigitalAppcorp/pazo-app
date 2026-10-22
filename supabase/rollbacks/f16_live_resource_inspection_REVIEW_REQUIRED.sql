-- Disable the inspection Edge before using this rollback. Preserve existing audit.
BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND NOT live_enabled
   AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'inspection rollback blocked' USING ERRCODE='42501'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_bootstrap_record_resources(uuid,bigint,text,text);
DROP FUNCTION public.pazo_f16_live_service_bootstrap_read(uuid,text);
COMMIT;
