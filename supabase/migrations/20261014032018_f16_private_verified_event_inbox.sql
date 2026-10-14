-- PAZO F16: private verified PayPal event inbox, PREPARED MIGRATION.
-- Generated with Supabase CLI 2.120.0 migration new on 2026-10-14 UTC.
-- DRAFT ON PR #44: NOT APPLIED to hosted Supabase, no deployment authorized.
-- Scope: event reference inbox only. NO ledger, no paid entitlement, no founder updates.
-- Retention policy, deletion-account integration and worker remain separate gates.
-- Upstream baseline required: supporter_private schema and consent foundation.
-- Do not execute this migration on PAZO hosted without explicit PO authorization.
BEGIN;

CREATE TABLE supporter_private.paypal_verified_event_inbox (
  provider_event_id text PRIMARY KEY
    CONSTRAINT f16_provider_event_ref CHECK (provider_event_id ~ '^[A-Za-z0-9._-]{1,128}$'),
  event_type text NOT NULL
    CONSTRAINT f16_provider_event_type CHECK (event_type IN (
      'BILLING.SUBSCRIPTION.ACTIVATED',
      'BILLING.SUBSCRIPTION.UPDATED',
      'BILLING.SUBSCRIPTION.CANCELLED',
      'BILLING.SUBSCRIPTION.SUSPENDED',
      'BILLING.SUBSCRIPTION.EXPIRED',
      'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
      'PAYMENT.SALE.COMPLETED',
      'PAYMENT.SALE.REFUNDED',
      'PAYMENT.SALE.REVERSED'
    )),
  verified_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  processing_state text NOT NULL DEFAULT 'pending'
    CONSTRAINT f16_inbox_processing_state CHECK (
      processing_state IN ('pending','processing','quarantined','processed')
    ),
  attempt_count integer NOT NULL DEFAULT 0
    CONSTRAINT f16_inbox_nonnegative_attempts CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  processed_at timestamptz,
  -- Default-deny until the future audited ledger/worker proves this event
  -- is terminal, fully reconciled and free from disputes or reversals.
  retention_hold boolean NOT NULL DEFAULT true,
  retention_released_at timestamptz,
  CONSTRAINT f16_release_only_after_reconciliation CHECK (
    retention_hold OR (
      processing_state = 'processed'
      AND processed_at IS NOT NULL
      AND retention_released_at IS NOT NULL
      AND retention_released_at >= processed_at
    )
  ),
  last_error_code text
    CONSTRAINT f16_inbox_error_code CHECK (
      last_error_code IS NULL OR last_error_code ~ '^[a-z_]{1,48}$'
    ),
  CONSTRAINT f16_inbox_processed_only_when_processed
    CHECK (processed_at IS NULL OR processing_state='processed')
);

-- No owner/customer/provider payload, payer email, payment data or card data
-- may be written into this minimal event-reference inbox.
ALTER TABLE supporter_private.paypal_verified_event_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_verified_event_inbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.paypal_verified_event_inbox
FROM PUBLIC, anon, authenticated, service_role;
-- supporter_private schema itself remains unexposed to all Data API roles.

CREATE FUNCTION public.f16_paypal_record_verified_event(
  p_provider_event_id text, p_event_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_inserted boolean;
  v_existing_type text;
BEGIN
  IF p_provider_event_id IS NULL
     OR p_provider_event_id !~ '^[A-Za-z0-9._-]{1,128}$'
     OR p_event_type IS NULL OR p_event_type NOT IN (
       'BILLING.SUBSCRIPTION.ACTIVATED',
       'BILLING.SUBSCRIPTION.UPDATED',
       'BILLING.SUBSCRIPTION.CANCELLED',
       'BILLING.SUBSCRIPTION.SUSPENDED',
       'BILLING.SUBSCRIPTION.EXPIRED',
       'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
       'PAYMENT.SALE.COMPLETED',
       'PAYMENT.SALE.REFUNDED',
       'PAYMENT.SALE.REVERSED'
     )
  THEN
    RAISE EXCEPTION 'Unsupported verified event reference'
      USING ERRCODE = '22023';
  END IF;

  -- The unique primary key serializes concurrent first inserts. Never UPDATE
  -- the row on webhook retries; don't reset processing state or timestamps.
  INSERT INTO supporter_private.paypal_verified_event_inbox AS inbox
    (provider_event_id,event_type)
  VALUES (p_provider_event_id,p_event_type)
  ON CONFLICT (provider_event_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted IS TRUE THEN
    RETURN true;
  END IF;

  SELECT inbox.event_type INTO v_existing_type
  FROM supporter_private.paypal_verified_event_inbox AS inbox
  WHERE inbox.provider_event_id=p_provider_event_id;

  -- Fail closed on a repeated PayPal event ID containing another event type:
  -- it must not be falsely acknowledged as the same event.
  IF v_existing_type IS DISTINCT FROM p_event_type THEN
    RAISE EXCEPTION 'Verified event reference conflicts with existing event'
      USING ERRCODE = '22023';
  END IF;
  RETURN false;
END;
$function$;

ALTER FUNCTION public.f16_paypal_record_verified_event(text,text)
OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_paypal_record_verified_event(text,text)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.f16_paypal_record_verified_event(text,text)
TO service_role;

COMMIT;
