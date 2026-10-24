-- PAZO Marketing Brain / F17.
-- VERSIONED SQL CREATED WITH VERIFIED SUPABASE CLI STUB (run 40052740127).
-- NOT APPLIED / NOT AUTHORIZED for hosted Supabase. The migration is prepared
-- only on PR #91; explicit PO GO, privacy/retention review and verification
-- are required before installation. Data collection defaults OFF.
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
 -- Zero means no retention policy has been approved. Upper bound is a
 -- defensive technical ceiling, not a Product Owner-approved duration.
 retention_days smallint NOT NULL DEFAULT 0 CHECK(retention_days BETWEEN 0 AND 90),
 policy_version text,
 CONSTRAINT gate_consistency CHECK (
   (NOT enabled AND enabled_at IS NULL)
   OR (enabled AND enabled_at IS NOT NULL
      AND retention_days > 0
      AND policy_version='pazo-marketing-attribution-notice-v1')
 )
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
 notice_version text NOT NULL CHECK(notice_version='pazo-marketing-attribution-notice-v1'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT attribution_window CHECK (
   first_touch_at <= signup_verified_at + interval '5 minutes'
   AND signup_verified_at <= first_touch_at + interval '72 hours'
   AND signup_verified_at <= recorded_at + interval '5 minutes'
 )
);
CREATE INDEX acquisition_signup_cohort_idx ON marketing_private.acquisition (signup_verified_at, campaign, creative);
ALTER TABLE marketing_private.acquisition ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.acquisition FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.acquisition FROM PUBLIC, anon, authenticated, service_role;

-- Non-identifying daily landing SIGNALS, not unique people.
-- No IP, cookie ID, device ID, user ID, querystring or event rows.
-- Browser limits repeat pings locally; hostile scripted pings can still inflate.
CREATE TABLE marketing_private.landing_daily (
 landing_day date NOT NULL,
 campaign text NOT NULL DEFAULT 'pazo_beta_local_202610'
  CHECK(campaign='pazo_beta_local_202610'),
 creative text NOT NULL CHECK(creative IN(
   'perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'
 )),
 signals bigint NOT NULL DEFAULT 0 CHECK(signals >= 0),
 PRIMARY KEY (landing_day, campaign, creative)
);
ALTER TABLE marketing_private.landing_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.landing_daily FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.landing_daily FROM PUBLIC,anon,authenticated,service_role;

-- Ephemeral, anonymous global per-creative burst budget. NO IP, identity,
-- token or visitor pseudonym. The counter is not evidence of a real human.
-- It only caps server-side writes; a hostile script can exhaust the budget.
CREATE TABLE marketing_private.landing_minute_budget (
 minute_utc timestamptz NOT NULL,
 creative text NOT NULL CHECK(creative IN(
  'perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'
 )),
 accepted integer NOT NULL DEFAULT 0 CHECK(accepted BETWEEN 0 AND 30),
 PRIMARY KEY(minute_utc,creative)
);
ALTER TABLE marketing_private.landing_minute_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.landing_minute_budget FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.landing_minute_budget
 FROM PUBLIC,anon,authenticated,service_role;

