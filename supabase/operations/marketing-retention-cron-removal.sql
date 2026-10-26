-- Separate operator GO only. Never part of migration/db push.
-- This refuses to stop lawful expiry while any marketing data or collection
-- remains. Do not erase data to pass the guard without the approved policy.
BEGIN;
SET LOCAL lock_timeout='5s';
SELECT marketing_private.remove_retention_schedule();
COMMIT;
