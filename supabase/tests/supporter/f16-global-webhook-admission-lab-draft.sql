-- PAZO F16 — DRAFT ONLY, PostgreSQL 17 disposable-lab global admissions.
-- NOT A DEPLOYABLE MIGRATION. Do not apply to the hosted PAZO database.
-- Auth: service_role-only public RPC; private table, fixed budgets, no IP/PII.
-- Protective only for downstream PayPal queries, not Edge HTTP invocation cost.
BEGIN;

CREATE TABLE supporter_private.f16_webhook_request_budget (
  bucket text PRIMARY KEY CHECK (bucket IN ('minute','day')),
  window_number bigint NOT NULL,
  admitted integer NOT NULL CHECK (admitted BETWEEN 0 AND 2000)
);
INSERT INTO supporter_private.f16_webhook_request_budget(bucket,window_number,admitted)
VALUES ('minute',0,0),('day',0,0);
ALTER TABLE supporter_private.f16_webhook_request_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_webhook_request_budget FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.f16_webhook_request_budget
FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.f16_paypal_try_admit_global() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $f16$
DECLARE
  v_minute bigint;
  v_day bigint;
  v_minute_bucket bigint;
  v_day_bucket bigint;
  v_minute_count integer;
  v_day_count integer;
BEGIN
  -- A contested lock denies immediately instead of waiting on expensive work.
  -- Fixed advisory identity is independent of webhook content and client headers.
  IF NOT pg_catalog.pg_try_advisory_xact_lock(16162026, 20261014) THEN
    RETURN false;
  END IF;
  v_minute:=pg_catalog.floor(pg_catalog.extract(epoch FROM pg_catalog.clock_timestamp())/60)::bigint;
  v_day:=pg_catalog.floor(pg_catalog.extract(epoch FROM pg_catalog.clock_timestamp())/86400)::bigint;
  SELECT window_number, admitted INTO v_minute_bucket, v_minute_count
    FROM supporter_private.f16_webhook_request_budget WHERE bucket='minute';
  SELECT window_number, admitted INTO v_day_bucket, v_day_count
    FROM supporter_private.f16_webhook_request_budget WHERE bucket='day';
  -- Absence/corruption of either row is a safety failure, never an allowance.
  IF v_minute_bucket IS NULL OR v_day_bucket IS NULL THEN
    RETURN false;
  END IF;
  IF v_minute_bucket<>v_minute THEN v_minute_count:=0; END IF;
  IF v_day_bucket<>v_day THEN v_day_count:=0; END IF;
  -- Provisional technical budgets; PO must approve before hosted release.
  IF v_minute_count>=30 OR v_day_count>=2000 THEN
    RETURN false;
  END IF;
  UPDATE supporter_private.f16_webhook_request_budget
  SET window_number=v_minute, admitted=v_minute_count+1 WHERE bucket='minute';
  UPDATE supporter_private.f16_webhook_request_budget
  SET window_number=v_day, admitted=v_day_count+1 WHERE bucket='day';
  RETURN true;
END;
$f16$;
ALTER FUNCTION public.f16_paypal_try_admit_global() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_try_admit_global()
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_try_admit_global() TO service_role;
COMMIT;
