-- PREPARED ONLY. Requires a separate hosted authorization. Prefer fresh-MFA
-- Admin -> Gradual Live -> Pause, with server revision/nonce audit.
-- Emergency SQL fallback: preserve all financial functions/data and queue.
-- It deliberately does not drop the migration, change merchant/generation,
-- disable the original worker/webhook or cancel/refund any subscription.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF to_regclass('supporter_private.gradual_campaign') IS NULL THEN
  RAISE EXCEPTION 'Gradual migration is not installed';
 END IF;
END $$;
UPDATE supporter_private.gradual_campaign SET lifecycle='paused_admin',revision=revision+1 WHERE singleton AND lifecycle='active';
-- Operational execution must record operator, ticket and SQL receipt in the
-- deployment evidence. Do not resume until current artifact/health is reviewed.
COMMIT;
