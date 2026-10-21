BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
  WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'financial context rollback requires Live OFF'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_financial_context_read(bigint,text,uuid);
COMMIT;
