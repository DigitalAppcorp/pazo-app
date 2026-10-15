-- F16-P12: STAGED INSTALLATION CANDIDATE, NOT AN APPLIED MIGRATION.
-- Generated verbatim from P06, P08 and P10 disposable PostgreSQL drafts.
-- NEVER run by itself. No hosted DDL GO was given; no legal offers inserted.
-- Must be promoted using an actual Supabase CLI migration new version,
-- after independent PO authorization, data retention review, and scoped audit.
-- The session gate below is a mistake guard, NOT an authorization system.
BEGIN;
DO $p12_gate$
DECLARE g text := current_setting('pazo.f16_p12_go',true);
BEGIN
 IF NOT (
   (current_database()='f14_synthetic' AND session_user='f14_admin'
    AND current_user='postgres' AND g='DISPOSABLE_P12_LAB_ONLY')
   OR
   (current_database()='postgres' AND session_user='postgres'
    AND current_user='postgres' AND g='PO_APPROVED_P12_HOSTED_SCHEMA_ONLY')
 ) THEN
  RAISE EXCEPTION 'P12 refuses unapproved context; no hosted SQL GO'
    USING ERRCODE='42501';
 END IF;
 IF to_regclass('supporter_private.paypal_subscription_intents') IS NULL
  OR to_regclass('supporter_private.paypal_verified_event_inbox') IS NULL
  OR to_regclass('supporter_private.paypal_payment_entries') IS NULL
  OR to_regclass('supporter_private.paypal_payment_reversals') IS NULL
  OR to_regnamespace('supporter_private') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pgcrypto')
  OR to_regprocedure('extensions.digest(text,text)') IS NULL
 THEN
  RAISE EXCEPTION 'P12 prerequisite private schema/pgcrypto unavailable'
   USING ERRCODE='55000';
 END IF;
 IF to_regclass('supporter_private.paypal_p06_offers') IS NOT NULL
  OR to_regclass('supporter_private.paypal_p06_checkout_attempts') IS NOT NULL
  OR to_regprocedure('public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)') IS NOT NULL
  OR to_regprocedure('public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)') IS NOT NULL
 THEN
  RAISE EXCEPTION 'P12 already installed or partially present; manual reconciliation'
   USING ERRCODE='55000';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM pg_constraint WHERE conrelid=
   'supporter_private.paypal_subscription_intents'::regclass
   AND contype='u' AND pg_get_constraintdef(oid) LIKE '%external_subscription_id%'
 ) THEN
  RAISE EXCEPTION 'P12 external subscription uniqueness missing'
   USING ERRCODE='55000';
 END IF;
END
$p12_gate$;

-- 01 P06+P07 immutable bilingual offer, consent and single POST claim
-- PAZO F16-P06 | durable offer & idempotent checkout consent: DO NOT APPLY.
-- Nonproduction PostgreSQL fixture ONLY. No offer is published or charge made.
-- A separate legal/PO GO is mandatory to publish exact ES/EN renewal terms
-- and a separate hosted SQL GO is mandatory to install this schema.

CREATE TABLE supporter_private.paypal_p06_offers (
 version text NOT NULL,
 locale text NOT NULL CHECK(locale IN ('es','en')),
 exact_copy text NOT NULL CHECK(length(exact_copy) BETWEEN 100 AND 12000),
 sha256 text GENERATED ALWAYS AS (
  pg_catalog.encode(extensions.digest(exact_copy,'sha256'),'hex')) STORED,
 plan_id text NOT NULL CHECK(plan_id='P-14V25407JP6850922NLHMDKI'),
 currency text NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 price_minor integer NOT NULL DEFAULT 299 CHECK(price_minor=299),
 cadence text NOT NULL DEFAULT 'MONTH_1' CHECK(cadence='MONTH_1'),
 published_at timestamptz,
 PRIMARY KEY(version,locale),
 CHECK(version ~ '^pazo-supporter-[a-z0-9.-]{3,40}$')
);
-- After publication, the exact wording and digest are immutable.
-- To correct a document, insert a NEW version; never rewrite evidence.
CREATE FUNCTION supporter_private.f16_p06_forbid_published_offer_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $immutable$
BEGIN
 IF OLD.published_at IS NOT NULL THEN
  RAISE EXCEPTION 'Published recurring offer must remain immutable'
   USING ERRCODE='42501';
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END
$immutable$;
REVOKE ALL ON FUNCTION
 supporter_private.f16_p06_forbid_published_offer_mutation()
 FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER f16_p06_published_offer_immutable
 BEFORE UPDATE OR DELETE
 ON supporter_private.paypal_p06_offers
 FOR EACH ROW
 EXECUTE FUNCTION supporter_private.f16_p06_forbid_published_offer_mutation();