-- RPC callable ONLY with service_role server secret. The bridge's definer
-- cannot be a browser role. Gate OFF -> zero writes; date is SQL clock.
-- No unique-visitor claim and no external traffic-source verification.
CREATE FUNCTION public.pazo_marketing_record_landing_v1(p_creative text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $mkt_landing_bounded$
DECLARE v_accepted integer; v_total bigint;
BEGIN
 IF p_creative IS NULL OR p_creative NOT IN(
   'perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en'
 ) OR NOT EXISTS(
  SELECT 1 FROM marketing_private.collection_gate
  WHERE singleton AND enabled AND retention_days > 0
 ) THEN RETURN FALSE; END IF;

 -- Both counters live in ONE subtransaction. Exceeding either ceiling must
 -- roll back BOTH writes, including concurrent ON CONFLICT updates.
 BEGIN
  INSERT INTO marketing_private.landing_minute_budget(minute_utc,creative,accepted)
  VALUES(date_trunc('minute',statement_timestamp()),p_creative,1)
  ON CONFLICT(minute_utc,creative) DO UPDATE
    SET accepted=marketing_private.landing_minute_budget.accepted+1
    WHERE marketing_private.landing_minute_budget.accepted < 30
  RETURNING accepted INTO v_accepted;
  IF NOT FOUND THEN RAISE EXCEPTION 'rate_capacity'
     USING ERRCODE='PZ001'; END IF;

  INSERT INTO marketing_private.landing_daily(landing_day,campaign,creative,signals)
  VALUES(
   (statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date,
   'pazo_beta_local_202610',p_creative,1
  )
  ON CONFLICT(landing_day,campaign,creative) DO UPDATE
    SET signals=marketing_private.landing_daily.signals+1
    WHERE marketing_private.landing_daily.signals < 3000
  RETURNING signals INTO v_total;
  IF NOT FOUND THEN RAISE EXCEPTION 'daily_capacity'
     USING ERRCODE='PZ001'; END IF;
 EXCEPTION WHEN SQLSTATE 'PZ001' THEN
  RETURN FALSE;
 END;
 RETURN TRUE;
END
$mkt_landing_bounded$;
REVOKE ALL ON FUNCTION public.pazo_marketing_record_landing_v1(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_record_landing_v1(text)
 TO service_role;

-- Landing counters are aggregate; only granular daily rows older than an
-- APPROVED retention window are deleted. OFF (0) -> no purge.
CREATE FUNCTION public.pazo_marketing_prune_landing_v1()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $mkt_block_2$
DECLARE v_days smallint; v_count integer; v_window_count integer;
BEGIN
 SELECT retention_days INTO v_days
 FROM marketing_private.collection_gate WHERE singleton;
 v_count:=0;
 IF v_days IS NOT NULL AND v_days > 0 THEN
  DELETE FROM marketing_private.landing_daily
  WHERE landing_day < (
   (statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-v_days
  );
  GET DIAGNOSTICS v_count=ROW_COUNT;
 END IF;
 -- Minute buckets have a fixed 48-hour safety lifecycle irrespective of
 -- the approved attribution retention period, and are never user-linked.
 DELETE FROM marketing_private.landing_minute_budget
 WHERE minute_utc < statement_timestamp()-interval '48 hours';
 GET DIAGNOSTICS v_window_count=ROW_COUNT;
 RETURN v_count+v_window_count;
END
$mkt_block_2$;
REVOKE ALL ON FUNCTION public.pazo_marketing_prune_landing_v1()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_prune_landing_v1()
 TO service_role;

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

-- Private staging function. Server stores only the approved notice version;
-- no browser consent timestamp, ID or freely chosen version is accepted.
-- Release requires an accurate published collection notice and retention GO.
-- This is not an operative endpoint while collection is OFF.
CREATE FUNCTION marketing_private.record_verified_acquisition(
 p_owner uuid, p_creative text, p_first_touch_at timestamptz
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
    OR p_creative NOT IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')
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
    statement_timestamp() < v_verified OR
    statement_timestamp() > p_first_touch_at + interval '72 hours'
 THEN RETURN FALSE; END IF;
 INSERT INTO marketing_private.acquisition(
   owner_id,campaign,creative,first_touch_at,signup_verified_at,
   notice_version
 ) VALUES (
   p_owner,'pazo_beta_local_202610',p_creative,p_first_touch_at,v_verified,
   'pazo-marketing-attribution-notice-v1'
 )
 ON CONFLICT (owner_id) DO NOTHING;
 RETURN FOUND;
END
$$;
REVOKE ALL ON FUNCTION marketing_private.record_verified_acquisition(uuid,text,timestamptz)
 FROM PUBLIC, anon, authenticated, service_role;

-- SERVICE-ONLY PostgREST bridge, uninstalled and gated OFF. Explicit
-- SECURITY DEFINER is required here because service_role has NO access to
-- marketing_private or the other private QA tables. This function never
-- enables the gate, derives verification from auth.users, and cannot be
-- called by anon/authenticated roles.
CREATE FUNCTION public.pazo_marketing_record_verified_v1(
 p_owner uuid, p_creative text, p_first_touch_at timestamptz
) RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT marketing_private.record_verified_acquisition(
   p_owner,p_creative,p_first_touch_at
 );
$$;
REVOKE ALL ON FUNCTION public.pazo_marketing_record_verified_v1(uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_record_verified_v1(uuid,text,timestamptz)
 TO service_role;

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
   AND a.recorded_at >= statement_timestamp()
     - make_interval(days => coalesce((
       SELECT NULLIF(g.retention_days, 0)
       FROM marketing_private.collection_gate g WHERE g.singleton
     ), 0))
   AND EXISTS (
     SELECT 1 FROM marketing_private.collection_gate g
     WHERE g.singleton AND g.retention_days > 0
   )
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

-- Private admin report. Landing *signals* are NOT unique people and are
-- independent from verified signups; no person-level conversion rate implied.
-- Existing account cohorts use their signup date and may fall on later days.
CREATE FUNCTION marketing_private.daily_campaign_summary()
RETURNS TABLE(
 metric_day date, campaign text, creative text,
 landing_signals bigint, verified_signups bigint,
 first_pet_within_7d bigint, d7_matured_owners bigint,
 d7_screen_activity_proxy bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $mkt_block_3$
 WITH arrivals AS (
  SELECT l.landing_day AS d,l.campaign,l.creative,l.signals
  FROM marketing_private.landing_daily l
  WHERE EXISTS(
   SELECT 1 FROM marketing_private.collection_gate g
   WHERE g.singleton AND g.retention_days>0
     AND l.landing_day >=
        (statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-g.retention_days
  )
 ), cohorts AS (
  SELECT c.cohort_day,c.campaign,c.creative,
         c.verified_owners,c.first_pet_within_7d,
         c.d7_matured_owners,c.d7_screen_activity_proxy
  FROM marketing_private.cohort_snapshot() c
 )
 SELECT coalesce(a.d,co.cohort_day),
        coalesce(a.campaign,co.campaign),
        coalesce(a.creative,co.creative),
        coalesce(a.signals,0)::bigint,
        coalesce(co.verified_owners,0)::bigint,
        coalesce(co.first_pet_within_7d,0)::bigint,
        coalesce(co.d7_matured_owners,0)::bigint,
        coalesce(co.d7_screen_activity_proxy,0)::bigint
 FROM arrivals a FULL OUTER JOIN cohorts co
  ON a.d=co.cohort_day AND a.campaign=co.campaign AND a.creative=co.creative;
$mkt_block_3$;
REVOKE ALL ON FUNCTION marketing_private.daily_campaign_summary()
 FROM PUBLIC,anon,authenticated,service_role;

-- Read-only ADMIN interface. This is the only browser-facing reporting
-- function. It returns strictly aggregate daily rows, never owner IDs.
-- Authentication comes from the verified database JWT (auth.uid), never
-- user-editable metadata, query parameters, or the caller's browser role.
CREATE FUNCTION public.pazo_admin_marketing_summary(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $pazo_admin_marketing$
DECLARE
 v_retention smallint;
 v_enabled boolean;
 v_data jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.pazo_is_admin() THEN
  RAISE EXCEPTION 'Admin marketing access denied' USING ERRCODE = '42501';
 END IF;
 IF p_days IS NULL OR p_days NOT IN(7,30,90) THEN
  RAISE EXCEPTION 'Unsupported marketing reporting window'
   USING ERRCODE = '22023';
 END IF;
 SELECT g.retention_days,g.enabled INTO v_retention,v_enabled
 FROM marketing_private.collection_gate g WHERE g.singleton;
 WITH reporting_rows AS (
  SELECT s.*
  FROM marketing_private.daily_campaign_summary() s
  WHERE s.metric_day BETWEEN
   ((statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-(p_days-1))
   AND (statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date
 ), summed AS (
  SELECT coalesce(sum(landing_signals),0)::bigint AS landing_signals,
   coalesce(sum(verified_signups),0)::bigint AS verified_signups,
   coalesce(sum(first_pet_within_7d),0)::bigint AS first_pet_within_7d,
   coalesce(sum(d7_matured_owners),0)::bigint AS d7_matured_owners,
   coalesce(sum(d7_screen_activity_proxy),0)::bigint AS d7_screen_activity_proxy
  FROM reporting_rows
 )
 SELECT jsonb_build_object(
  'status',CASE WHEN coalesce(v_retention,0)=0 THEN 'not_configured'
    WHEN v_enabled THEN 'collecting' ELSE 'paused' END,
  'period_days',p_days,
  'as_of',statement_timestamp(),
  'time_zone','America/Los_Angeles',
  'totals',to_jsonb(summed),
  'daily',coalesce((
    SELECT jsonb_agg(jsonb_build_object(
     'day',r.metric_day,
     'campaign',r.campaign,
     'creative',r.creative,
     'landing_signals',r.landing_signals,
     'verified_signups',r.verified_signups,
     'first_pet_within_7d',r.first_pet_within_7d,
     'd7_matured_owners',r.d7_matured_owners,
     'd7_screen_activity_proxy',r.d7_screen_activity_proxy
    ) ORDER BY r.metric_day DESC,r.creative)
    FROM reporting_rows r
  ),'[]'::jsonb)
 ) INTO v_data FROM summed;
 RETURN v_data;
END
$pazo_admin_marketing$;
REVOKE ALL ON FUNCTION public.pazo_admin_marketing_summary(integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_marketing_summary(integer)
 TO authenticated;

-- Privileged, manual lifecycle operations. There is NO scheduler or
-- external endpoint wired in this PR. Do not imply automatic purging.
-- A retention policy must be approved separately before configuring days.
CREATE FUNCTION marketing_private.prune_expired() RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
 v_days smallint;
 v_deleted integer;
BEGIN
 SELECT g.retention_days INTO v_days
 FROM marketing_private.collection_gate g WHERE g.singleton;
 IF v_days IS NULL OR v_days <= 0 THEN RETURN 0; END IF;
 DELETE FROM marketing_private.acquisition a
 WHERE a.recorded_at < statement_timestamp() - make_interval(days => v_days);
 GET DIAGNOSTICS v_deleted = ROW_COUNT;
 RETURN v_deleted;
END
$$;
REVOKE ALL ON FUNCTION marketing_private.prune_expired()
 FROM PUBLIC,anon,authenticated,service_role;

-- Withdraw removes marketing attribution only; no PayPal, post, pet or
-- account deletion. Never guess owner from an untrusted user-supplied ID.
-- Service invocation MUST be tied to verified Auth identity server-side
-- before a future revocation API/UI is enabled.
CREATE FUNCTION public.pazo_marketing_withdraw_v1(p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF p_owner IS NULL THEN RETURN FALSE; END IF;
 DELETE FROM marketing_private.acquisition WHERE owner_id = p_owner;
 RETURN TRUE;
END
$$;
REVOKE ALL ON FUNCTION public.pazo_marketing_withdraw_v1(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_withdraw_v1(uuid)
 TO service_role;

-- Expiration is not a read-side substitute for physical deletion.
-- The future operator job must invoke this function after retention is
-- approved, and account for off-site logical backups and PITR restoration.
CREATE FUNCTION public.pazo_marketing_prune_v1()
RETURNS integer
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT marketing_private.prune_expired();
$$;
REVOKE ALL ON FUNCTION public.pazo_marketing_prune_v1()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_prune_v1()
 TO service_role;

-- Single cron-friendly purge operation; both private datasets, service-only.
-- Not scheduled by migration. Operator must separately activate pg_cron
-- after approving retention, provider backup/PITR policy, and collection.
CREATE FUNCTION public.pazo_marketing_prune_all_v1()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $mkt_prune_all$
DECLARE v_acquisition integer; v_signals integer;
BEGIN
 v_acquisition := marketing_private.prune_expired();
 v_signals := public.pazo_marketing_prune_landing_v1();
 RETURN jsonb_build_object(
  'acquisition_removed',v_acquisition,
  'aggregate_or_window_rows_removed',v_signals
 );
END
$mkt_prune_all$;
REVOKE ALL ON FUNCTION public.pazo_marketing_prune_all_v1()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_prune_all_v1()
 TO service_role;

-- New objects inherit defaults in some hosts; explicitly revoke.
REVOKE ALL ON ALL TABLES IN SCHEMA marketing_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA marketing_private FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
