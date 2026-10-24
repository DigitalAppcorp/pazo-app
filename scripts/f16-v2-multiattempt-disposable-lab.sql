-- F16 PG17 disposable extension: multiattempt account + finance proof.
-- Only synthetic records, no Supabase hosted traffic or merchant API.
\set ON_ERROR_STOP on
\i scripts/f16-v2-retry-disposable-lab.sql

BEGIN;
ALTER TABLE supporter_private.paypal_p06_offers
 ADD COLUMN exact_copy text NOT NULL DEFAULT repeat('synthetic immutable terms ',10);
ALTER TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ADD COLUMN consented_at timestamptz NOT NULL DEFAULT clock_timestamp();
UPDATE supporter_private.f16_sandbox_qa_v2_checkout_attempts
 SET created_at=clock_timestamp()-interval '2 days';
ALTER TABLE supporter_private.f16_sandbox_qa_paid_periods
 ADD COLUMN sale_id text UNIQUE,
 ADD COLUMN event_id text,
 ADD COLUMN cycle_key text,
 ADD COLUMN accepted_offer_version text,
 ADD COLUMN provider_environment text,
 ADD COLUMN amount_minor integer,
 ADD COLUMN currency text,
 ADD COLUMN service_start timestamptz,
 ADD COLUMN service_end timestamptz,
 ADD COLUMN merchant_verified_at timestamptz;
CREATE TABLE supporter_private.f16_sandbox_qa_holds(
 sale_id text NOT NULL,event_id text NOT NULL,
 reason text NOT NULL,verified_at timestamptz NOT NULL,
 PRIMARY KEY(sale_id,event_id));
CREATE FUNCTION public.f16_qa_v2_read_owner_account(p_owner_id uuid,p_intent_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT jsonb_build_object('ownerId',a.owner_id,'intentId',i.intent_id,
 'provider','paypal','planId',i.plan_id,'state',i.state,
 'externalSubscriptionId',CASE WHEN i.state='bound'
 THEN i.external_subscription_id ELSE NULL END,
 'locale',a.locale,'termsVersion',a.terms_version,
 'termsDigest',a.terms_sha256,'exactCopy',o.exact_copy,
 'consentedAt',a.consented_at,'priceMinor',o.price_minor,
 'currency',o.currency,'cadence',o.cadence,
 'providerCreateClaimed',a.provider_create_claimed_at IS NOT NULL)
 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts a
 JOIN supporter_private.paypal_subscription_intents i
  ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
 JOIN supporter_private.paypal_p06_offers o
  ON o.version=a.terms_version AND o.locale=a.locale
  AND o.sha256=a.terms_sha256
 WHERE a.owner_id=p_owner_id AND (p_intent_id IS NULL OR a.intent_id=p_intent_id)
 LIMIT 1
$fn$;
COMMIT;

\i supabase/migrations/20261018132828_f16_sandbox_v2_multiattempt_account_read_and_finance.sql

DO $assert$
DECLARE
  records jsonb; latest jsonb; first jsonb;
  v_owner uuid:='11111111-1111-4111-8111-111111111111';
  retry_intent text;
  result jsonb;
BEGIN
  SELECT intent_id INTO retry_intent
  FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
  WHERE owner_id=v_owner ORDER BY created_at DESC LIMIT 1;
  IF retry_intent IS NULL THEN RAISE EXCEPTION 'Synthetic retry missing'; END IF;
  UPDATE supporter_private.paypal_subscription_intents
    SET state='bound',external_subscription_id='I-TEST-RETRY-PAID01'
    WHERE intent_id=retry_intent;
  records:=public.f16_qa_v2_multi_list_owner_accounts(v_owner);
  IF jsonb_array_length(records)<>2
    OR records->0->>'intentId'<>retry_intent
    OR records->1->>'intentId'<>'intent-33333333-3333-4333-8333-333333333333'
  THEN RAISE EXCEPTION 'Multiattempt history/read order invalid'; END IF;
  IF records->0->>'externalSubscriptionId'<>'I-TEST-RETRY-PAID01'
    OR records->1->>'externalSubscriptionId'<>'I-TEST-ORIGINAL01'
  THEN RAISE EXCEPTION 'Exact owner subscription binding invalid'; END IF;
  IF records->0->>'exactCopy' IS NULL OR records->1->>'exactCopy' IS NULL
  THEN RAISE EXCEPTION 'Immutable acceptance not available'; END IF;
  result:=public.f16_qa_v2_record_verified_first_cycle(
   v_owner,retry_intent,'SALE-SYNTHETIC-001',
   clock_timestamp()-interval '1 hour',
   clock_timestamp()-interval '1 day',
   clock_timestamp()+interval '29 days');
  IF result->>'phase'<>'verified_first_sandbox_cycle'
  THEN RAISE EXCEPTION 'Retry paid cycle not matched'; END IF;
  IF NOT public.f16_qa_v2_mark_merchant_sale_reversal(
    v_owner,retry_intent,'SALE-SYNTHETIC-001','refunded')
  THEN RAISE EXCEPTION 'Retry reversal not recorded'; END IF;
  IF NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_holds
    WHERE sale_id='SALE-SYNTHETIC-001')
  THEN RAISE EXCEPTION 'Refund hold missing'; END IF;
  IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
    WHERE intent_id=retry_intent)
  THEN RAISE EXCEPTION 'Retry polluted original V2 attempt'; END IF;
  IF has_function_privilege('authenticated',
   'public.f16_qa_v2_multi_list_owner_accounts(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Unauthorized V2 history reader'; END IF;
END $assert$;
\echo F16_V2_MULTIATTEMPT_PG17_PASS
