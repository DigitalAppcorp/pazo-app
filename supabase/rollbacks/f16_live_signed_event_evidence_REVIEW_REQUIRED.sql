-- Pre-credential rollback only. Never discard a real signature receipt.
BEGIN;
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts)
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled AND kill_switch AND active_generation IS NULL)
 THEN RAISE EXCEPTION 'signed evidence rollback requires empty receipts and Live OFF'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_signed_receipt_read(bigint,text,uuid);
DROP FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb);
DROP TABLE supporter_private.pazo_paypal_live_signed_receipts;
COMMIT;
