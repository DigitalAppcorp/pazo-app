-- PAZO v3 technical certificate: audited nonfinancial single-row CAS refresh.
-- Evidence JSON: docs/evidence/PAZO_F16_TECHNICAL_RELEASE_ATTESTATION_V3_20261022.json
-- Chromium production run 39733214540: 29/29 browser checks, 7/7 jobs PASS.
-- This does NOT authorize PayPal Live, payments or public supporter entitlements.
BEGIN;
DO $attest$
DECLARE changed integer;
BEGIN
 IF (SELECT mode::text FROM admin_private.pazo_live_release_control LIMIT 1) IS DISTINCT FROM 'off'
  OR (SELECT live_enabled FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton) IS DISTINCT FROM false
  OR (SELECT kill_switch FROM admin_private.pazo_paypal_new_checkout_switch WHERE singleton) IS DISTINCT FROM true
  OR (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods)<>0
  OR (SELECT count(*) FROM admin_private.pazo_paypal_merchant_generations)<>0
 THEN RAISE EXCEPTION 'BETA_V3_FINANCIAL_GUARDS_NOT_OFF'; END IF;
 UPDATE admin_private.pazo_live_release_artifact
 SET frontend_commit='b5547243bfaeb6c17b8bd3929f05468273b9576b',
  evidence_sha256='03aeb1b37a465a52f0de6bf1963b46d258c5a9ef1848bb46775809bc30fabf9a',
  verified_at=pg_catalog.statement_timestamp()
 WHERE singleton
  AND frontend_commit='5283bbc9460c2a991f258983b0051395f1911cea'
  AND evidence_sha256='d472e6fc2fe1761b9a57bee7bfda90caf91758393afdda7d606a0d94a118244b'
  AND checkout_build='pazo_live_checkout_controlled_v1'
  AND webhook_build='pazo_live_webhook_controlled_v1'
  AND control_build='pazo_live_control_v1'
  AND worker_build='pazo_live_worker_v2'
  AND return_origin='https://pazo-app-t83r.vercel.app';
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>1 THEN RAISE EXCEPTION 'BETA_V3_ARTIFACT_CAS_MISMATCH_%',changed; END IF;
END $attest$;
COMMIT;