ALTER TABLE supporter_private.paypal_p06_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_p06_offers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_p06_offers
 FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE supporter_private.paypal_p06_checkout_attempts (
 owner_id uuid NOT NULL,
 request_key uuid NOT NULL,
 intent_id text NOT NULL UNIQUE
  REFERENCES supporter_private.paypal_subscription_intents(intent_id),
 locale text NOT NULL,
 terms_version text NOT NULL,
 terms_sha256 text NOT NULL CHECK(terms_sha256 ~ '^[0-9a-f]{64}$'),
 consented_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 -- One-way durable permission for exactly one attempted PayPal POST.
 provider_create_claimed_at timestamptz,
 retention_hold boolean NOT NULL DEFAULT true,
 PRIMARY KEY(owner_id,request_key),
 FOREIGN KEY(terms_version,locale)
  REFERENCES supporter_private.paypal_p06_offers(version,locale)
);
-- One checkout record per account in this first release. This is deliberate;
-- later cancellation/re-subscribe needs a separate verified lifecycle gate.
CREATE UNIQUE INDEX p06_one_checkout_per_owner
 ON supporter_private.paypal_p06_checkout_attempts(owner_id);
ALTER TABLE supporter_private.paypal_p06_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_p06_checkout_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_p06_checkout_attempts
 FROM PUBLIC,anon,authenticated,service_role;

