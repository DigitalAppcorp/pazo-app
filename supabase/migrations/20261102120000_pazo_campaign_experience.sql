-- PREPARED, OFF. Tags existing anonymous counters with the validated ad creative.
-- Still no identifier, session, journey or account link. Apply alone by apply_migration, never db push.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE marketing_private.collection_gate
 ADD COLUMN campaign_experience_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN campaign_experience_started_at timestamptz,
 ADD COLUMN campaign_experience_notice_version text;
CREATE TABLE marketing_private.experience_campaign_daily(
 day date NOT NULL,creative text NOT NULL CHECK(marketing_private.campaign_for_creative(creative) IS NOT NULL),
 signal text NOT NULL CHECK(marketing_private.experience_signal_valid(signal)),
 requests integer NOT NULL CHECK(requests BETWEEN 1 AND 3000),PRIMARY KEY(day,creative,signal));
ALTER TABLE marketing_private.experience_campaign_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.experience_campaign_daily FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.experience_campaign_daily FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.campaign_experience_ready() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT marketing_private.intelligence_ready() AND coalesce((SELECT campaign_experience_enabled
 AND campaign_experience_started_at<=statement_timestamp() AND campaign_experience_notice_version='pazo-campaign-experience-notice-v1'
 FROM marketing_private.collection_gate WHERE singleton),false)
$$;

-- Both counters move together, so "without campaign" stays total minus tagged.
CREATE FUNCTION public.pazo_intelligence_experience_campaign_v1(p_creative text,p_signal text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
DECLARE today date:=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;
BEGIN
 IF p_signal IS NULL OR p_creative IS NULL OR NOT marketing_private.experience_signal_valid(p_signal)
 OR marketing_private.campaign_for_creative(p_creative) IS NULL OR NOT marketing_private.campaign_experience_ready() THEN RETURN false;END IF;
 INSERT INTO marketing_private.experience_daily VALUES(today,p_signal,1)
 ON CONFLICT(day,signal) DO UPDATE SET requests=marketing_private.experience_daily.requests+1 WHERE marketing_private.experience_daily.requests<3000;
 IF NOT FOUND THEN RETURN false;END IF;
 INSERT INTO marketing_private.experience_campaign_daily VALUES(today,p_creative,p_signal,1)
 ON CONFLICT(day,creative,signal) DO UPDATE SET requests=marketing_private.experience_campaign_daily.requests+1 WHERE marketing_private.experience_campaign_daily.requests<3000;
 RETURN FOUND;
EXCEPTION WHEN lock_not_available OR query_canceled THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.pazo_intelligence_experience_campaign_v1(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_intelligence_experience_campaign_v1(text,text) TO service_role;

-- Same 14-day rule as every anonymous counter. Existing Cron keeps calling this name.
ALTER FUNCTION marketing_private.prune_expired() RENAME TO prune_before_campaign_experience;
CREATE FUNCTION marketing_private.prune_expired() RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE n integer;
BEGIN
 n:=marketing_private.prune_before_campaign_experience();
 DELETE FROM marketing_private.experience_campaign_daily WHERE day<=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-14;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION marketing_private.prune_before_campaign_experience(),marketing_private.prune_expired(),marketing_private.campaign_experience_ready() FROM PUBLIC,anon,authenticated,service_role;

-- A pair is shown only when neither side can reveal fewer than 10 requests.
-- The start day is skipped: its total may hold untagged requests from before the gate opened.
CREATE FUNCTION public.pazo_admin_campaign_experience_v1(p_days integer,p_creative text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='5s' AS $$
DECLARE started timestamptz;today date:=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;since date;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,14,30,90) OR p_creative IS NULL OR (p_creative<>'all' AND marketing_private.campaign_for_creative(p_creative) IS NULL) THEN RAISE EXCEPTION 'invalid scope' USING ERRCODE='22023';END IF;
 SELECT campaign_experience_started_at INTO started FROM marketing_private.collection_gate WHERE singleton;
 since:=greatest(today-(least(p_days,14)-1),coalesce((started AT TIME ZONE 'America/Los_Angeles')::date+1,today+1));
 RETURN jsonb_build_object('version',1,'status',CASE WHEN marketing_private.campaign_experience_ready() THEN 'observing' ELSE 'paused' END,
  'coverage_since',started,'as_of',statement_timestamp(),'creative',p_creative,
  'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('signal',signal,'ads',ads,'other',CASE WHEN p_creative='all' THEN other END) ORDER BY ads DESC,signal) FROM (
   SELECT t.signal,coalesce(a.requests,0) ads,t.requests-coalesce(all_ads.requests,0) other FROM
   (SELECT signal,sum(requests)::integer requests FROM marketing_private.experience_daily WHERE day>=since GROUP BY signal) t
   LEFT JOIN (SELECT signal,sum(requests)::integer requests FROM marketing_private.experience_campaign_daily WHERE day>=since AND (p_creative='all' OR creative=p_creative) GROUP BY signal) a USING(signal)
   LEFT JOIN (SELECT signal,sum(requests)::integer requests FROM marketing_private.experience_campaign_daily WHERE day>=since GROUP BY signal) all_ads USING(signal)
  ) q WHERE (ads=0 OR ads>=10) AND (other=0 OR other>=10) AND (ads>0 OR other>0)),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_campaign_experience_v1(integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_campaign_experience_v1(integer,text) TO authenticated;
COMMIT;
