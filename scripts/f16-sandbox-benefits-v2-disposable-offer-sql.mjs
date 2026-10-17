// Emits SQL only for a disposable PostgreSQL 17 QA rehearsal.
// It NEVER connects to Supabase, PayPal, or publishes any real offer.
// Immutable P06 V1 terms MUST remain intact while v2 becomes the newest
// published offer for a DIFFERENT, disposable authorized QA user.
import {F16_SANDBOX_BENEFITS_OFFER_V2 as policy,
  F16_SANDBOX_BENEFITS_V2_COPY as locales} from '../src/features/supporter/sandboxBenefitsOfferV2.mjs'
import {F16_P06_SANDBOX_QA_COPY_REVIEW_ONLY as legacy} from '../src/features/supporter/sandboxQaOfferCopyP06.mjs'

if(policy.environment!=='sandbox'||policy.mayPublish!==false||
   policy.mayCreateCheckout!==false || policy.mayGrantBenefits!==false ||
   policy.version===legacy.version)throw Error('SANDBOX_QA_POLICY_RELEASE_BLOCKED')

const q=s=>"'"+s.replaceAll("'","''")+"'"
const text=`SET ROLE postgres;
BEGIN;
SET LOCAL statement_timeout='5000ms';
SET LOCAL lock_timeout='2000ms';
DO $guard$
BEGIN
 IF pg_catalog.current_database()<>'f14_synthetic'
    OR session_user<>'f14_admin' OR current_user<>'postgres'
    OR to_regclass('supporter_private.paypal_p06_offers') IS NULL
 THEN RAISE EXCEPTION 'F16 sandbox v2 SQL DISPOSABLE ONLY'
   USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_p06_offers
   WHERE version=${q(policy.version)})
 THEN RAISE EXCEPTION 'V2 already published: immutable SQL'
   USING ERRCODE='23505'; END IF;
END $guard$;
INSERT INTO supporter_private.paypal_p06_offers
 (version,locale,exact_copy,plan_id,currency,price_minor,cadence,published_at)
VALUES
 ${['es','en'].map(lang=>`(${q(policy.version)},${q(lang)},${q(locales[lang].exactCopy)},
   ${q(policy.planId)},${q(policy.currency)},${policy.priceMinor},
   ${q(policy.cadence)},pg_catalog.clock_timestamp())`).join(',\n ')};
DO $test$
DECLARE es jsonb; en jsonb;
BEGIN
 es:=public.f16_p06_read_published_offer('es');
 en:=public.f16_p06_read_published_offer('en');
 IF es->>'version'<>${q(policy.version)}
    OR en->>'version'<>${q(policy.version)}
    OR es->>'exactCopy'<>${q(locales.es.exactCopy)}
    OR en->>'exactCopy'<>${q(locales.en.exactCopy)}
    OR es->>'termsDigest' IS NULL
    OR en->>'termsDigest' IS NULL
    OR (SELECT COUNT(*) FROM supporter_private.paypal_p06_offers
       WHERE version=${q(policy.version)} AND published_at IS NOT NULL)<>2
 THEN RAISE EXCEPTION 'Sandbox v2 copy, locale or hash drift'; END IF;
 IF EXISTS(SELECT 1 FROM supporter_private.paypal_p06_checkout_attempts
     WHERE terms_version=${q(policy.version)})
 THEN RAISE EXCEPTION 'No Sandbox checkout can be fabricated by publishing an offer'; END IF;
END $test$;
COMMIT;
SELECT 'F16_SANDBOX_V2_OFFER_PG17_REHEARSAL_PASS';
`
process.stdout.write(text)