-- Offering copy is a backend-authored, published document, never a URL, terms
-- text or hash chosen by the user. No PII appears in the returned document.
CREATE FUNCTION public.f16_p06_read_published_offer(p_locale text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $offer$
 SELECT pg_catalog.jsonb_build_object(
  'version',o.version,'locale',o.locale,'exactCopy',o.exact_copy,
  'termsDigest',o.sha256,'priceMinor',o.price_minor,
  'currency',o.currency,'cadence',o.cadence)
 FROM supporter_private.paypal_p06_offers o
 WHERE p_locale IN('es','en') AND o.locale=p_locale
  AND o.published_at IS NOT NULL
  -- The launch version must exist in BOTH languages before either offer
  -- may be shown or signed; prevent a single-locale accidental release.
  AND EXISTS (
    SELECT 1 FROM supporter_private.paypal_p06_offers counterpart
    WHERE counterpart.version=o.version AND counterpart.locale<>o.locale
      AND counterpart.published_at IS NOT NULL
      AND counterpart.plan_id=o.plan_id
      AND counterpart.currency=o.currency
      AND counterpart.price_minor=o.price_minor
      AND counterpart.cadence=o.cadence
  )
 ORDER BY o.published_at DESC
 LIMIT 1
$offer$;

CREATE FUNCTION public.f16_p06_begin_checkout(
 p_owner_id uuid,p_request_key uuid,p_locale text,
 p_terms_version text,p_terms_digest text,p_affirmative boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $begin$
DECLARE
 existing supporter_private.paypal_p06_checkout_attempts%ROWTYPE;
 stored supporter_private.paypal_subscription_intents%ROWTYPE;
 offer supporter_private.paypal_p06_offers%ROWTYPE;
 new_id text;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL OR
  p_locale NOT IN('es','en') OR p_affirmative IS DISTINCT FROM true OR
  p_terms_version IS NULL OR p_terms_digest IS NULL OR
  p_terms_digest !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'Explicit checkout consent or input missing'
 USING ERRCODE='22023'; END IF;
 -- The caller must be service_role with a Supabase Auth getUser() proof.
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_owner_id)
 THEN RAISE EXCEPTION 'Unknown owner' USING ERRCODE='42501'; END IF;
 -- Serialize all checkout attempts per same owner in one transaction.
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text, 0));
 SELECT * INTO existing FROM supporter_private.paypal_p06_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF existing.locale<>p_locale OR
    existing.terms_version<>p_terms_version OR
    existing.terms_sha256<>p_terms_digest THEN
   RAISE EXCEPTION 'Checkout idempotency-key reused with changed terms'
    USING ERRCODE='22023';
  END IF;
  SELECT * INTO stored FROM supporter_private.paypal_subscription_intents
   WHERE intent_id=existing.intent_id AND owner_id=p_owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lost private checkout binding'
    USING ERRCODE='23503'; END IF;
  RETURN pg_catalog.jsonb_build_object(
   'intentId',stored.intent_id,'ownerId',stored.owner_id,
   'planId',stored.plan_id,'requestKey',existing.request_key,
   'locale',existing.locale,'termsVersion',existing.terms_version,
   'termsDigest',existing.terms_sha256,'createdAt',existing.created_at,
   'state',stored.state);
 END IF;
 -- Block a different key or a preexisting test subscription for this owner.
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_p06_checkout_attempts
  WHERE owner_id=p_owner_id)
 OR EXISTS(SELECT 1 FROM supporter_private.paypal_subscription_intents
  WHERE owner_id=p_owner_id AND state IN('pending','bound')) THEN
  RAISE EXCEPTION 'Checkout already exists for this account'
   USING ERRCODE='23505'; END IF;
 SELECT * INTO offer FROM supporter_private.paypal_p06_offers
 WHERE version=p_terms_version AND locale=p_locale
  AND published_at IS NOT NULL AND sha256=p_terms_digest
  AND plan_id='P-14V25407JP6850922NLHMDKI' AND price_minor=299
  AND EXISTS (
    SELECT 1 FROM supporter_private.paypal_p06_offers counterpart
    WHERE counterpart.version=p_terms_version
      AND counterpart.locale<>p_locale
      AND counterpart.published_at IS NOT NULL
      AND counterpart.plan_id='P-14V25407JP6850922NLHMDKI'
      AND counterpart.currency='USD'
      AND counterpart.price_minor=299
      AND counterpart.cadence='MONTH_1'
  );
 IF NOT FOUND THEN RAISE EXCEPTION 'Offer terms not published'
  USING ERRCODE='42501'; END IF;
 new_id:='intent-'||pg_catalog.gen_random_uuid()::text;
 INSERT INTO supporter_private.paypal_subscription_intents
  (intent_id,owner_id,provider,plan_id,state)
 VALUES(new_id,p_owner_id,'paypal','P-14V25407JP6850922NLHMDKI','pending');
 INSERT INTO supporter_private.paypal_p06_checkout_attempts
  (owner_id,request_key,intent_id,locale,terms_version,terms_sha256)
 VALUES(p_owner_id,p_request_key,new_id,p_locale,p_terms_version,p_terms_digest);
 RETURN pg_catalog.jsonb_build_object(
  'intentId',new_id,'ownerId',p_owner_id,
  'planId','P-14V25407JP6850922NLHMDKI','requestKey',p_request_key,
  'locale',p_locale,'termsVersion',p_terms_version,
  'termsDigest',p_terms_digest,'createdAt',pg_catalog.clock_timestamp(),
  'state','pending');
END
$begin$;

-- Atomic, single-use authorization before one PayPal POST. No reset on error.
CREATE FUNCTION public.f16_p07_claim_provider_create(
 p_owner_id uuid,p_request_key uuid,p_intent_id text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $claim$
DECLARE
 attempt supporter_private.paypal_p06_checkout_attempts%ROWTYPE;
 linked supporter_private.paypal_subscription_intents%ROWTYPE;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL OR
    p_intent_id IS NULL OR
    p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
 THEN RAISE EXCEPTION 'Invalid private provider create claim'
  USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text,0));
 SELECT * INTO attempt FROM supporter_private.paypal_p06_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND OR attempt.intent_id<>p_intent_id OR
    attempt.provider_create_claimed_at IS NOT NULL THEN
  RETURN false;
 END IF;
 SELECT * INTO linked FROM supporter_private.paypal_subscription_intents
 WHERE intent_id=p_intent_id AND owner_id=p_owner_id FOR UPDATE;
 IF NOT FOUND OR linked.state<>'pending' OR
    linked.plan_id<>'P-14V25407JP6850922NLHMDKI' OR
    linked.provider<>'paypal' THEN RETURN false; END IF;
 UPDATE supporter_private.paypal_p06_checkout_attempts
 SET provider_create_claimed_at=pg_catalog.clock_timestamp()
 WHERE owner_id=p_owner_id AND request_key=p_request_key
   AND provider_create_claimed_at IS NULL;
 RETURN FOUND;
