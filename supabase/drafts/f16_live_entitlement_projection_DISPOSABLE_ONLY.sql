-- PAZO F16 — LIVE paid-period entitlement projection (READ-ONLY).
-- Only for a disposable PostgreSQL 17 lab; never apply to hosted PAZO.
-- Caller time is synthetic-only. A hosted owner RPC must use server clock,
-- check authenticated owner, and reconcile with historical Sandbox source.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
   OR to_regclass('supporter_private.pazo_paypal_live_paid_periods') IS NULL
 THEN RAISE EXCEPTION 'F16 LIVE PROJECTION DISPOSABLE ONLY'
   USING ERRCODE='42501'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION supporter_private.pazo_live_project_paid_periods(
 p_owner uuid,p_as_of timestamptz
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $f$
WITH eligible AS (
 SELECT p.service_start,p.service_end
 FROM supporter_private.pazo_paypal_live_paid_periods p
 JOIN supporter_private.pazo_paypal_live_checkout_intents i
  ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
 WHERE i.owner_id=p_owner AND p.service_start<=p_as_of
 AND NOT EXISTS (
  SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds h
  WHERE h.sale_id=p.sale_id AND h.released_at IS NULL
 )
), ordered AS (
 SELECT service_start,service_end,
  lag(service_end) OVER(ORDER BY service_start,service_end) AS prior_end
 FROM eligible
), safety AS (
 SELECT COALESCE(bool_and(prior_end IS NULL OR prior_end<=service_start),true)
  AS nonoverlapping FROM ordered
), aggregated AS (
 SELECT count(*) FILTER(WHERE service_end<=p_as_of)::integer AS completed,
  max(service_end) FILTER(
   WHERE service_start<=p_as_of AND service_end>p_as_of
  ) AS paid_through
 FROM eligible
)
SELECT pg_catalog.jsonb_build_object(
 'active',s.nonoverlapping AND a.paid_through IS NOT NULL,
 'paidThrough',CASE WHEN s.nonoverlapping THEN a.paid_through ELSE NULL END,
 'completedCycles',CASE WHEN s.nonoverlapping THEN a.completed ELSE 0 END,
 'medalMonths',CASE
  WHEN NOT s.nonoverlapping THEN 0
  WHEN a.completed>=12 THEN 12
  WHEN a.completed>=6 THEN 6
  WHEN a.completed>=3 THEN 3
  ELSE 0 END,
 'sourceEnvironment','live'
)
FROM aggregated a CROSS JOIN safety s;
$f$;
ALTER FUNCTION supporter_private.pazo_live_project_paid_periods(uuid,timestamptz)
 OWNER TO postgres;
REVOKE ALL ON FUNCTION
 supporter_private.pazo_live_project_paid_periods(uuid,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
