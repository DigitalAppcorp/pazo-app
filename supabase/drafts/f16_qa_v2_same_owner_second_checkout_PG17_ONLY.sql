-- PAZO F16 Sandbox V2: SECOND subscription attempt for an authorized QA
-- owner with ONE historical P06 checkout. No cleanup or rewriting old consent.
-- DO NOT APPLY: tested in disposable PG17 before hosted installation.
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR current_user<>'postgres'
 OR to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NULL
 OR to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR to_regclass('supporter_private.paypal_p06_offers') IS NULL
 OR to_regclass('supporter_private.f16_sandbox_qa_owners') IS NULL
 OR to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NOT NULL
 THEN RAISE EXCEPTION 'QA V2 checkout DISPOSABLE ONLY' USING ERRCODE='42501'; END IF;
END $guard$;

CREATE TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts(
 owner_id uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 request_key uuid NOT NULL,
 intent_id text NOT NULL UNIQUE REFERENCES supporter_private.paypal_subscription_intents(intent_id),
 locale text NOT NULL CHECK(locale IN ('es','en')),
 terms_version text NOT NULL DEFAULT 'pazo-supporter-sandbox.benefits-v2'
   CHECK(terms_version='pazo-supporter-sandbox.benefits-v2'),
 terms_sha256 text NOT NULL CHECK(terms_sha256 ~ '^[0-9a-f]{64}$'),
 consented_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 provider_create_claimed_at timestamptz,
 retention_hold boolean NOT NULL DEFAULT true,
 PRIMARY KEY(owner_id,request_key),
 UNIQUE(owner_id),
 FOREIGN KEY(terms_version,locale)
 REFERENCES supporter_private.paypal_p06_offers(version,locale)
);
ALTER TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_v2_checkout_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.f16_sandbox_qa_v2_checkout_attempts FROM PUBLIC,anon,authenticated,service_role;

