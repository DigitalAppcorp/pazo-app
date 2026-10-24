-- PAZO F16: append-only Sandbox V2 checkout retries; PREPARED, NOT APPLIED.
-- Manual merchant reconciliation / explicit PO GO required before ANY grant.
-- Old P06 + first V2 tables/consents remain immutable; no Live integration.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='15s';

DO $guard$
BEGIN
 IF pg_catalog.current_database() NOT IN ('postgres','f14_synthetic')
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_checkout_attempts') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_p06_offers') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_paid_periods') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_payment_entries') IS NULL
 OR pg_catalog.to_regclass('supporter_private.paypal_verified_activation_bindings') IS NULL
 OR pg_catalog.to_regclass('supporter_private.f16_sandbox_qa_v2_retry_grants') IS NOT NULL
 OR pg_catalog.to_regprocedure('public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean)') IS NOT NULL
 THEN RAISE EXCEPTION 'F16 retry baseline changed; fail closed' USING ERRCODE='55000'; END IF;
END $guard$;

-- Database administrators must verify BOTH the merchant and financial history
-- before entering a grant. There is deliberately NO user/Edge/granting RPC.
-- A bare PayPal 404, missing link, browser redirect or empty ledger is NOT proof.
CREATE TABLE supporter_private.f16_sandbox_qa_v2_retry_grants(
 grant_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 predecessor_intent_id text NOT NULL UNIQUE REFERENCES supporter_private.paypal_subscription_intents(intent_id),
 predecessor_subscription_id text NOT NULL
  CHECK(predecessor_subscription_id ~ '^I-[A-Za-z0-9_-]{3,70}$'),
 resolution text NOT NULL CHECK(resolution IN ('CANCELLED','EXPIRED','MERCHANT_CONFIRMED_ABSENT')),
 merchant_scope_verified boolean NOT NULL DEFAULT false,
 merchant_terminal_verified boolean NOT NULL DEFAULT false,
 all_transactions_reconciled boolean NOT NULL DEFAULT false,
 webhook_inbox_reconciled boolean NOT NULL DEFAULT false,
 no_outstanding_charge boolean NOT NULL DEFAULT false,
 no_collectible_subscription boolean NOT NULL DEFAULT false,
 evidence_digest text NOT NULL CHECK(evidence_digest ~ '^[0-9a-f]{64}$'),
 provider_checked_at timestamptz NOT NULL,
 reconciliation_checked_at timestamptz NOT NULL,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 CONSTRAINT f16_retry_grant_approved_only_after_evidence CHECK(
   approved_at IS NULL OR (
    merchant_scope_verified AND merchant_terminal_verified
    AND all_transactions_reconciled AND webhook_inbox_reconciled
    AND no_outstanding_charge AND no_collectible_subscription
    AND approved_at>=provider_checked_at
    AND approved_at>=reconciliation_checked_at
   )
 )
);
CREATE INDEX f16_v2_retry_grant_owner ON supporter_private.f16_sandbox_qa_v2_retry_grants(owner_id,approved_at);

-- Every retry uses new consent, request key, and provider subscription ID;
-- the previous attempt is never overwritten, deleted or marked paid.
CREATE TABLE supporter_private.f16_sandbox_qa_v2_retry_attempts(
 owner_id uuid NOT NULL REFERENCES supporter_private.f16_sandbox_qa_owners(owner_id),
 request_key uuid NOT NULL,
 intent_id text NOT NULL UNIQUE REFERENCES supporter_private.paypal_subscription_intents(intent_id),
 grant_id uuid NOT NULL UNIQUE REFERENCES supporter_private.f16_sandbox_qa_v2_retry_grants(grant_id),
 locale text NOT NULL CHECK(locale IN ('es','en')),
 terms_version text NOT NULL DEFAULT 'pazo-supporter-sandbox.benefits-v2'
  CHECK(terms_version='pazo-supporter-sandbox.benefits-v2'),
 terms_sha256 text NOT NULL CHECK(terms_sha256 ~ '^[0-9a-f]{64}$'),
 consented_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 provider_create_claimed_at timestamptz,
 retention_hold boolean NOT NULL DEFAULT true,
 PRIMARY KEY(owner_id,request_key),
 FOREIGN KEY(terms_version,locale) REFERENCES supporter_private.paypal_p06_offers(version,locale)
);
CREATE INDEX f16_v2_retry_attempt_owner ON supporter_private.f16_sandbox_qa_v2_retry_attempts(owner_id,created_at DESC);

ALTER TABLE supporter_private.f16_sandbox_qa_v2_retry_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_v2_retry_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_v2_retry_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.f16_sandbox_qa_v2_retry_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.f16_sandbox_qa_v2_retry_grants FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON supporter_private.f16_sandbox_qa_v2_retry_attempts FROM PUBLIC,anon,authenticated,service_role;

