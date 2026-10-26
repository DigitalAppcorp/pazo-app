-- F18 #112 one-time historical QA-canary archive, not a PayPal settlement.
-- Authorized by the Product Owner after original signed CREATED event GET matched,
-- subscription GET returned 404 and merchant activity was attested empty for PAZO.
-- This DOES NOT assert that PayPal has certified zero payments or a terminal status.
BEGIN;
SET LOCAL lock_timeout='4s';
SET LOCAL statement_timeout='20s';

-- Preserve both forensic records in place; add precise archival vocabulary.
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox
 DROP CONSTRAINT pazo_paypal_live_event_inbox_processing_state_check;
ALTER TABLE supporter_private.pazo_paypal_live_event_inbox
 ADD CONSTRAINT pazo_paypal_live_event_inbox_processing_state_check
 CHECK (processing_state IN ('pending','processing','processed','held','qa_archived'));
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents
 DROP CONSTRAINT pazo_paypal_live_checkout_intents_closed_reason_check;
ALTER TABLE supporter_private.pazo_paypal_live_checkout_intents
 ADD CONSTRAINT pazo_paypal_live_checkout_intents_closed_reason_check
 CHECK (closed_reason IN ('unclaimed_abandoned','provider_terminal_reconciled',
  'qa_historical_unverified'));

CREATE TABLE supporter_private.pazo_f18_historical_qa_archive (
  intent_id text PRIMARY KEY REFERENCES supporter_private.pazo_paypal_live_checkout_intents(intent_id),
  merchant_generation bigint NOT NULL,
  provider_event_id text NOT NULL,
  evidence_class text NOT NULL DEFAULT 'signed_created_verified_no_settlement_confirmed'
    CHECK (evidence_class='signed_created_verified_no_settlement_confirmed'),
  paypal_subscription_read text NOT NULL DEFAULT 'http_404_resource_not_found'
    CHECK (paypal_subscription_read='http_404_resource_not_found'),
  merchant_activity_attestation text NOT NULL DEFAULT 'owner_visible_activity_no_pazo_payment_20261026'
    CHECK (merchant_activity_attestation='owner_visible_activity_no_pazo_payment_20261026'),
  accounting_conclusion text NOT NULL DEFAULT 'financial_outcome_not_provider_certified'
    CHECK (accounting_conclusion='financial_outcome_not_provider_certified'),
  archived_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE(merchant_generation,provider_event_id)
);
ALTER TABLE supporter_private.pazo_f18_historical_qa_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.pazo_f18_historical_qa_archive
 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON TABLE supporter_private.pazo_f18_historical_qa_archive TO service_role;

DO $archive$
DECLARE
  i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
  ev supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
  c bigint;
