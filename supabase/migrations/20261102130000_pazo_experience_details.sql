-- PREPARED, OFF. Closed categories added to anonymous daily counters: why signup failed,
-- last Demo screen and arrival type. No text, URL, identifier, session or account link.
-- Requires 20261102120000. Apply alone by apply_migration, never db push.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE marketing_private.collection_gate
 ADD COLUMN experience_details_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN experience_details_started_at timestamptz,
 ADD COLUMN experience_details_notice_version text;
CREATE FUNCTION marketing_private.experience_detail_valid(p_kind text,p_value text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE p_kind
  WHEN 'signup_failure' THEN p_value=ANY(ARRAY['missing_fields','age_required','password_mismatch','weak_password','email_taken','invalid_email','rate_limited','network','google_age','google_cancelled','google_failed','other'])
  WHEN 'demo_last_screen' THEN p_value=ANY(ARRAY['home','pet','communities','places','explore'])
  WHEN 'arrival_source' THEN p_value=ANY(ARRAY['search','social','direct','installed','other'])
  ELSE false END
$$;
-- Empty creative means no validated ad. Arrival sources are only reported without one.
CREATE TABLE marketing_private.experience_detail_daily(
 day date NOT NULL,kind text NOT NULL,value text NOT NULL,creative text NOT NULL DEFAULT '',
 requests integer NOT NULL CHECK(requests BETWEEN 1 AND 3000),PRIMARY KEY(day,kind,value,creative),
 CHECK(marketing_private.experience_detail_valid(kind,value)),
 CHECK(creative='' OR marketing_private.campaign_for_creative(creative) IS NOT NULL));
ALTER TABLE marketing_private.experience_detail_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.experience_detail_daily FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.experience_detail_daily FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.experience_details_ready() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT marketing_private.intelligence_ready() AND coalesce((SELECT experience_details_enabled
 AND experience_details_started_at<=statement_timestamp() AND experience_details_notice_version='pazo-experience-details-notice-v1'
 FROM marketing_private.collection_gate WHERE singleton),false)
$$;
CREATE FUNCTION public.pazo_experience_detail_v1(p_kind text,p_value text,p_creative text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
BEGIN
 IF p_kind IS NULL OR p_value IS NULL OR p_creative IS NULL OR NOT marketing_private.experience_detail_valid(p_kind,p_value)
 OR (p_creative<>'' AND marketing_private.campaign_for_creative(p_creative) IS NULL) OR NOT marketing_private.experience_details_ready() THEN RETURN false;END IF;
 INSERT INTO marketing_private.experience_detail_daily VALUES((statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date,p_kind,p_value,p_creative,1)
 ON CONFLICT(day,kind,value,creative) DO UPDATE SET requests=marketing_private.experience_detail_daily.requests+1 WHERE marketing_private.experience_detail_daily.requests<3000;
 RETURN FOUND;
EXCEPTION WHEN lock_not_available OR query_canceled THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.pazo_experience_detail_v1(text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_experience_detail_v1(text,text,text) TO service_role;

ALTER FUNCTION marketing_private.prune_expired() RENAME TO prune_before_experience_details;
CREATE FUNCTION marketing_private.prune_expired() RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE n integer;
BEGIN
 n:=marketing_private.prune_before_experience_details();
 DELETE FROM marketing_private.experience_detail_daily WHERE day<=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-14;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION marketing_private.prune_before_experience_details(),marketing_private.prune_expired(),marketing_private.experience_details_ready(),marketing_private.experience_detail_valid(text,text) FROM PUBLIC,anon,authenticated,service_role;

-- Scope: all, ads (any validated ad) or one creative. Arrival types always count only visits without an ad.
CREATE FUNCTION public.pazo_admin_experience_details_v1(p_days integer,p_scope text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='5s' AS $$
DECLARE started timestamptz;today date:=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date;since date;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,14,30,90) OR p_scope IS NULL OR (p_scope NOT IN('all','ads') AND marketing_private.campaign_for_creative(p_scope) IS NULL) THEN RAISE EXCEPTION 'invalid scope' USING ERRCODE='22023';END IF;
 SELECT experience_details_started_at INTO started FROM marketing_private.collection_gate WHERE singleton;
 since:=greatest(today-(least(p_days,14)-1),coalesce((started AT TIME ZONE 'America/Los_Angeles')::date,today+1));
 RETURN jsonb_build_object('version',1,'status',CASE WHEN marketing_private.experience_details_ready() THEN 'observing' ELSE 'paused' END,
  'coverage_since',started,'as_of',statement_timestamp(),'scope',p_scope,
  'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('kind',kind,'value',value,'requests',requests) ORDER BY kind,requests DESC,value) FROM (
   SELECT kind,value,sum(requests)::integer requests FROM marketing_private.experience_detail_daily WHERE day>=since
   AND CASE WHEN kind='arrival_source' THEN creative='' WHEN p_scope='all' THEN true WHEN p_scope='ads' THEN creative<>'' ELSE creative=p_scope END
   GROUP BY kind,value HAVING sum(requests)>=10) q),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_experience_details_v1(integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_experience_details_v1(integer,text) TO authenticated;
COMMIT;