-- Read-only readiness (service role). No details or payer IDs returned.
CREATE FUNCTION public.f16_qa_v2_retry_eligibility(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT EXISTS (
  SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
  JOIN supporter_private.paypal_subscription_intents i
   ON i.intent_id=g.predecessor_intent_id AND i.owner_id=g.owner_id
   AND i.external_subscription_id=g.predecessor_subscription_id AND i.state='bound'
  JOIN supporter_private.f16_sandbox_qa_owners q ON q.owner_id=g.owner_id
  WHERE g.owner_id=p_owner_id AND g.approved_at IS NOT NULL
   AND g.merchant_scope_verified AND g.merchant_terminal_verified
   AND g.all_transactions_reconciled AND g.webhook_inbox_reconciled
   AND g.no_outstanding_charge AND g.no_collectible_subscription
   AND q.status='enabled' AND q.expires_at>pg_catalog.clock_timestamp()
   AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts a
     WHERE a.owner_id=g.owner_id AND a.grant_id=g.grant_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_paid_periods p
     WHERE p.owner_id=g.owner_id AND p.provider_subscription_id=g.predecessor_subscription_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_payment_entries p
     WHERE p.owner_id=g.owner_id AND p.external_subscription_id=g.predecessor_subscription_id)
   AND NOT EXISTS(SELECT 1 FROM supporter_private.paypal_verified_activation_bindings b
     WHERE b.owner_id=g.owner_id AND b.subscription_id=g.predecessor_subscription_id)
 )
$fn$;

-- Server-owned atomic generation. The newest authorized grant must match the
-- previous bound intent; no second POST may occur for an existing request.
CREATE FUNCTION public.f16_qa_v2_retry_begin_checkout(
 p_owner_id uuid,p_request_key uuid,p_locale text,
 p_terms_version text,p_terms_digest text,p_affirmative boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 selected_grant supporter_private.f16_sandbox_qa_v2_retry_grants%ROWTYPE;
 stored_retry supporter_private.f16_sandbox_qa_v2_retry_attempts%ROWTYPE;
 stored_intent supporter_private.paypal_subscription_intents%ROWTYPE;
 new_id text;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL
 OR p_locale NOT IN('es','en')
 OR p_terms_version IS DISTINCT FROM 'pazo-supporter-sandbox.benefits-v2'
 OR p_terms_digest IS NULL OR p_terms_digest !~ '^[0-9a-f]{64}$'
 OR p_affirmative IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'New affirmative QA V2 consent required' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 -- Idempotent replay MUST use exactly the original consent and intent.
 SELECT * INTO stored_retry FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
  WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF stored_retry.locale IS DISTINCT FROM p_locale OR stored_retry.terms_version IS DISTINCT FROM p_terms_version
    OR stored_retry.terms_sha256 IS DISTINCT FROM p_terms_digest
  THEN RAISE EXCEPTION 'Retry consent mismatch' USING ERRCODE='22023'; END IF;
  SELECT * INTO stored_intent FROM supporter_private.paypal_subscription_intents
   WHERE intent_id=stored_retry.intent_id AND owner_id=p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Retry intent disappeared' USING ERRCODE='23503'; END IF;
  RETURN pg_catalog.jsonb_build_object('ownerId',p_owner_id,'requestKey',p_request_key,
    'intentId',stored_intent.intent_id,'planId',stored_intent.plan_id,'state',stored_intent.state,
    'locale',stored_retry.locale,'termsVersion',stored_retry.terms_version,'termsDigest',stored_retry.terms_sha256,'createdAt',stored_retry.created_at);
 END IF;
 IF NOT public.f16_qa_v2_retry_eligibility(p_owner_id)
 THEN RAISE EXCEPTION 'Merchant reconciliation authorization missing' USING ERRCODE='42501'; END IF;
 -- Prevent any second currently unreconciled V2 retry (including old retry
 -- grants): one eligible, append-only chain at a time.
 IF EXISTS (
  SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts a
  JOIN supporter_private.paypal_subscription_intents i ON i.intent_id=a.intent_id
  WHERE a.owner_id=p_owner_id AND NOT EXISTS(
   SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
   WHERE g.predecessor_intent_id=a.intent_id AND g.owner_id=p_owner_id AND g.approved_at IS NOT NULL)
 ) THEN RAISE EXCEPTION 'Existing retry unresolved' USING ERRCODE='23505'; END IF;
 SELECT * INTO selected_grant FROM supporter_private.f16_sandbox_qa_v2_retry_grants g0
 WHERE g0.owner_id=p_owner_id AND g0.approved_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts a0
 WHERE a0.grant_id=g0.grant_id)
 ORDER BY g0.approved_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Retry proof not available' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM supporter_private.paypal_p06_offers o
  WHERE o.version=p_terms_version AND o.locale=p_locale
    AND o.sha256=p_terms_digest AND o.published_at IS NOT NULL
    AND o.plan_id='P-14V25407JP6850922NLHMDKI'
    AND o.currency='USD' AND o.price_minor=299 AND o.cadence='MONTH_1'
    AND EXISTS(SELECT 1 FROM supporter_private.paypal_p06_offers o2
     WHERE o2.version=o.version AND o2.locale<>o.locale AND o2.published_at IS NOT NULL
      AND o2.plan_id=o.plan_id AND o2.price_minor=299 AND o2.currency='USD' AND o2.cadence='MONTH_1')
 ) THEN RAISE EXCEPTION 'Published bilingual offer mismatch' USING ERRCODE='42501'; END IF;
 new_id:='intent-'||pg_catalog.gen_random_uuid()::text;
 INSERT INTO supporter_private.paypal_subscription_intents(intent_id,owner_id,provider,plan_id,state)
 VALUES(new_id,p_owner_id,'paypal','P-14V25407JP6850922NLHMDKI','pending');
 INSERT INTO supporter_private.f16_sandbox_qa_v2_retry_attempts
 (owner_id,request_key,intent_id,grant_id,locale,terms_version,terms_sha256)
 VALUES(p_owner_id,p_request_key,new_id,selected_grant.grant_id,p_locale,p_terms_version,p_terms_digest);
 RETURN pg_catalog.jsonb_build_object('ownerId',p_owner_id,'requestKey',p_request_key,
 'intentId',new_id,'planId','P-14V25407JP6850922NLHMDKI',
 'state','pending','locale',p_locale,'termsVersion',p_terms_version,
 'termsDigest',p_terms_digest,'createdAt',pg_catalog.clock_timestamp());
