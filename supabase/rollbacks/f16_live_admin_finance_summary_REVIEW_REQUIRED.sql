-- Read-only RPC rollback; no financial rows or audit are modified.
BEGIN;
DROP FUNCTION public.pazo_admin_live_finance_summary();
COMMIT;
