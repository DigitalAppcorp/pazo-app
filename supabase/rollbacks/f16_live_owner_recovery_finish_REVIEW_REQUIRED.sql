-- Remove only these two RPCs. Retains all original requests and audit metadata.
BEGIN;
SET LOCAL lock_timeout='5s';
DROP FUNCTION public.pazo_f16_live_service_recovery_finish(uuid,text,bigint,uuid,uuid,text,text);
DROP FUNCTION public.pazo_f16_live_service_terminal_checkout_close(uuid,text,bigint,text,text);
COMMIT;