END $fn$;

CREATE FUNCTION public.f16_qa_v2_retry_claim_provider_create(
 p_owner_id uuid,p_request_key uuid,p_intent_id text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE a supporter_private.f16_sandbox_qa_v2_retry_attempts%ROWTYPE;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL OR p_intent_id IS NULL
 OR p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 THEN RETURN false; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,0));
 SELECT * INTO a FROM supporter_private.f16_sandbox_qa_v2_retry_attempts
  WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND OR a.intent_id IS DISTINCT FROM p_intent_id
 OR a.provider_create_claimed_at IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
   WHERE g.grant_id=a.grant_id AND g.owner_id=p_owner_id AND g.approved_at IS NOT NULL
   AND g.merchant_terminal_verified AND g.no_collectible_subscription
   AND g.all_transactions_reconciled AND g.webhook_inbox_reconciled)
 OR NOT EXISTS(SELECT 1 FROM supporter_private.paypal_subscription_intents i
   WHERE i.intent_id=p_intent_id AND i.owner_id=p_owner_id AND i.state='pending'
    AND i.provider='paypal' AND i.plan_id='P-14V25407JP6850922NLHMDKI')
 -- Reconcile once more immediately before the irreversible merchant POST.
 -- A late event between consent and provider-create claim must FAIL CLOSED.
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
   JOIN supporter_private.f16_sandbox_qa_paid_periods p
     ON p.owner_id=g.owner_id AND p.provider_subscription_id=g.predecessor_subscription_id
   WHERE g.grant_id=a.grant_id AND g.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
   JOIN supporter_private.paypal_payment_entries p
     ON p.owner_id=g.owner_id AND p.external_subscription_id=g.predecessor_subscription_id
   WHERE g.grant_id=a.grant_id AND g.owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants g
   JOIN supporter_private.paypal_verified_activation_bindings p
     ON p.owner_id=g.owner_id AND p.subscription_id=g.predecessor_subscription_id
   WHERE g.grant_id=a.grant_id AND g.owner_id=p_owner_id)
 THEN RETURN false; END IF;
 UPDATE supporter_private.f16_sandbox_qa_v2_retry_attempts
 SET provider_create_claimed_at=pg_catalog.clock_timestamp()
 WHERE owner_id=p_owner_id AND request_key=p_request_key
 AND provider_create_claimed_at IS NULL;
 RETURN FOUND;
END $fn$;

-- Enforce absolute least privilege: only server-side authenticated owner
-- composition may invoke RPCs; no one can issue grants from an RPC.
ALTER FUNCTION public.f16_qa_v2_retry_eligibility(uuid) OWNER TO postgres;
ALTER FUNCTION public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean) OWNER TO postgres;
ALTER FUNCTION public.f16_qa_v2_retry_claim_provider_create(uuid,uuid,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.f16_qa_v2_retry_eligibility(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.f16_qa_v2_retry_claim_provider_create(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_retry_eligibility(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.f16_qa_v2_retry_claim_provider_create(uuid,uuid,text) TO service_role;

DO $post$
BEGIN
 IF EXISTS (SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_grants)
 OR EXISTS (SELECT 1 FROM supporter_private.f16_sandbox_qa_v2_retry_attempts)
 OR public.f16_qa_v2_retry_eligibility('11111111-1111-4111-8111-111111111111'::uuid)
 OR pg_catalog.has_function_privilege('authenticated','public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR pg_catalog.has_function_privilege('anon','public.f16_qa_v2_retry_begin_checkout(uuid,uuid,text,text,text,boolean)','EXECUTE')
 OR pg_catalog.has_table_privilege('service_role','supporter_private.f16_sandbox_qa_v2_retry_grants','INSERT')
 THEN RAISE EXCEPTION 'F16 retry migration postflight failed' USING ERRCODE='42501'; END IF;
END $post$;
COMMIT;
