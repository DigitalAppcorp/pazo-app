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

CREATE TABLE IF NOT EXISTS supporter_private.pazo_f18_historical_qa_archive (
  intent_id text PRIMARY KEY REFERENCES supporter_private.pazo_paypal_live_checkout_intents(intent_id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  released_at timestamptz,
  merchant_generation bigint NOT NULL,
  provider_event_id text NOT NULL,
  original_processing_state text NOT NULL CHECK (original_processing_state='held'),
  original_diagnostic_code text NOT NULL,
  original_claim_attempts integer NOT NULL,
  incident_opened_at timestamptz NOT NULL,
  decision_reference text NOT NULL DEFAULT 'pazo-app/issues/121'
    CHECK (decision_reference='pazo-app/issues/121'),
  evidence_class text NOT NULL DEFAULT 'signed_created_verified_no_settlement_confirmed'
    CHECK (evidence_class='signed_created_verified_no_settlement_confirmed'),
  paypal_subscription_read text NOT NULL DEFAULT 'http_404_resource_not_found'
    CHECK (paypal_subscription_read='http_404_resource_not_found'),
  merchant_activity_attestation text NOT NULL DEFAULT 'owner_visible_activity_no_pazo_payment_20261026'
    CHECK (merchant_activity_attestation='owner_visible_activity_no_pazo_payment_20261026'),
  accounting_conclusion text NOT NULL DEFAULT 'financial_outcome_not_provider_certified'
    CHECK (accounting_conclusion='financial_outcome_not_provider_certified'),
  archived_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  UNIQUE(merchant_generation,provider_event_id),
  UNIQUE(owner_id)
);
ALTER TABLE supporter_private.pazo_f18_historical_qa_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.pazo_f18_historical_qa_archive
 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON TABLE supporter_private.pazo_f18_historical_qa_archive TO service_role;

-- The reclassified QA user must never get a second CREATE while the
-- historical PayPal subscription has no provider-terminal confirmation.
-- Preserve the present production eligibility semantics for all other users.
CREATE OR REPLACE FUNCTION supporter_private.public_supporter_eligible(p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $eligible$
 SELECT EXISTS(SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
  WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL
   AND u.is_anonymous IS DISTINCT FROM true AND p.onboarding_completed IS TRUE
   AND (u.banned_until IS NULL OR u.banned_until<statement_timestamp()))
 AND supporter_private.pazo_live_financial_identity_allowed(p_owner)
 AND NOT EXISTS(SELECT 1 FROM account_requests_private.deletion_requests
  WHERE subject_user_id=p_owner AND status IN('requested','processing'))
 AND NOT EXISTS(SELECT 1 FROM supporter_private.pazo_f18_historical_qa_archive a
  WHERE a.owner_id=p_owner AND a.released_at IS NULL);
$eligible$;
REVOKE ALL ON FUNCTION supporter_private.public_supporter_eligible(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

-- An inserted, independently verified late event is never suppressed.
-- Reopen the financial incident before processing the newly received event.
CREATE OR REPLACE FUNCTION supporter_private.pazo_f18_archive_late_event_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $late$
BEGIN
 IF EXISTS(SELECT 1 FROM supporter_private.pazo_f18_historical_qa_archive a
  WHERE a.intent_id=NEW.linked_intent_id AND a.merchant_generation=NEW.merchant_generation
   AND a.released_at IS NULL) THEN
   INSERT INTO supporter_private.gradual_incident(code) VALUES ('financial_review')
    ON CONFLICT(code) DO UPDATE SET resolved_at=NULL;
 END IF;
 RETURN NEW;
END $late$;
REVOKE ALL ON FUNCTION supporter_private.pazo_f18_archive_late_event_review()
 FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS pazo_f18_archive_late_event_review
 ON supporter_private.pazo_paypal_live_event_inbox;
CREATE TRIGGER pazo_f18_archive_late_event_review
 AFTER INSERT ON supporter_private.pazo_paypal_live_event_inbox
 FOR EACH ROW EXECUTE FUNCTION supporter_private.pazo_f18_archive_late_event_review();

DO $archive$
DECLARE
  i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
  ev supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
  c bigint;
BEGIN
  -- Serialize the one-time forensic snapshot against webhook/intention writers.
  -- The lock is bounded by statement_timeout and releases at commit/rollback.
  LOCK TABLE supporter_private.pazo_paypal_live_checkout_intents IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE supporter_private.pazo_paypal_live_event_inbox IN SHARE ROW EXCLUSIVE MODE;

  -- A repeat may never clear review reopened by a later real event.
  IF EXISTS (SELECT 1 FROM supporter_private.pazo_f18_historical_qa_archive) THEN
    IF (SELECT count(*) FROM supporter_private.pazo_f18_historical_qa_archive)<>1
      OR EXISTS (SELECT 1 FROM supporter_private.pazo_f18_historical_qa_archive
        WHERE decision_reference<>'pazo-app/issues/121')
    THEN RAISE EXCEPTION 'qa_archive_existing_record_requires_review'; END IF;
    RAISE NOTICE 'qa_archive_already_recorded_no_financial_changes';
    RETURN;
  END IF;

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
  IF (SELECT count(*) FROM supporter_private.pazo_paypal_live_checkout_intents)<>1
    OR (SELECT count(*) FROM supporter_private.pazo_paypal_live_signed_receipts)<>1
  THEN RAISE EXCEPTION 'qa_archive_other_contracts_or_receipts_exist'; END IF;
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
    (intent_id,owner_id,merchant_generation,provider_event_id,
     original_processing_state,original_diagnostic_code,original_claim_attempts,
     incident_opened_at)
  SELECT i.intent_id,i.owner_id,i.merchant_generation,ev.provider_event_id,
    ev.processing_state,ev.last_diagnostic_code,ev.claim_attempts,f.opened_at
  FROM supporter_private.gradual_incident f
  WHERE f.code='financial_review' AND f.resolved_at IS NULL;

  UPDATE supporter_private.pazo_paypal_live_event_inbox
    SET processing_state='qa_archived',
      last_diagnostic_code='qa_signed_created_archived_settlement_unverified'
  WHERE merchant_generation=ev.merchant_generation
    AND provider_event_id=ev.provider_event_id
    AND processing_state='held';
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_archive_inbox_race'; END IF;

  -- Do not close the original contract locally: external status is unknown.
  -- Owner status/recovery/cancellation continue to address this exact binding.
  -- Both its open owner slot and the explicit quarantine prevent another CREATE.

  -- The global hold is superseded by an explicit, preserved QA archive record.
  -- Any NEW unresolved financial event still enters the ordinary inbox.
  UPDATE supporter_private.gradual_incident SET resolved_at=pg_catalog.clock_timestamp()
  WHERE code='financial_review' AND resolved_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'qa_archive_incident_race'; END IF;
END $archive$;

COMMIT;
