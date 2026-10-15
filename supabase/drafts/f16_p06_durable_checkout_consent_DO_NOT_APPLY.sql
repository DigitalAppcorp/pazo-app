-- PAZO F16-P06 | durable offer & idempotent checkout consent: DO NOT APPLY.
-- Nonproduction PostgreSQL fixture ONLY. No offer is published or charge made.
-- A separate legal/PO GO is mandatory to publish exact ES/EN renewal terms
-- and a separate hosted SQL GO is mandatory to install this schema.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database()<>'f14_synthetic' OR session_user<>'f14_admin'
  OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'P06 checkout SQL draft: disposable-only'
   USING ERRCODE='42501'; END IF;
 IF to_regclass('supporter_private.paypal_subscription_intents') IS NULL
 THEN RAISE EXCEPTION 'P06 missing existing private intent schema'; END IF;
END
$guard$;

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
ALTER TABLE supporter_private.paypal_p06_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_private.paypal_p06_offers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON supporter_private.paypal_p06_offers
 FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE supporter_private.paypal_p06_checkout_attempts (
 owner_id uuid NOT NULL REFERENCES auth.users(id),
 request_key uuid NOT NULL,
 intent_id text NOT NULL UNIQUE
  REFERENCES supporter_private.paypal_subscription_intents(intent_id),
 locale text NOT NULL,
 terms_version text NOT NULL,
 terms_sha256 text NOT NULL CHECK(terms_sha256 ~ '^[0-9a-f]{64}$'),
 consented_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
 created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
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
  AND plan_id='P-14V25407JP6850922NLHMDKI' AND price_minor=299;
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

REVOKE ALL ON FUNCTION public.f16_p06_read_published_offer(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p06_read_published_offer(text)
 TO service_role;
REVOKE ALL ON FUNCTION public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.f16_p06_begin_checkout(uuid,uuid,text,text,text,boolean)
 TO service_role;
COMMIT;
