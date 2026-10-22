-- Operator-only PAZO F16 technical release certificate for the publicly deployed SHA.
-- Evidence: docs/evidence/PAZO_F16_TECHNICAL_CERTIFICATE_BASIS_20261022.md
-- NEVER use in application code, migrations, CI, Edge, or an authenticated user session.
-- This operation is technical attestation only: no Live activation, secret storage,
-- canary, client creation, financial evidence, payment, or grant is performed.
BEGIN;
DO $pazo_technical_certificate$
BEGIN
 IF EXISTS(SELECT 1 FROM admin_private.pazo_live_release_artifact)
 THEN RAISE EXCEPTION 'technical certificate already exists; manual reconciliation required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM admin_private.pazo_live_release_control
   WHERE singleton AND mode='off' AND revision=0 AND merchant_generation IS NULL)
 OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND live_enabled=false AND kill_switch=true
     AND active_generation IS NULL AND revision=0)
 THEN RAISE EXCEPTION 'financial mode is not fail-closed'; END IF;
 IF EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations)
 OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents)
 OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods)
 OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox)
 OR EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts)
 THEN RAISE EXCEPTION 'live financial state requires independent review'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_paypal_live_worker_control
   WHERE singleton AND enabled AND expected_build='pazo_live_worker_v2'
   AND last_heartbeat_at >= pg_catalog.statement_timestamp()-interval '5 minutes')
 THEN RAISE EXCEPTION 'private worker heartbeat not fresh'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.pazo_live_offer_versions
   WHERE terms_version='pazo-supporter-live.beta20261021-v1' AND locale='es')
 OR NOT EXISTS(SELECT 1 FROM supporter_private.pazo_live_offer_versions
   WHERE terms_version='pazo-supporter-live.beta20261021-v1' AND locale='en')
 THEN RAISE EXCEPTION 'approved offer copy not installed'; END IF;
 INSERT INTO admin_private.pazo_live_release_artifact (
   singleton,frontend_commit,checkout_build,webhook_build,control_build,worker_build,
   return_origin,evidence_sha256,verified_at)
 VALUES (true,'f7cc359a15e874942f68fc15f55c43e851f7724d',
   'pazo_live_checkout_controlled_v1','pazo_live_webhook_controlled_v1',
   'pazo_live_control_v1','pazo_live_worker_v2','https://pazo-app-t83r.vercel.app',
   'ad9a35ae6b268c5eb9fbe5f26aeeaadb65de8f769eb693c5363cf2a22dd37c29',
   pg_catalog.statement_timestamp());
END $pazo_technical_certificate$;
COMMIT;
-- Postflight: query certificate status, mode OFF, kill ON, merchant and period counts.
