-- F18 #112: service-only READ of the same original signed PayPal canary
-- after the public gradual campaign has begun. This does not change or call
-- the older pre-campaign qa_original_scope or its reconciler.
-- This migration is a separately gated production schema change.
BEGIN;
SET LOCAL lock_timeout='4s';
SET LOCAL statement_timeout='20s';

CREATE FUNCTION public.pazo_f18_live_service_original_evidence_scope()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $scope$
DECLARE
 i supporter_private.pazo_paypal_live_checkout_intents%ROWTYPE;
 e jsonb;
 cohort_count integer;
 receipt_count integer;
BEGIN
 PERFORM supporter_private.gradual_require_service();
 -- Explicit incident isolation; never unlock the checkout or alter the
 -- campaign state to allow a read.
 IF NOT EXISTS (
   SELECT 1 FROM supporter_private.public_supporter_control p
   WHERE p.singleton AND p.checkouts_enabled IS FALSE
      AND p.invitations_enabled IS FALSE
 ) OR NOT EXISTS (
   SELECT 1 FROM supporter_private.gradual_incident d
   WHERE d.code='financial_review' AND d.resolved_at IS NULL
 ) OR NOT EXISTS (
   SELECT 1 FROM supporter_private.gradual_campaign c
   WHERE c.singleton AND c.started_at IS NOT NULL
      AND c.lifecycle='active'
 ) THEN RAISE EXCEPTION 'original_evidence_read_not_admitted'; END IF;

 SELECT count(*) INTO cohort_count
 FROM supporter_private.pazo_paypal_live_checkout_intents x
 JOIN auth.users u ON u.id=x.owner_id
 JOIN admin_private.pazo_live_release_control r
   ON r.singleton AND r.canary_owner=x.owner_id
   AND r.merchant_generation=x.merchant_generation
 WHERE x.closed_at IS NULL AND x.state='bound'
  AND x.source_environment='live'
  AND x.provider_subscription_id IS NOT NULL
  AND u.created_at<'2026-10-23 22:59:00+00';
 IF cohort_count<>1 THEN RAISE EXCEPTION 'original_evidence_scope_not_unique'; END IF;

 SELECT x.* INTO STRICT i
 FROM supporter_private.pazo_paypal_live_checkout_intents x
 JOIN auth.users u ON u.id=x.owner_id
 JOIN admin_private.pazo_live_release_control r
   ON r.singleton AND r.canary_owner=x.owner_id
   AND r.merchant_generation=x.merchant_generation
 WHERE x.closed_at IS NULL AND x.state='bound'
  AND x.source_environment='live'
  AND x.provider_subscription_id IS NOT NULL
  AND u.created_at<'2026-10-23 22:59:00+00';

 SELECT count(*) INTO receipt_count
 FROM supporter_private.pazo_paypal_live_signed_receipts s
 JOIN supporter_private.pazo_paypal_live_event_inbox q
 ON q.merchant_generation=s.merchant_generation
 AND q.provider_event_id=s.provider_event_id
 WHERE s.merchant_generation=i.merchant_generation
  AND s.subscription_id=i.provider_subscription_id
  AND q.linked_intent_id=i.intent_id
  AND s.event_type=q.event_type
  AND s.event_type='BILLING.SUBSCRIPTION.CREATED'
  AND s.proof_source='paypal_live_postback_success'
  AND q.processing_state='held';
 IF receipt_count<>1 THEN RAISE EXCEPTION 'original_evidence_receipt_not_unique'; END IF;

 SELECT jsonb_build_object('eventId',s.provider_event_id,
   'type',s.event_type,'subjectId',s.subject_id,
   'providerEventAt',to_char(s.provider_event_at AT TIME ZONE 'UTC',
     'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   'subjectAt',to_char(s.subject_at AT TIME ZONE 'UTC',
     'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) INTO STRICT e
 FROM supporter_private.pazo_paypal_live_signed_receipts s
 JOIN supporter_private.pazo_paypal_live_event_inbox q
 ON q.merchant_generation=s.merchant_generation
 AND q.provider_event_id=s.provider_event_id
 WHERE s.merchant_generation=i.merchant_generation
  AND s.subscription_id=i.provider_subscription_id
  AND q.linked_intent_id=i.intent_id
  AND s.event_type=q.event_type
  AND s.event_type='BILLING.SUBSCRIPTION.CREATED'
  AND s.proof_source='paypal_live_postback_success'
  AND q.processing_state='held';

 RETURN jsonb_build_object('source','original_admin_postcampaign_scope_v1',
  'sourceEnvironment','live',
  'ownerId',i.owner_id,'intentId',i.intent_id,
  'subscriptionId',i.provider_subscription_id,
  'merchantGeneration',i.merchant_generation,
  'planId',i.plan_id,
  'createdAt',to_char(i.created_at AT TIME ZONE 'UTC',
   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'event',e);
END
$scope$;

REVOKE ALL ON FUNCTION public.pazo_f18_live_service_original_evidence_scope()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f18_live_service_original_evidence_scope()
 TO service_role;
COMMIT;