BEGIN
  -- Financial pause must remain active, and no unrelated unresolved incident.
  IF NOT EXISTS (SELECT 1 FROM supporter_private.public_supporter_control p
    WHERE p.singleton AND p.checkouts_enabled IS FALSE AND p.invitations_enabled IS FALSE)
   OR NOT EXISTS (SELECT 1 FROM supporter_private.gradual_incident f
    WHERE f.code='financial_review' AND f.resolved_at IS NULL)
   OR EXISTS (SELECT 1 FROM supporter_private.gradual_incident f
    WHERE f.code<>'financial_review' AND f.resolved_at IS NULL)
  THEN RAISE EXCEPTION 'qa_archive_controls_not_isolated'; END IF;

  -- Exactly the original merchant-generation canary, classified as historical
  -- QA AND later prebeta production; no invented PayPal terminal status.
  SELECT count(*) INTO c
  FROM supporter_private.pazo_paypal_live_checkout_intents x
  JOIN admin_private.pazo_live_release_control rc
    ON rc.singleton AND rc.canary_owner=x.owner_id
       AND rc.merchant_generation=x.merchant_generation
  JOIN supporter_private.gradual_qa_accounts qa ON qa.owner_id=x.owner_id
  JOIN supporter_private.pazo_live_production_reclassifications pr
    ON pr.owner_id=x.owner_id
  WHERE x.state='bound' AND x.closed_at IS NULL AND x.provider_status IS NULL
    AND x.source_environment='live' AND x.affirmative_consent IS TRUE
    AND x.provider_subscription_id IS NOT NULL;
  IF c<>1 THEN RAISE EXCEPTION 'qa_archive_canary_scope_not_unique'; END IF;

  SELECT x.* INTO STRICT i
  FROM supporter_private.pazo_paypal_live_checkout_intents x
  JOIN admin_private.pazo_live_release_control rc
    ON rc.singleton AND rc.canary_owner=x.owner_id
       AND rc.merchant_generation=x.merchant_generation
  JOIN supporter_private.gradual_qa_accounts qa ON qa.owner_id=x.owner_id
  JOIN supporter_private.pazo_live_production_reclassifications pr
    ON pr.owner_id=x.owner_id
  WHERE x.state='bound' AND x.closed_at IS NULL AND x.provider_status IS NULL
    AND x.source_environment='live' AND x.affirmative_consent IS TRUE
    AND x.provider_subscription_id IS NOT NULL
  FOR UPDATE OF x;

  SELECT count(*) INTO c FROM supporter_private.pazo_paypal_live_event_inbox;
  IF c<>1 THEN RAISE EXCEPTION 'qa_archive_other_webhook_events_exist'; END IF;
  SELECT ev0.* INTO STRICT ev
  FROM supporter_private.pazo_paypal_live_event_inbox ev0
  JOIN supporter_private.pazo_paypal_live_signed_receipts s
    ON s.merchant_generation=ev0.merchant_generation
       AND s.provider_event_id=ev0.provider_event_id
       AND s.event_type=ev0.event_type
       AND s.subscription_id=i.provider_subscription_id
  JOIN admin_private.pazo_paypal_merchant_generations g
    ON g.generation=ev0.merchant_generation
       AND g.environment=ev0.source_environment
       AND g.webhook_id=s.signature_webhook_id
  WHERE ev0.linked_intent_id=i.intent_id
    AND ev0.merchant_generation=i.merchant_generation
    AND ev0.source_environment='live'
    AND ev0.event_type='BILLING.SUBSCRIPTION.CREATED'
    AND ev0.processing_state='held'
    AND ev0.lease_token IS NULL
    AND ev0.completed_lease_token IS NULL
    AND ev0.last_diagnostic_code='worker_review_required'
    AND s.proof_source='paypal_live_postback_success'
    AND s.subject_id=i.provider_subscription_id
  FOR UPDATE OF ev0;

  IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_paid_periods)<>0
    OR EXISTS (SELECT 1 FROM supporter_private.pazo_paypal_live_signed_receipts
      WHERE event_type IN ('PAYMENT.SALE.COMPLETED','BILLING.SUBSCRIPTION.ACTIVATED',
        'BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.EXPIRED'))
    OR EXISTS (SELECT 1 FROM supporter_private.pazo_paypal_live_cancel_claims
      WHERE intent_id=i.intent_id)
    OR EXISTS (SELECT 1 FROM supporter_private.pazo_paypal_live_period_holds)
    OR EXISTS (SELECT 1 FROM supporter_private.pazo_f18_historical_qa_archive)
  THEN RAISE EXCEPTION 'qa_archive_other_financial_evidence_exists'; END IF;

  -- This is only a CREATE event archive: not a provider verified termination
  -- and never a PAYMENT.SALE.COMPLETED or entitlement confirmation.
  INSERT INTO supporter_private.pazo_f18_historical_qa_archive
    (intent_id,merchant_generation,provider_event_id)
  VALUES (i.intent_id,i.merchant_generation,ev.provider_event_id);

  UPDATE supporter_private.pazo_paypal_live_event_inbox
    SET processing_state='qa_archived',
      last_diagnostic_code='qa_signed_created_archived_settlement_unverified',
      retry_after=NULL
  WHERE merchant_generation=ev.merchant_generation
    AND provider_event_id=ev.provider_event_id
    AND processing_state='held';
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_archive_inbox_race'; END IF;

  UPDATE supporter_private.pazo_paypal_live_checkout_intents
    SET closed_at=pg_catalog.clock_timestamp(),
      closed_reason='qa_historical_unverified',
      recovery_lease=NULL,recovery_expires_at=NULL
  WHERE intent_id=i.intent_id AND closed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_archive_intent_race'; END IF;

  -- The global hold is superseded by an explicit, preserved QA archive record.
  -- Any NEW unresolved financial event still enters the ordinary inbox.
  UPDATE supporter_private.gradual_incident SET resolved_at=pg_catalog.clock_timestamp()
  WHERE code='financial_review' AND resolved_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_archive_incident_race'; END IF;
END $archive$;

COMMIT;
