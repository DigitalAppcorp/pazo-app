BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton AND NOT enabled AND NOT processing_enabled)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control WHERE completed_runs<>0 OR drain_token IS NOT NULL)
  OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox)
 THEN RAISE EXCEPTION 'worker rollback requires unused disabled worker and empty inbox'; END IF;
END $guard$;
DROP FUNCTION public.pazo_f16_live_service_worker_admit(text);
DROP FUNCTION public.pazo_f16_live_service_worker_claim(bigint,text);
DROP FUNCTION public.pazo_f16_live_service_worker_event_finish(bigint,text,uuid,text);
DROP FUNCTION public.pazo_f16_live_service_worker_complete(uuid,text,text,text);
DROP FUNCTION public.pazo_f16_live_service_worker_health_read();
-- Delete only this release's unused technical invoker, never a merchant key.
DELETE FROM vault.secrets WHERE id=(SELECT invoker_vault_id FROM supporter_private.pazo_paypal_live_worker_control WHERE singleton);
DROP TABLE supporter_private.pazo_paypal_live_worker_control;
DROP INDEX supporter_private.pazo_live_worker_due;
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox DROP COLUMN retry_after,DROP COLUMN last_diagnostic_code;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_inbox_claim(bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text) TO service_role;
COMMIT;
