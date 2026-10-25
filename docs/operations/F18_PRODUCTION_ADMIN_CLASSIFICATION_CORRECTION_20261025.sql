-- PAZO F18 targeted correction: principal administrator is a permanent production account.
-- Preserve original historical QA/Sandbox records, references and payment ledgers.
-- Never reinterpret any other QA/Sandbox owner as a live payer.
BEGIN;
SET LOCAL lock_timeout='4s';
SET LOCAL statement_timeout='20s';

CREATE TABLE supporter_private.pazo_live_production_reclassifications (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reason text NOT NULL CHECK(reason='production_admin_prebeta_classification_correction'),
 original_gradual_qa jsonb NOT NULL,
 original_sandbox_qa jsonb NOT NULL,
 original_admin_granted_at timestamptz NOT NULL
);
ALTER TABLE supporter_private.pazo_live_production_reclassifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_live_production_reclassifications FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE supporter_private.pazo_live_production_reclassifications FROM PUBLIC, anon, authenticated, service_role;

DO $guard$
DECLARE
 v_owner uuid;
 inserted integer;
BEGIN
 IF (SELECT COUNT(*) FROM admin_private.admin_grants)<>1
 THEN RAISE EXCEPTION 'expected_exactly_one_production_admin'; END IF;
 SELECT user_id INTO STRICT v_owner FROM admin_private.admin_grants;
 IF NOT EXISTS (
  SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
  WHERE u.id=v_owner AND u.email_confirmed_at IS NOT NULL
    AND u.is_anonymous IS DISTINCT FROM true AND p.onboarding_completed IS TRUE
    AND (u.banned_until IS NULL OR u.banned_until<statement_timestamp())
 ) THEN RAISE EXCEPTION 'production_admin_identity_invalid'; END IF;
 IF EXISTS (
  SELECT 1 FROM account_requests_private.deletion_requests
  WHERE subject_user_id=v_owner AND status IN('requested','processing')
 ) THEN RAISE EXCEPTION 'deletion_requested'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.gradual_qa_accounts
      WHERE owner_id=v_owner AND reason='prebeta_20261023')<>1
 OR (SELECT COUNT(*) FROM supporter_private.f16_sandbox_qa_owners
      WHERE owner_id=v_owner AND status='enabled' AND
       test_purpose='f16_four_benefits_sandbox' AND expires_at<statement_timestamp())<>1
 THEN RAISE EXCEPTION 'historical_qa_classification_changed'; END IF;
 IF EXISTS (SELECT 1 FROM supporter_private.pazo_paypal_live_checkout_intents WHERE owner_id=v_owner)
 OR EXISTS (SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods WHERE owner_id=v_owner)
 THEN RAISE EXCEPTION 'payment_history_requires_manual_reconciliation'; END IF;

 INSERT INTO supporter_private.pazo_live_production_reclassifications
 (owner_id,reason,original_gradual_qa,original_sandbox_qa,original_admin_granted_at)
 SELECT g.user_id,'production_admin_prebeta_classification_correction',to_jsonb(q),to_jsonb(s),g.granted_at
 FROM admin_private.admin_grants g
 JOIN supporter_private.gradual_qa_accounts q ON q.owner_id=g.user_id
 JOIN supporter_private.f16_sandbox_qa_owners s ON s.owner_id=g.user_id
 WHERE g.user_id=v_owner AND q.reason='prebeta_20261023'
   AND s.status='enabled' AND s.test_purpose='f16_four_benefits_sandbox'
   AND s.expires_at<statement_timestamp();
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN RAISE EXCEPTION 'reclassification_not_exactly_one'; END IF;
END
$guard$;

CREATE OR REPLACE FUNCTION supporter_private.pazo_live_financial_identity_allowed(p_owner uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $identity$
 SELECT (
  NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts WHERE owner_id=p_owner)
  AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=p_owner)
 ) OR EXISTS(
  SELECT 1 FROM supporter_private.pazo_live_production_reclassifications r
  WHERE r.owner_id=p_owner
    AND r.reason='production_admin_prebeta_classification_correction'
 );
$identity$;
REVOKE ALL ON FUNCTION supporter_private.pazo_live_financial_identity_allowed(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION supporter_private.public_supporter_eligible(p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $eligible$
 SELECT EXISTS(
  SELECT 1 FROM auth.users u JOIN public.profiles p ON p.id=u.id
  WHERE u.id=p_owner AND u.email_confirmed_at IS NOT NULL
   AND u.is_anonymous IS DISTINCT FROM true AND p.onboarding_completed IS TRUE
   AND (u.banned_until IS NULL OR u.banned_until<statement_timestamp())
 )
 AND supporter_private.pazo_live_financial_identity_allowed(p_owner)
 AND NOT EXISTS (
  SELECT 1 FROM account_requests_private.deletion_requests
  WHERE subject_user_id=p_owner AND status IN('requested','processing')
 );
$eligible$;

CREATE OR REPLACE FUNCTION supporter_private.public_supporter_paid(p_owner uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $paid$
BEGIN
 RETURN supporter_private.pazo_live_financial_identity_allowed(p_owner)
  AND supporter_private.gradual_verified_core(p_owner);
EXCEPTION WHEN OTHERS THEN RETURN false;
END
$paid$;

CREATE OR REPLACE FUNCTION supporter_private.public_supporter_verified_sale(p_sale text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $sale$
 SELECT EXISTS(
  SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
  JOIN supporter_private.pazo_paypal_live_checkout_intents i
   ON i.intent_id=p.intent_id AND i.merchant_generation=p.merchant_generation
  JOIN supporter_private.pazo_paypal_live_event_inbox e
   ON e.merchant_generation=p.merchant_generation AND e.provider_event_id=p.provider_event_id
   AND e.linked_intent_id=i.intent_id
  JOIN supporter_private.pazo_paypal_live_signed_receipts r
   ON r.merchant_generation=p.merchant_generation AND r.provider_event_id=p.provider_event_id
  JOIN admin_private.pazo_paypal_merchant_generations g
   ON g.generation=p.merchant_generation AND g.environment='live'
   AND g.plan_id=i.plan_id AND g.webhook_id=r.signature_webhook_id
  WHERE p.sale_id=p_sale AND p.verified_event_type='PAYMENT.SALE.COMPLETED'
   AND p.amount_minor=299 AND p.currency='USD'
   AND i.source_environment='live' AND r.proof_source='paypal_live_postback_success'
   AND r.subscription_id=i.provider_subscription_id AND r.subject_id=p.sale_id
   AND r.event_type='PAYMENT.SALE.COMPLETED'
   AND e.event_type='PAYMENT.SALE.COMPLETED' AND e.processing_state='processed'
   AND supporter_private.pazo_live_financial_identity_allowed(i.owner_id)
 );
$sale$;

DO $verify$
DECLARE v_owner uuid;
BEGIN
 SELECT user_id INTO STRICT v_owner FROM admin_private.admin_grants;
 IF NOT supporter_private.public_supporter_eligible(v_owner) THEN
  RAISE EXCEPTION 'reclassified_production_admin_still_ineligible'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.pazo_live_production_reclassifications)<>1
 THEN RAISE EXCEPTION 'reclassification_scope_not_one_account'; END IF;
 IF (SELECT COUNT(*) FROM supporter_private.gradual_qa_accounts WHERE owner_id=v_owner)<>1
 OR (SELECT COUNT(*) FROM supporter_private.f16_sandbox_qa_owners WHERE owner_id=v_owner)<>1
 THEN RAISE EXCEPTION 'historical_qa_evidence_was_mutated'; END IF;
END
$verify$;
COMMIT;
