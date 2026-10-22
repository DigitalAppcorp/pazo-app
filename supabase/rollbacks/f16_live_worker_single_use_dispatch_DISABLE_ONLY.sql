-- Operational rollback: stop dispatch and invalidate queued capabilities.
-- Keep the single-use verifier. NEVER restore the reusable Vault bearer.
BEGIN;
UPDATE supporter_private.pazo_paypal_live_worker_control
 SET enabled=false,processing_enabled=false,dispatch_sha256=NULL,dispatch_expires_at=NULL
 WHERE singleton;
COMMIT;