END
$claim$;
REVOKE ALL ON FUNCTION public.f16_p07_claim_provider_create(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p07_claim_provider_create(uuid,uuid,text)
 TO service_role;

REVOKE ALL ON FUNCTION public.f16_p06_read_published_offer(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p06_read_published_offer(text)
 TO service_role;
REVOKE ALL ON FUNCTION public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)
 TO service_role;

-- 02 P08 private read-only recovery
-- PAZO F16-P08: read-only recovery of a single private checkout.
-- DRAFT: ONLY for disposable PostgreSQL in CI. DO NOT APPLY to hosted.

-- Auth is established independently by the Edge server using getUser().
-- Only the service-role caller passes the verified owner ID.
-- This returns references to SERVER code only, never a browser response.
CREATE FUNCTION public.f16_p08_read_checkout_recovery(
 p_owner_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $read$
 SELECT pg_catalog.jsonb_build_object(
  'ownerId',a.owner_id,'requestKey',a.request_key,
  'intentId',i.intent_id,'planId',i.plan_id,
  'state',i.state,
  'providerCreateClaimed',a.provider_create_claimed_at IS NOT NULL,
  'providerCreateClaimedAt',a.provider_create_claimed_at,
  'subscriptionId',CASE WHEN i.state='bound'
    THEN i.external_subscription_id ELSE NULL END
 )
 FROM supporter_private.paypal_p06_checkout_attempts a
 INNER JOIN supporter_private.paypal_subscription_intents i
 ON i.intent_id=a.intent_id AND i.owner_id=a.owner_id
 WHERE p_owner_id IS NOT NULL AND p_request_key IS NOT NULL
 AND a.owner_id=p_owner_id AND a.request_key=p_request_key
 AND i.plan_id='P-14V25407JP6850922NLHMDKI' AND i.provider='paypal'
 AND i.state IN('pending','bound')
 LIMIT 1
$read$;

REVOKE ALL ON FUNCTION public.f16_p08_read_checkout_recovery(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p08_read_checkout_recovery(uuid,uuid)
 TO service_role;

-- 03 P10 review-gated recovered ID binding
-- PAZO F16-P10 — recovered pending subscription binding, disposable ONLY.
-- Strictly draft; DB CANNOT verify PayPal responses or operator approvals.
-- Must NEVER be applied to hosted Supabase without separate explicit PO GO.

CREATE FUNCTION public.f16_p10_bind_recovered_checkout(
 p_owner_id uuid,p_request_key uuid,p_intent_id text,p_subscription_id text
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $bind$
DECLARE
 a supporter_private.paypal_p06_checkout_attempts%ROWTYPE;
 i supporter_private.paypal_subscription_intents%ROWTYPE;
BEGIN
 IF p_owner_id IS NULL OR p_request_key IS NULL OR
    p_intent_id IS NULL OR
    p_intent_id !~ '^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR p_subscription_id IS NULL OR
    p_subscription_id !~ '^I-[A-Za-z0-9_-]{3,70}$'
 THEN RAISE EXCEPTION 'Invalid private recovered binding' USING ERRCODE='22023';
 END IF;

 -- Serialize every prospective checkout and recovery per owner.
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text,0));
 SELECT * INTO a
 FROM supporter_private.paypal_p06_checkout_attempts
 WHERE owner_id=p_owner_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND OR a.intent_id IS DISTINCT FROM p_intent_id
 OR a.provider_create_claimed_at IS NULL OR
 a.provider_create_claimed_at > pg_catalog.clock_timestamp() + interval '1 minute'
 THEN RAISE EXCEPTION 'Recovery claim absent or inconsistent'
  USING ERRCODE='22023'; END IF;

 SELECT * INTO i FROM supporter_private.paypal_subscription_intents
 WHERE intent_id=p_intent_id AND owner_id=p_owner_id FOR UPDATE;
 IF NOT FOUND OR i.provider<>'paypal' OR
    i.plan_id<>'P-14V25407JP6850922NLHMDKI'
 THEN RAISE EXCEPTION 'Recovery owner/plan mismatch' USING ERRCODE='22023'; END IF;
 IF i.state='bound' THEN
  IF i.external_subscription_id IS DISTINCT FROM p_subscription_id
  THEN RAISE EXCEPTION 'Recovery already bound to another subscription'
    USING ERRCODE='22023'; END IF;
  RETURN 'already_bound';
 END IF;
 IF i.state<>'pending' OR i.external_subscription_id IS NOT NULL
 THEN RAISE EXCEPTION 'Recovery intent not pending' USING ERRCODE='22023'; END IF;
 -- Uniqueness on external_subscription_id in both disposable fixture and
 -- hosted schema prevents cross-intent duplicate assignment, including races.
 BEGIN
  UPDATE supporter_private.paypal_subscription_intents
  SET state='bound', external_subscription_id=p_subscription_id,
      bound_at=pg_catalog.clock_timestamp()
  WHERE intent_id=p_intent_id AND owner_id=p_owner_id AND state='pending';
 EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Recovery subscription already claimed' USING ERRCODE='22023';
 END;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Concurrent recovery state conflict' USING ERRCODE='22023';
 END IF;
 -- Binding is identity correlation ONLY, not sale, entitlement or paid period.
 RETURN 'new_binding';
END
$bind$;
REVOKE ALL ON FUNCTION public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)
 TO service_role;


-- Validate all grants AFTER staging, in the very same transaction.
DO $p12_post$
DECLARE r text; v oid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class c WHERE
    c.oid='supporter_private.paypal_p06_offers'::regclass
    AND c.relrowsecurity AND c.relforcerowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_class c WHERE
    c.oid='supporter_private.paypal_p06_checkout_attempts'::regclass
    AND c.relrowsecurity AND c.relforcerowsecurity)
 THEN RAISE EXCEPTION 'P12 missing FORCE RLS'; END IF;
 IF (SELECT count(*) FROM supporter_private.paypal_p06_offers)<>0
 OR (SELECT count(*) FROM supporter_private.paypal_p06_checkout_attempts)<>0
 THEN RAISE EXCEPTION 'P12 must not publish or create checkout'; END IF;
 IF has_table_privilege('anon','supporter_private.paypal_p06_offers','SELECT')
 OR has_table_privilege('authenticated','supporter_private.paypal_p06_offers','SELECT')
 OR has_table_privilege('service_role','supporter_private.paypal_p06_offers','SELECT')
 OR has_table_privilege('anon','supporter_private.paypal_p06_checkout_attempts','SELECT')
 OR has_table_privilege('authenticated','supporter_private.paypal_p06_checkout_attempts','SELECT')
 OR has_table_privilege('service_role','supporter_private.paypal_p06_checkout_attempts','SELECT')
 THEN RAISE EXCEPTION 'P12 exposed private financial table'; END IF;
 FOREACH r IN ARRAY ARRAY[
  'public.f16_p06_read_published_offer(text)',
  'public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)',
  'public.f16_p07_claim_provider_create(uuid,uuid,text)',
  'public.f16_p08_read_checkout_recovery(uuid,uuid)',
  'public.f16_p10_bind_recovered_checkout(uuid,uuid,text,text)'
 ] LOOP
  v:=to_regprocedure(r);
  IF v IS NULL OR has_function_privilege('anon',v,'EXECUTE')
    OR has_function_privilege('authenticated',v,'EXECUTE')
    OR NOT has_function_privilege('service_role',v,'EXECUTE')
  THEN RAISE EXCEPTION 'P12 invalid service-only RPC grants'; END IF;
 END LOOP;
 IF supporter_private.wall_has_verified_entitlement(NULL::uuid) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'P12 unexpectedly unlocked entitlements'; END IF;
END
$p12_post$;
COMMIT;
