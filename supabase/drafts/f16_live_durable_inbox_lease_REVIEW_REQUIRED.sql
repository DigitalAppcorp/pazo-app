-- PAZO F16 — REVIEW DRAFT ONLY. No deployment or financial release.
-- Extends signed-event inbox with durable, crash-recoverable exclusive claims.
-- Original event payload, payer identity and secrets are never persisted here.
-- The worker MUST fetch original PayPal event + sale proof before a ledger write.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('supporter_private.pazo_paypal_live_event_inbox') IS NULL
  OR to_regclass('supporter_private.pazo_paypal_live_checkout_intents') IS NULL
  OR to_regprocedure('public.pazo_f16_live_service_inbox_claim(bigint,text)') IS NOT NULL
  OR to_regprocedure('public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'inbox lease preflight blocked' USING ERRCODE='42501'; END IF;
END $guard$;

ALTER TABLE supporter_private.pazo_paypal_live_event_inbox
 ADD COLUMN lease_token uuid,
 ADD COLUMN leased_at timestamptz,
 ADD COLUMN lease_expires_at timestamptz,
 ADD COLUMN claim_attempts integer NOT NULL DEFAULT 0
  CHECK(claim_attempts BETWEEN 0 AND 3),
 ADD CONSTRAINT live_inbox_lease_integrity CHECK(
  (lease_token IS NULL AND leased_at IS NULL AND lease_expires_at IS NULL)
  OR (lease_token IS NOT NULL AND leased_at IS NOT NULL
   AND lease_expires_at IS NOT NULL AND lease_expires_at>leased_at)
 );
CREATE INDEX pazo_f16_live_inbox_lease_recovery
 ON supporter_private.pazo_paypal_live_event_inbox(
  processing_state,lease_expires_at,verified_at
 );

CREATE FUNCTION public.pazo_f16_live_service_inbox_claim(
 p_generation bigint,p_event_id text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $claim$
DECLARE v supporter_private.pazo_paypal_live_event_inbox%ROWTYPE;
        out_result jsonb; uid uuid;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
 THEN RETURN NULL; END IF;

 SELECT * INTO v FROM supporter_private.pazo_paypal_live_event_inbox
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND source_environment='live' AND linked_intent_id IS NOT NULL
  AND (
   (processing_state='pending' AND claim_attempts<3)
   OR (processing_state='processing' AND lease_expires_at<pg_catalog.clock_timestamp()
       AND claim_attempts<3)
  )
 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;

 SELECT i.owner_id INTO uid
 FROM supporter_private.pazo_paypal_live_checkout_intents i
 WHERE i.intent_id=v.linked_intent_id AND
  i.merchant_generation=v.merchant_generation AND
  i.source_environment='live' AND i.state='bound';
 IF uid IS NULL THEN RETURN NULL; END IF;

 UPDATE supporter_private.pazo_paypal_live_event_inbox
 SET processing_state='processing',
     lease_token=pg_catalog.gen_random_uuid(),
     leased_at=pg_catalog.clock_timestamp(),
     lease_expires_at=pg_catalog.clock_timestamp()+interval '2 minutes',
     claim_attempts=claim_attempts+1
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
 RETURNING lease_token INTO v.lease_token;

 -- Receipt and original binding are proven by existing private constraints,
 -- but NO signed body or PayPal GET has been fetched by this SQL function.
 RETURN pg_catalog.jsonb_build_object(
  'claimed',true,'leaseToken',v.lease_token,'eventId',p_event_id,
  'eventType',v.event_type,'merchantGeneration',p_generation,
  'sourceEnvironment','live','intentId',v.linked_intent_id,
  'ownerId',uid,'provider','paypal',
  'financialEvidenceVerified',false,'mayGrantBenefits',false
 );
END $claim$;

CREATE FUNCTION public.pazo_f16_live_service_inbox_finish(
 p_generation bigint,p_event_id text,p_lease uuid,p_result text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $finish$
DECLARE changed integer;
BEGIN
 IF pg_catalog.current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
 THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 IF p_lease IS NULL OR p_generation IS NULL OR p_generation NOT BETWEEN 1 AND 9999
  OR p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9._-]{3,128}$'
  OR p_result NOT IN ('held','pending','processed') THEN RETURN false; END IF;

 -- Financial events cannot be acknowledged as processed without an actual
 -- recorded sale or hold tied to their original VERIFIED event reference.
 IF p_result='processed' AND EXISTS (
  SELECT 1 FROM supporter_private.pazo_paypal_live_event_inbox e
  WHERE e.merchant_generation=p_generation AND e.provider_event_id=p_event_id
   AND (
    (e.event_type='PAYMENT.SALE.COMPLETED' AND NOT EXISTS(
      SELECT 1 FROM supporter_private.pazo_paypal_live_paid_periods p
       WHERE p.merchant_generation=e.merchant_generation AND
        p.provider_event_id=e.provider_event_id))
    OR (e.event_type IN ('PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'))
   )
 ) THEN RETURN false; END IF;
 UPDATE supporter_private.pazo_paypal_live_event_inbox
 SET processing_state=p_result,lease_token=NULL,leased_at=NULL,lease_expires_at=NULL
 WHERE merchant_generation=p_generation AND provider_event_id=p_event_id
  AND source_environment='live' AND processing_state='processing'
  AND lease_token=p_lease AND lease_expires_at>=pg_catalog.clock_timestamp();
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN changed=1;
END $finish$;
ALTER FUNCTION public.pazo_f16_live_service_inbox_claim(bigint,text) OWNER TO postgres;
ALTER FUNCTION public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_inbox_claim(bigint,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_inbox_claim(bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pazo_f16_live_service_inbox_finish(bigint,text,uuid,text) TO service_role;
COMMIT;
