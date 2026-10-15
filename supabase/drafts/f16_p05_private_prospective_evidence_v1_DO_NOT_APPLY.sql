-- PAZO F16-P05 | v1 DRAFT ONLY | DO NOT APPLY TO HOSTED OR LIVE.
-- Deliberately NOT under supabase/migrations/: no authorization to deploy.
-- The database guard allows tests only in the disposable GitHub CI database.
-- In a future separate PO-authorized gate, generate the actual migration using
-- `supabase migration new ...`, reconcile live constraints and remove this guard.
--
-- No storage of PayPal payer identity, card data, raw payload or OAuth secrets.
-- No entitlement, approval, billing-period proof, ledger inserts, worker or RPC.
\set ON_ERROR_STOP on
BEGIN;

DO $p05_disposable_only$
BEGIN
  IF current_database() <> 'f14_synthetic'
     OR session_user <> 'f14_admin'
     OR current_user <> 'postgres'
  THEN
    RAISE EXCEPTION 'F16 P05 DRAFT ONLY: disposable f14_synthetic DB as postgres role required'
      USING ERRCODE = '42501';
  END IF;
  IF to_regclass('supporter_private.paypal_subscription_intents') IS NULL
     OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
     OR to_regclass('supporter_private.paypal_payment_entries') IS NULL
  THEN
    RAISE EXCEPTION 'F16 P05 synthetic parent constraints missing';
  END IF;
END;
$p05_disposable_only$;

-- One pre-PayPal purchase acknowledgement per pending private intent.
-- The backend MUST verify Auth ownership against intent.owner_id before insert.
-- Do not FK to auth.users with CASCADE: consent evidence may need to outlive
-- account deletion under California renewal law. Parent-intent deletion must
-- be explicitly reconciled with financial/legal retention instead.
CREATE TABLE supporter_private.paypal_terms_acceptances (
  intent_id text PRIMARY KEY
    REFERENCES supporter_private.paypal_subscription_intents (intent_id)
    ON DELETE RESTRICT,
  terms_version text NOT NULL
    CHECK (terms_version ~ '^[A-Za-z0-9._-]{3,64}$'),
  terms_sha256 text NOT NULL
    CHECK (terms_sha256 ~ '^[a-f0-9]{64}$'),
  cancellation_notice_version text NOT NULL
    CHECK (cancellation_notice_version ~ '^[A-Za-z0-9._-]{3,64}$'),
  privacy_notice_version text NOT NULL
    CHECK (privacy_notice_version ~ '^[A-Za-z0-9._-]{3,64}$'),
  displayed_language text NOT NULL
    CHECK (displayed_language IN ('es','en')),
  channel text NOT NULL DEFAULT 'pazo_web'
    CHECK (channel = 'pazo_web'),
  presented_at timestamptz NOT NULL,
  accepted_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT p05_acceptance_presented_first
    CHECK (presented_at <= accepted_at),
  CONSTRAINT p05_acceptance_recorded_after_acceptance
    CHECK (accepted_at <= recorded_at)
);

-- Only the initial activation/merchant schedule snapshot. This table is NOT
-- a promise made by PayPal that the invoice has been paid through next_billing.
-- A separate prospectively accepted PAZO contract defines the first end.
CREATE TABLE supporter_private.paypal_activation_schedule_evidence (
  external_subscription_id text PRIMARY KEY
    REFERENCES supporter_private.paypal_subscription_intents
      (external_subscription_id) ON DELETE RESTRICT,
  activation_event_id text NOT NULL UNIQUE
    REFERENCES supporter_private.paypal_verified_event_inbox
      (provider_event_id) ON DELETE RESTRICT,
  activated_at timestamptz NOT NULL,
  merchant_observed_at timestamptz NOT NULL,
  observed_next_billing_at timestamptz NOT NULL,
  evidence_version smallint NOT NULL DEFAULT 1
    CHECK (evidence_version = 1),
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT p05_activation_snapshot_chronology
    CHECK (activated_at <= merchant_observed_at
       AND merchant_observed_at < observed_next_billing_at),
  CONSTRAINT p05_activation_recorded_after_observation
    CHECK (merchant_observed_at <= recorded_at)
);

-- One FIRST-cycle candidate per subscription and per sale. NOT a settled
-- period/entitlement. References an existing UNcredited payment entry.
-- No PAZO benefits, paidThrough, isPaid, approval status or accounting write.
CREATE TABLE supporter_private.paypal_first_period_reviews (
  external_subscription_id text PRIMARY KEY
    REFERENCES supporter_private.paypal_activation_schedule_evidence
      (external_subscription_id) ON DELETE RESTRICT,
  external_payment_id text NOT NULL UNIQUE
    REFERENCES supporter_private.paypal_payment_entries
      (external_payment_id) ON DELETE RESTRICT,
  sale_event_id text NOT NULL UNIQUE
    REFERENCES supporter_private.paypal_verified_event_inbox
      (provider_event_id) ON DELETE RESTRICT,
  candidate_start_at timestamptz NOT NULL,
  candidate_end_exclusive_at timestamptz NOT NULL,
  review_state text NOT NULL DEFAULT 'requires_review'
    CHECK (review_state IN ('pending','requires_review','rejected')),
  reason_code text NOT NULL DEFAULT 'source_pending'
    CHECK (reason_code ~ '^[a-z_]{3,48}$'),
  evidence_version smallint NOT NULL DEFAULT 1
    CHECK (evidence_version = 1),
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT p05_candidate_interval_positive
    CHECK (candidate_start_at < candidate_end_exclusive_at)
);

-- Defense in depth: private schema, no direct Data API privileges, no
-- RLS policies and no endpoint that inserts/approves/credits these rows.
ALTER TABLE supporter_private.paypal_terms_acceptances
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_terms_acceptances
  FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_activation_schedule_evidence
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_activation_schedule_evidence
  FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_first_period_reviews
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_first_period_reviews
  FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  supporter_private.paypal_terms_acceptances,
  supporter_private.paypal_activation_schedule_evidence,
  supporter_private.paypal_first_period_reviews
FROM PUBLIC, anon, authenticated, service_role;

-- No grants, PUBLIC functions, policies, triggers, disclosure endpoint,
-- event replays or automatic deletion job are created by this proposal.
COMMIT;
