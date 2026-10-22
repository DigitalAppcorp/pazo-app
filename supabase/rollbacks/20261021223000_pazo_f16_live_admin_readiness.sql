BEGIN;
SET LOCAL lock_timeout='5s';
DROP FUNCTION public.pazo_admin_live_readiness();
COMMIT;
