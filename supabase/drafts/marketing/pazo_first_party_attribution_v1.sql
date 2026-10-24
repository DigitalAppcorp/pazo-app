-- PAZO Marketing Brain / F17.
-- STAGED DRAFT — NOT A SUPABASE MIGRATION; never apply to hosted DB.
-- This file requires a future versioned migration created with Supabase CLI and
-- a separate PO GO for privacy/retention, installation and collection.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS marketing_private;
REVOKE ALL ON SCHEMA marketing_private FROM PUBLIC, anon, authenticated, service_role;

-- A single operator-owned switch. Default OFF. No UI, browser role or service
-- role is granted access, and there is no hosted worker using this table.
CREATE TABLE marketing_private.collection_gate (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 enabled boolean NOT NULL DEFAULT false,
 enabled_at timestamptz,
 CONSTRAINT gate_consistency CHECK ((NOT enabled AND enabled_at IS NULL) OR (enabled AND enabled_at IS NOT NULL))
);
INSERT INTO marketing_private.collection_gate(singleton,enabled) VALUES(true,false);
ALTER TABLE marketing_private.collection_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.collection_gate FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.collection_gate FROM PUBLIC, anon, authenticated, service_role;

-- One attribution per account, no name, email, GPS, token, click identifier,
-- payment data, pet ID, full URL or events ledger. First-party and minimized.
CREATE TABLE marketing_private.acquisition (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 source text NOT NULL DEFAULT 'meta' CHECK(source='meta'),
 medium text NOT NULL DEFAULT 'paid_social' CHECK(medium='paid_social'),
 campaign text NOT NULL CHECK(campaign='pazo_beta_local_202610'),
 creative text NOT NULL CHECK(creative IN(
   'perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'
 )),
 first_touch_at timestamptz NOT NULL,
 signup_verified_at timestamptz NOT NULL,
 consent_recorded_at timestamptz NOT NULL,
 consent_version text NOT NULL CHECK(consent_version='pazo-marketing-optin-v1'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT attribution_window CHECK (
   first_touch_at <= signup_verified_at + interval '5 minutes'
   AND signup_verified_at <= first_touch_at + interval '72 hours'
   AND consent_recorded_at BETWEEN first_touch_at - interval '5 minutes'
     AND signup_verified_at + interval '5 minutes'
 )
);
CREATE INDEX acquisition_signup_cohort_idx ON marketing_private.acquisition (signup_verified_at, campaign, creative);
ALTER TABLE marketing_private.acquisition ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.acquisition FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.acquisition FROM PUBLIC, anon, authenticated, service_role;

-- Eligibility uses LIVE, EXISTING QA lists; never take the browser's QA flag.
-- No historic account is retroactively classified real. Existing admins,
-- prebeta QA, Sandbox QA and founders are never included in paid acquisition.
CREATE FUNCTION marketing_private.is_eligible_owner(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 SELECT EXISTS (
  SELECT 1 FROM auth.users u
  JOIN public.profiles p ON p.id=u.id
  WHERE u.id=p_owner
    AND u.email_confirmed_at IS NOT NULL
    AND u.is_anonymous IS DISTINCT FROM TRUE
    AND p.is_founder IS DISTINCT FROM TRUE
 )
 AND NOT EXISTS(SELECT 1 FROM supporter_private.gradual_qa_accounts q WHERE q.owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM supporter_private.f16_sandbox_qa_owners q WHERE q.owner_id=p_owner)
 AND NOT EXISTS(SELECT 1 FROM admin_private.admin_grants a WHERE a.user_id=p_owner);
$$;
REVOKE ALL ON FUNCTION marketing_private.is_eligible_owner(uuid)
 FROM PUBLIC, anon, authenticated, service_role;

-- Privileged INTERNAL staging function ONLY. No client/service grants or API
-- exposure; this is not an operative endpoint. Consent proof verification and
-- trusted sender binding still require implementation before any future GO.
CREATE FUNCTION marketing_private.record_verified_acquisition(
 p_owner uuid, p_creative text, p_first_touch_at timestamptz,
 p_consent_recorded_at timestamptz, p_consent_version text
) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
 v_created timestamptz;
 v_verified timestamptz;
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM marketing_private.collection_gate g
  WHERE g.singleton AND g.enabled
 ) THEN RETURN FALSE; END IF;
 IF p_owner IS NULL OR p_creative IS NULL OR p_first_touch_at IS NULL
    OR p_consent_recorded_at IS NULL OR p_consent_version IS NULL
    OR p_creative NOT IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')
    OR p_consent_version <> 'pazo-marketing-optin-v1'
    OR NOT marketing_private.is_eligible_owner(p_owner) THEN
   RETURN FALSE;
 END IF;
 SELECT u.created_at,u.email_confirmed_at INTO v_created,v_verified
 FROM auth.users u WHERE u.id=p_owner;
 IF v_created IS NULL OR v_verified IS NULL OR
    v_created < p_first_touch_at - interval '5 minutes' OR
    v_created > p_first_touch_at + interval '72 hours' OR
    v_verified > p_first_touch_at + interval '72 hours' OR
    v_verified > statement_timestamp() + interval '5 minutes' OR
    p_first_touch_at > statement_timestamp() + interval '5 minutes' OR
    p_first_touch_at < statement_timestamp() - interval '72 hours' OR
    p_consent_recorded_at < p_first_touch_at - interval '5 minutes' OR
    p_consent_recorded_at > v_verified + interval '5 minutes'
 THEN RETURN FALSE; END IF;
 INSERT INTO marketing_private.acquisition(
   owner_id,campaign,creative,first_touch_at,signup_verified_at,
   consent_recorded_at,consent_version
 ) VALUES (
   p_owner,'pazo_beta_local_202610',p_creative,p_first_touch_at,v_verified,
   p_consent_recorded_at,p_consent_version
 )
 ON CONFLICT (owner_id) DO NOTHING;
 RETURN FOUND;
END
$$;
REVOKE ALL ON FUNCTION marketing_private.record_verified_acquisition(uuid,text,timestamptz,timestamptz,text)
 FROM PUBLIC, anon, authenticated, service_role;

-- Private cohort reader. First pet is derived from public.pets; the D7 column
-- is ONLY a screen-activity proxy, not verified meaningful retention.
-- Suppression of QA takes effect retroactively on reports.
CREATE FUNCTION marketing_private.cohort_snapshot()
RETURNS TABLE(
 cohort_day date,
 campaign text,
 creative text,
 verified_owners bigint,
 first_pet_within_7d bigint,
 d7_matured_owners bigint,
 d7_screen_activity_proxy bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 WITH eligible AS (
  SELECT a.owner_id, a.campaign, a.creative, a.signup_verified_at,
         (a.signup_verified_at AT TIME ZONE 'America/Los_Angeles')::date AS cd
  FROM marketing_private.acquisition a
  WHERE marketing_private.is_eligible_owner(a.owner_id)
 ), per_owner AS (
  SELECT e.*,
   EXISTS (
    SELECT 1 FROM public.pets p
    WHERE p.owner_id=e.owner_id
      AND p.created_at>=e.signup_verified_at
      AND p.created_at<e.signup_verified_at+interval '7 days'
   ) AS has_first_pet,
   EXISTS (
    SELECT 1 FROM admin_private.app_activity_daily d
    WHERE d.user_id=e.owner_id
      AND d.activity_day=e.cd+7
      AND d.module_key IN('inicio','comunidades','mapa','mascota','explore')
   ) AS d7_screen_proxy
  FROM eligible e
 )
 SELECT cd,campaign,creative,count(*)::bigint,
  count(*) FILTER(WHERE has_first_pet)::bigint,
  count(*) FILTER(WHERE cd+7 < (now() AT TIME ZONE 'America/Los_Angeles')::date)::bigint,
  count(*) FILTER(WHERE d7_screen_proxy
    AND cd+7 < (now() AT TIME ZONE 'America/Los_Angeles')::date)::bigint
 FROM per_owner
 GROUP BY cd,campaign,creative;
$$;
REVOKE ALL ON FUNCTION marketing_private.cohort_snapshot()
 FROM PUBLIC, anon, authenticated, service_role;

-- New objects inherit defaults in some hosts; explicitly revoke.
REVOKE ALL ON ALL TABLES IN SCHEMA marketing_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA marketing_private FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
