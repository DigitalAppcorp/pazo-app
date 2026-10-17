-- PAZO F16 MVP — PRIVATE PAID-PERIOD SOURCE, DISPOSABLE REHEARSAL ONLY.
-- NOT A MIGRATION. NOT AUTHORIZED FOR HOSTED. DO NOT APPLY to PAZO project.
-- Reject any database other than the disposable PG17 test environment.
BEGIN;
DO $guard$
BEGIN
  IF current_database() <> 'f14_synthetic' OR current_user <> 'postgres'
     OR to_regclass('supporter_private.wall_consents') IS NULL
  THEN RAISE EXCEPTION 'F16 MVP DRAFT DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;

CREATE TABLE supporter_private.f16_mvp_paid_period_proofs (
  provider_sale_id text PRIMARY KEY
    CHECK (provider_sale_id ~ '^[A-Za-z0-9._-]{6,128}$'),
  provider_subscription_id text NOT NULL
    CHECK (provider_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
  owner_id uuid NOT NULL,
  cycle_key text NOT NULL
    CHECK (cycle_key ~ '^[A-Za-z0-9_-]{6,100}$'),
  merchant_environment text NOT NULL DEFAULT 'live'
    CHECK (merchant_environment = 'live'),
  provider_event_id text NOT NULL UNIQUE
    CHECK (provider_event_id ~ '^[A-Za-z0-9._-]{6,128}$'),
  offer_terms_sha256 text NOT NULL
    CHECK (offer_terms_sha256 ~ '^[a-f0-9]{64}$'),
  price_minor integer NOT NULL DEFAULT 299 CHECK (price_minor = 299),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  service_start timestamptz NOT NULL,
  service_end timestamptz NOT NULL,
  merchant_verified_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT f16_mvp_service_month CHECK (
    service_end > service_start AND
    service_end <= service_start + interval '32 days'
  ),
  CONSTRAINT f16_mvp_unique_owner_cycle UNIQUE (owner_id,cycle_key)
);
CREATE INDEX f16_mvp_owner_period_lookup
ON supporter_private.f16_mvp_paid_period_proofs (owner_id,service_start,service_end);
ALTER TABLE supporter_private.f16_mvp_paid_period_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_mvp_paid_period_proofs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.f16_mvp_paid_period_proofs
 FROM PUBLIC,anon,authenticated,service_role;

-- A refund, reversal or dispute puts precisely the affected sale under hold.
-- No customer/payment details are exposed publicly. Do NOT auto-clear holds
-- without independent merchant evidence of resolution.
CREATE TABLE supporter_private.f16_mvp_paid_period_holds (
  provider_sale_id text NOT NULL REFERENCES
    supporter_private.f16_mvp_paid_period_proofs(provider_sale_id),
  hold_id text NOT NULL CHECK (hold_id ~ '^[A-Za-z0-9._-]{6,128}$'),
  hold_kind text NOT NULL CHECK (
    hold_kind IN ('partially_refunded','refunded','reversed','dispute')
  ),
  hold_active boolean NOT NULL DEFAULT true,
  verified_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  PRIMARY KEY (provider_sale_id,hold_id)
);
ALTER TABLE supporter_private.f16_mvp_paid_period_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_mvp_paid_period_holds FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.f16_mvp_paid_period_holds
 FROM PUBLIC,anon,authenticated,service_role;

-- This function is restricted to private DBA/operator at this stage.
-- The caller timestamp is ONLY for synthetic scenario checks; a deployed
-- read RPC must use pg_catalog.clock_timestamp(), never browser time.
-- Only independently verified merchant COMPLETE regular payments may INSERT
-- a proof. This function does NOT ingest/verify PayPal data on its own.
CREATE FUNCTION supporter_private.f16_mvp_private_period_projection(
  p_owner uuid,p_as_of timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $f$
WITH clear_periods AS (
  SELECT c.*
  FROM supporter_private.f16_mvp_paid_period_proofs AS c
  WHERE c.owner_id=p_owner AND c.service_start <= p_as_of
    AND NOT EXISTS (
      SELECT 1 FROM supporter_private.f16_mvp_paid_period_holds AS h
      WHERE h.provider_sale_id = c.provider_sale_id AND h.hold_active
    )
), overlapping AS (
  SELECT q.service_start,q.service_end,
    lag(q.service_end) OVER (ORDER BY q.service_start,q.service_end) AS prior_end
  FROM clear_periods AS q
), prepared AS (
  SELECT NOT EXISTS (
    SELECT 1 FROM overlapping WHERE prior_end > service_start
  ) AS no_overlap
), eligible AS (
  SELECT
    count(*)::integer AS settled_months,
    max(c.service_end) FILTER (WHERE p_as_of < c.service_end) AS paid_through,
    count(*) FILTER (WHERE p_as_of < c.service_end) > 0 AS active
  FROM clear_periods c
)
SELECT pg_catalog.jsonb_build_object(
  'active',(SELECT no_overlap FROM prepared) AND eligible.active,
  'paidThrough',CASE WHEN (SELECT no_overlap FROM prepared)
    THEN eligible.paid_through ELSE NULL END,
  'completedCycles',CASE WHEN (SELECT no_overlap FROM prepared)
    THEN eligible.settled_months ELSE 0 END
)
FROM eligible;
$f$;
ALTER FUNCTION supporter_private.f16_mvp_private_period_projection(uuid,timestamptz)
 OWNER TO postgres;
REVOKE ALL ON FUNCTION
 supporter_private.f16_mvp_private_period_projection(uuid,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
