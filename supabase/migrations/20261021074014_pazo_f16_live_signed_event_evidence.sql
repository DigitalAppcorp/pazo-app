-- Minimal signed provenance for the existing durable Live queue. No payments.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_signed_receipts') IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_new_checkout_switch
   WHERE singleton AND environment='sandbox' AND NOT live_enabled
    AND kill_switch AND active_generation IS NULL)
  OR (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid=
   to_regprocedure('public.pazo_f16_live_service_inbox_claim(bigint,text)'))
    IS DISTINCT FROM '642e6663ae517e30ac9f0250df6a01c4'
  OR (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid=
   to_regprocedure('public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text)'))
    IS DISTINCT FROM 'f6b66e8d88585284f542a214317344a5'
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid IN(
   to_regprocedure('public.pazo_f16_live_service_inbox_claim(bigint,text)'),
   to_regprocedure('public.pazo_f16_live_service_verified_event_queue(uuid,text,text,bigint,text,text)'))
   AND (NOT p.prosecdef OR pg_catalog.pg_get_userbyid(p.proowner)<>'postgres'
    OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']
    OR p.proacl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'))
 THEN RAISE EXCEPTION 'signed receipt prerequisite drift' USING ERRCODE='42501'; END IF;
END $guard$;

CREATE TABLE supporter_private.pazo_paypal_live_signed_receipts(
 merchant_generation bigint NOT NULL,
 provider_event_id text NOT NULL,
 event_type text NOT NULL,
 proof_source text NOT NULL CHECK(proof_source='paypal_live_postback_success'),
 signed_body_sha256 text NOT NULL CHECK(signed_body_sha256 ~ '^[a-f0-9]{64}$'),
 signature_webhook_id text NOT NULL CHECK(signature_webhook_id ~ '^[A-Za-z0-9_-]{8,100}$'),
 subscription_id text NOT NULL CHECK(subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 subject_id text NOT NULL CHECK(subject_id ~ '^[A-Za-z0-9._-]{3,128}$'),
 provider_event_at timestamptz NOT NULL,
 subject_at timestamptz NOT NULL,
 activation_at timestamptz,
 next_billing_at timestamptz,
 verified_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 PRIMARY KEY(merchant_generation,provider_event_id),
 FOREIGN KEY(merchant_generation,provider_event_id,event_type)
  REFERENCES supporter_private.pazo_paypal_live_event_inbox
   (merchant_generation,provider_event_id,event_type)
);
ALTER TABLE supporter_private.pazo_paypal_live_signed_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.pazo_paypal_live_signed_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.pazo_paypal_live_signed_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX pazo_live_signed_receipt_subscription
 ON supporter_private.pazo_paypal_live_signed_receipts(merchant_generation,subscription_id,event_type);

-- Only the signed webhook intake calls this RPC after postback SUCCESS and
-- original owner/plan verification. An old queue row alone is never signature proof.
CREATE FUNCTION public.pazo_f16_live_service_signed_event_queue(
 p_owner uuid,p_intent text,p_subscription text,p_generation bigint,
 p_event_id text,p_event_type text,p_evidence jsonb
) RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $queue$
DECLARE result text; existing supporter_private.pazo_paypal_live_signed_receipts%ROWTYPE;
 event_at timestamptz; subject_at timestamptz; activation_at timestamptz; next_at timestamptz;
 canonical CONSTANT text := 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
 date_pattern CONSTANT text := '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$';
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF pg_catalog.jsonb_typeof(p_evidence) IS DISTINCT FROM 'object'
 THEN RETURN 'signed_evidence_invalid'; END IF;
 IF NOT (p_evidence ?& ARRAY['proofSource','signedBodySha256','webhookId','subscriptionId',
   'subjectId','providerEventAt','subjectAt','activationAt','nextBillingAt'])
  OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(p_evidence))<>9
  OR p_evidence->>'proofSource' IS DISTINCT FROM 'paypal_live_postback_success'
  OR p_evidence->>'subscriptionId' IS DISTINCT FROM p_subscription
  OR p_evidence->>'signedBodySha256' !~ '^[a-f0-9]{64}$'
  OR p_evidence->>'webhookId' !~ '^[A-Za-z0-9_-]{8,100}$'
  OR p_evidence->>'subjectId' !~ '^[A-Za-z0-9._-]{3,128}$'
  OR p_evidence->>'providerEventAt' !~ date_pattern
  OR p_evidence->>'subjectAt' !~ date_pattern
 THEN RETURN 'signed_evidence_invalid'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.jsonb_each(p_evidence) x
   WHERE x.key NOT IN ('activationAt','nextBillingAt') AND pg_catalog.jsonb_typeof(x.value)<>'string')
  OR (p_event_type LIKE 'BILLING.SUBSCRIPTION.%' AND p_evidence->>'subjectId'<>p_subscription)
  OR (p_event_type<>'BILLING.SUBSCRIPTION.ACTIVATED' AND
   (p_evidence->'activationAt'<>'null'::jsonb OR p_evidence->'nextBillingAt'<>'null'::jsonb))
 THEN RETURN 'signed_evidence_invalid'; END IF;
 BEGIN
  event_at:=(p_evidence->>'providerEventAt')::timestamptz;
  subject_at:=(p_evidence->>'subjectAt')::timestamptz;
  IF p_evidence->'activationAt'<>'null'::jsonb THEN
   IF p_evidence->>'activationAt' !~ date_pattern THEN RETURN 'signed_evidence_invalid'; END IF;
   activation_at:=(p_evidence->>'activationAt')::timestamptz;
  END IF;
  IF p_evidence->'nextBillingAt'<>'null'::jsonb THEN
   IF p_evidence->>'nextBillingAt' !~ date_pattern THEN RETURN 'signed_evidence_invalid'; END IF;
   next_at:=(p_evidence->>'nextBillingAt')::timestamptz;
  END IF;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation
 THEN RETURN 'signed_evidence_invalid'; END;
 IF pg_catalog.to_char(event_at AT TIME ZONE 'UTC',canonical)<>p_evidence->>'providerEventAt'
  OR pg_catalog.to_char(subject_at AT TIME ZONE 'UTC',canonical)<>p_evidence->>'subjectAt'
  OR (activation_at IS NOT NULL AND pg_catalog.to_char(activation_at AT TIME ZONE 'UTC',canonical)<>p_evidence->>'activationAt')
  OR (next_at IS NOT NULL AND pg_catalog.to_char(next_at AT TIME ZONE 'UTC',canonical)<>p_evidence->>'nextBillingAt')
  OR NOT EXISTS(SELECT 1 FROM admin_private.pazo_paypal_merchant_generations m
   WHERE m.generation=p_generation AND m.environment='live' AND m.webhook_id=p_evidence->>'webhookId')
 THEN RETURN 'signed_evidence_invalid'; END IF;
 result:=supporter_private.pazo_live_queue_verified_event(p_owner,p_intent,p_subscription,
  p_generation,p_event_id,p_event_type);
 IF result NOT IN ('queued','duplicate_verified_event') THEN RETURN result; END IF;
 INSERT INTO supporter_private.pazo_paypal_live_signed_receipts(
  merchant_generation,provider_event_id,event_type,proof_source,signed_body_sha256,
  signature_webhook_id,subscription_id,subject_id,provider_event_at,subject_at,activation_at,next_billing_at)
 VALUES(p_generation,p_event_id,p_event_type,'paypal_live_postback_success',
  p_evidence->>'signedBodySha256',p_evidence->>'webhookId',p_subscription,
  p_evidence->>'subjectId',event_at,subject_at,activation_at,next_at)
 ON CONFLICT(merchant_generation,provider_event_id) DO NOTHING;
 SELECT * INTO existing FROM supporter_private.pazo_paypal_live_signed_receipts
  WHERE merchant_generation=p_generation AND provider_event_id=p_event_id FOR UPDATE;
 -- Preserve the first body digest; a valid redelivery may differ in formatting.
 -- Its independently signed semantic references and timestamps must still agree.
 IF existing.event_type<>p_event_type OR existing.signature_webhook_id<>p_evidence->>'webhookId'
  OR existing.subscription_id<>p_subscription OR existing.subject_id<>p_evidence->>'subjectId'
  OR existing.provider_event_at<>event_at OR existing.subject_at<>subject_at
  OR existing.activation_at IS DISTINCT FROM activation_at OR existing.next_billing_at IS DISTINCT FROM next_at
 THEN RETURN 'signed_evidence_conflict'; END IF;
 RETURN result;