-- This is a *different* idempotency boundary from the existing P06 checkout.
-- The V1 record is deliberately retained for financial/terms audit.
CREATE FUNCTION public.f16_qa_v2_begin_checkout(
 p_owner_id uuid,p_request_key uuid,p_locale text,
 p_terms_version text,p_terms_digest text,p_affirmative boolean
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 old_row supporter_private.paypal_p06_checkout_attempts%ROWTYPE;
 stored supporter_private.paypal_subscription_intents%ROWTYPE;
 a supporter_private.f16_sandbox_qa_v2_checkout_attempts%ROWTYPE;
 offer supporter_private.paypal_p06_offers%ROWTYPE;
 new_id text;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL
 OR p_locale NOT IN ('es','en')
 OR p_terms_version IS DISTINCT FROM 'pazo-supporter-sandbox.benefits-v2'
 OR p_terms_digest IS NULL OR p_terms_digest !~ '^[a-f0-9]{64}$'
 OR p_affirmative IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Explicit four-benefit QA consent required' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
    JOIN auth.users u ON u.id=q.owner_id
    WHERE q.owner_id=p_owner_id AND q.status='enabled'
      AND q.expires_at>pg_catalog.clock_timestamp())
 THEN RAISE EXCEPTION 'QA owner not authorized' USING ERRCODE='42501'; END IF;
 SELECT * INTO old_row FROM supporter_private.paypal_p06_checkout_attempts
 WHERE owner_id=p_owner_id;
 IF NOT FOUND OR old_row.terms_version='pazo-supporter-sandbox.benefits-v2'
 THEN RAISE EXCEPTION 'Existing-owner v2 requires an intact historical v1 record'
  USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.locale IS DISTINCT FROM p_locale
   OR a.terms_version IS DISTINCT FROM p_terms_version
   OR a.terms_sha256 IS DISTINCT FROM p_terms_digest
  THEN RAISE EXCEPTION 'V2 idempotency conflict' USING ERRCODE='22023'; END IF;
  SELECT * INTO stored FROM supporter_private.paypal_subscription_intents
   WHERE owner_id=p_owner_id AND intent_id=a.intent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'V2 intent disappeared' USING ERRCODE='23503'; END IF;
  RETURN pg_catalog.jsonb_build_object('ownerId',p_owner_id,
   'intentId',stored.intent_id,'planId',stored.plan_id,
   'requestKey',a.request_key,'locale',a.locale,
   'termsVersion',a.terms_version,'termsDigest',a.terms_sha256,
   'createdAt',a.created_at,'state',stored.state);
 END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
   WHERE owner_id=p_owner_id)
 THEN RAISE EXCEPTION 'One v2 attempt per owner' USING ERRCODE='23505'; END IF;
 SELECT * INTO offer FROM supporter_private.paypal_p06_offers
 WHERE version=p_terms_version AND locale=p_locale
  AND sha256=p_terms_digest AND published_at IS NOT NULL
  AND plan_id='P-14V25407JP6850922NLHMDKI'
  AND currency='USD' AND price_minor=299 AND cadence='MONTH_1'
  AND EXISTS (SELECT 1 FROM supporter_private.paypal_p06_offers c
   WHERE c.version=p_terms_version AND c.locale<>p_locale
     AND c.published_at IS NOT NULL
     AND c.plan_id='P-14V25407JP6850922NLHMDKI'
     AND c.currency='USD' AND c.price_minor=299 AND c.cadence='MONTH_1');
 IF NOT FOUND THEN RAISE EXCEPTION 'New bilingual QA terms not published'
   USING ERRCODE='42501'; END IF;
 new_id:='intent-'||pg_catalog.gen_random_uuid()::text;
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,provider,plan_id,state)
 VALUES(new_id,p_owner_id,'paypal','P-14V25407JP6850922NLHMDKI','pending');
 INSERT INTO supporter_private.f16_sandbox_qa_v2_checkout_attempts
  (owner_id,request_key,intent_id,locale,terms_version,terms_sha256)
 VALUES(p_owner_id,p_request_key,new_id,p_locale,p_terms_version,p_terms_digest);
 RETURN pg_catalog.jsonb_build_object('ownerId',p_owner_id,'intentId',new_id,
   'planId','P-14V25407JP6850922NLHMDKI','requestKey',p_request_key,
   'locale',p_locale,'termsVersion',p_terms_version,'termsDigest',p_terms_digest,
   'createdAt',pg_catalog.clock_timestamp(),'state','pending');
END $fn$;
REVOKE ALL ON FUNCTION public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_begin_checkout(uuid,uuid,text,text,text,boolean)
 TO service_role;

-- Durable one-shot provider-create claim. A failure cannot authorize retry.
CREATE FUNCTION public.f16_qa_v2_claim_provider_create(
 p_owner_id uuid,p_request_key uuid,p_intent_id text
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE a supporter_private.f16_sandbox_qa_v2_checkout_attempts%ROWTYPE;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL OR p_intent_id IS NULL
 OR p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 THEN RAISE EXCEPTION 'Invalid V2 claim arguments' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q
   WHERE q.owner_id=p_owner_id AND q.status='enabled'
   AND q.expires_at>pg_catalog.clock_timestamp())
 THEN RETURN false; END IF;
 SELECT * INTO a FROM supporter_private.f16_sandbox_qa_v2_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND OR a.intent_id IS DISTINCT FROM p_intent_id
 OR a.provider_create_claimed_at IS NOT NULL
 OR NOT EXISTS (SELECT 1 FROM supporter_private.paypal_subscription_intents i
   WHERE i.intent_id=p_intent_id AND i.owner_id=p_owner_id
    AND i.state='pending' AND i.provider='paypal'
    AND i.plan_id='P-14V25407JP6850922NLHMDKI')
 THEN RETURN false; END IF;
 UPDATE supporter_private.f16_sandbox_qa_v2_checkout_attempts
 SET provider_create_claimed_at=pg_catalog.clock_timestamp()
 WHERE owner_id=p_owner_id AND request_key=p_request_key
   AND provider_create_claimed_at IS NULL;
 RETURN FOUND;
END $fn$;
REVOKE ALL ON FUNCTION public.f16_qa_v2_claim_provider_create(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_claim_provider_create(uuid,uuid,text)
 TO service_role;
COMMIT;
