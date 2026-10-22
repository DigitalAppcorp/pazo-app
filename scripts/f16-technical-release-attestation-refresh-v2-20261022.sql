-- PAZO technical release certificate v2: single-shot refresh of the existing
-- singleton, preserving the original evidence in GitHub docs/evidence.
-- NONFINANCIAL: no merchant, checkout, subscription, entitlement or payment writes.
-- The evidence JSON for the NEW deployed SHA is independently SHA256 verified
-- in the hosted Postgres digest extension before this operator script is run.
-- Old original: frontend f7cc359a15e874942f68fc15f55c43e851f7724d,
-- old evidence ad9a35ae6b268c5eb9fbe5f26aeeaadb65de8f769eb693c5363cf2a22dd37c29.
-- New: frontend 5283bbc9460c2a991f258983b0051395f1911cea,
-- evidence d472e6fc2fe1761b9a57bee7bfda90caf91758393afdda7d606a0d94a118244b.
BEGIN;
DO $pazo_v2$
DECLARE changed integer;
BEGIN
 IF (SELECT mode::text FROM admin_private.pazo_live_release_control LIMIT 1) IS DISTINCT FROM 'off'
   OR (SELECT live_enabled FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton) IS DISTINCT FROM false
   OR (SELECT kill_switch FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton) IS DISTINCT FROM true
   OR (SELECT COUNT(*) FROM supporter_private.pazo_paypal_live_paid_periods)<>0
   OR (SELECT COUNT(*) FROM admin_private.pazo_paypal_merchant_generations)<>0
 THEN RAISE EXCEPTION 'PAZO_ATTESTATION_V2_FINANCIAL_GATE_BLOCKED'; END IF;

 UPDATE admin_private.pazo_live_release_artifact SET
   frontend_commit='5283bbc9460c2a991f258983b0051395f1911cea',
   evidence_sha256='d472e6fc2fe1761b9a57bee7bfda90caf91758393afdda7d606a0d94a118244b',
   verified_at=pg_catalog.statement_timestamp()
 WHERE singleton
   AND frontend_commit='f7cc359a15e874942f68fc15f55c43e851f7724d'
   AND evidence_sha256='ad9a35ae6b268c5eb9fbe5f26aeeaadb65de8f769eb693c5363cf2a22dd37c29'
   AND checkout_build='pazo_live_checkout_controlled_v1'
   AND webhook_build='pazo_live_webhook_controlled_v1'
   AND control_build='pazo_live_control_v1'
   AND worker_build='pazo_live_worker_v2'
   AND return_origin='https://pazo-app-t83r.vercel.app';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'PAZO_ATTESTATION_V2_CAS_EXPECTED_ONE_GOT_%',changed; END IF;
END $pazo_v2$;
COMMIT;