END $queue$;

-- A durable lease plus this restricted persisted receipt is the worker's
-- signature provenance. No signature flag is accepted from a browser or queue hint.
CREATE FUNCTION public.pazo_f16_live_service_signed_receipt_read(
 p_generation bigint,p_event_id text,p_lease uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $read$
DECLARE result jsonb;
BEGIN
 IF (NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'role')
  IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 SELECT pg_catalog.jsonb_build_object('signatureVerified',true,
  'proofSource',r.proof_source,'signedBodySha256',r.signed_body_sha256,
  'webhookId',r.signature_webhook_id,'subscriptionId',r.subscription_id,'subjectId',r.subject_id,
  'eventId',r.provider_event_id,'eventType',r.event_type,'merchantGeneration',r.merchant_generation,
  'providerEventAt',pg_catalog.to_char(r.provider_event_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'subjectAt',pg_catalog.to_char(r.subject_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'activationAt',pg_catalog.to_char(r.activation_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'nextBillingAt',pg_catalog.to_char(r.next_billing_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'financialEvidenceVerified',false,'mayGrantBenefits',false)
 INTO result FROM supporter_private.pazo_paypal_live_signed_receipts r
 JOIN supporter_private.pazo_paypal_live_event_inbox e ON e.merchant_generation=r.merchant_generation
  AND e.provider_event_id=r.provider_event_id AND e.event_type=r.event_type
 JOIN supporter_private.pazo_paypal_live_checkout_intents i ON i.intent_id=e.linked_intent_id
  AND i.merchant_generation=r.merchant_generation AND i.provider_subscription_id=r.subscription_id
  AND i.source_environment='live' AND i.state='bound'
 JOIN admin_private.pazo_paypal_merchant_generations m ON m.generation=r.merchant_generation
  AND m.environment='live' AND m.webhook_id=r.signature_webhook_id AND m.plan_id=i.plan_id
 WHERE r.merchant_generation=p_generation AND r.provider_event_id=p_event_id
  AND e.source_environment='live' AND e.processing_state='processing'
  AND e.lease_token=p_lease AND e.lease_expires_at>=pg_catalog.clock_timestamp();
 RETURN result;
END $read$;
ALTER FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_signed_receipt_read(bigint,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_signed_receipt_read(bigint,text,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_signed_event_queue(uuid,text,text,bigint,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_signed_receipt_read(bigint,text,uuid) TO service_role;
COMMIT;
