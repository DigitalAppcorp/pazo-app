-- Metadata-only rollback; NEVER remove an accepted contract.
BEGIN;
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents)
 THEN RAISE EXCEPTION 'accepted Live offer must remain available'; END IF;
END $guard$;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents DROP CONSTRAINT pazo_live_intent_exact_offer_fk;
DROP TRIGGER pazo_live_original_consent_immutable ON supporter_private.pazo_paypal_live_checkout_intents;
DROP FUNCTION supporter_private.pazo_live_intent_original_consent_immutable();
DROP FUNCTION public.pazo_f16_live_service_acceptance_read(uuid,text);
DROP TABLE supporter_private.pazo_live_offer_versions;
DROP FUNCTION supporter_private.pazo_live_offer_immutable();
COMMIT;
