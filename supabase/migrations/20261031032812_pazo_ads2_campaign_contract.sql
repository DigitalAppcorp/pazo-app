-- #168: additive contract only. PREPARED, NOT APPLIED TO HOSTED.
-- Never update collection gates, their original timestamps, or historical rows.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE FUNCTION marketing_private.campaign_for_creative(c text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE
 WHEN c IN('qr_v2_en','cuidados_v2_en','app_v2_en') THEN 'pazo_la_en_202611'
 WHEN c IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en') THEN 'pazo_beta_local_202610' END $$;
REVOKE ALL ON FUNCTION marketing_private.campaign_for_creative(text) FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE marketing_private.acquisition DROP CONSTRAINT acquisition_campaign_check, DROP CONSTRAINT acquisition_creative_check;
ALTER TABLE marketing_private.acquisition ADD CONSTRAINT acquisition_campaign_creative_check CHECK(marketing_private.campaign_for_creative(creative) IS NOT NULL AND campaign=marketing_private.campaign_for_creative(creative));
ALTER TABLE marketing_private.landing_daily DROP CONSTRAINT landing_daily_campaign_check, DROP CONSTRAINT landing_daily_creative_check;
ALTER TABLE marketing_private.landing_daily ADD CONSTRAINT landing_daily_campaign_creative_check CHECK(marketing_private.campaign_for_creative(creative) IS NOT NULL AND campaign=marketing_private.campaign_for_creative(creative));
ALTER TABLE marketing_private.landing_minute_budget DROP CONSTRAINT landing_minute_budget_creative_check;
ALTER TABLE marketing_private.landing_minute_budget ADD CONSTRAINT landing_minute_budget_creative_check CHECK(marketing_private.campaign_for_creative(creative) IS NOT NULL);
ALTER TABLE marketing_private.prereg_daily DROP CONSTRAINT prereg_daily_creative_check;
ALTER TABLE marketing_private.prereg_daily ADD CONSTRAINT prereg_daily_creative_check CHECK(marketing_private.campaign_for_creative(creative) IS NOT NULL);
CREATE OR REPLACE FUNCTION marketing_private.record_landing_core(p_creative text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $mkt_landing_bounded$
DECLARE v_accepted integer; v_total bigint;
BEGIN
 IF p_creative IS NULL OR p_creative NOT IN(
   'perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en'
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
   marketing_private.campaign_for_creative(p_creative),p_creative,1
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

CREATE OR REPLACE FUNCTION marketing_private.record_verified_acquisition(
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
    OR p_creative NOT IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en')
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
   p_owner,marketing_private.campaign_for_creative(p_creative),p_creative,p_first_touch_at,v_verified,
   'pazo-marketing-attribution-notice-v1'
 )
 ON CONFLICT (owner_id) DO NOTHING;
 RETURN FOUND;
END
$$;

CREATE OR REPLACE FUNCTION public.pazo_admin_first_utility_summary(p_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; started timestamptz; collecting boolean;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,30,90) THEN RAISE EXCEPTION 'invalid period';END IF;
 SELECT utility_started_at,(enabled AND utility_enabled AND retention_days=14
  AND utility_notice_version='pazo-first-utility-notice-v1' AND marketing_private.retention_ready(retention_days,policy_version))
 INTO started,collecting FROM marketing_private.collection_gate WHERE singleton;
 WITH owners AS (
  SELECT u.id,u.email_confirmed_at AS created_at,p.first_pet_at,
   CASE WHEN a.creative IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en')
    THEN a.creative ELSE 'organic' END AS segment,
   o.qr_visible_at,o.qr_download_initiated_at,o.qr_share_confirmed_at,o.care_created_at,
   o.first_utility_at,o.return_d7_at
  FROM auth.users u
  LEFT JOIN LATERAL(SELECT min(created_at) first_pet_at FROM public.pets WHERE owner_id=u.id)p ON true
  LEFT JOIN marketing_private.acquisition a ON a.owner_id=u.id
   AND a.recorded_at>=statement_timestamp()-interval '14 days'
  LEFT JOIN marketing_private.utility_outcomes o ON o.owner_id=u.id
   AND o.registered_at>=statement_timestamp()-interval '14 days'
  WHERE marketing_private.is_eligible_owner(u.id) AND started IS NOT NULL
   AND NOT EXISTS(SELECT 1 FROM marketing_private.utility_suppression WHERE owner_id=u.id AND expires_at>statement_timestamp())
   AND u.email_confirmed_at>=greatest(started,statement_timestamp()-make_interval(days=>least(p_days,14)))
 ), groups AS (
  SELECT segment,count(*) verified_registrations,
   count(*) FILTER(WHERE first_pet_at>=created_at AND first_pet_at<=created_at+interval '7 days') first_pet_accounts,
   count(*) FILTER(WHERE first_pet_at>=created_at AND first_pet_at<=created_at+interval '7 days'
    AND first_pet_at+interval '7 days'<=statement_timestamp()) matured_first_pet_accounts,
   count(*) FILTER(WHERE first_pet_at>=created_at AND first_pet_at<=created_at+interval '7 days'
    AND first_utility_at>=first_pet_at AND first_utility_at<=first_pet_at+interval '7 days') first_utility_accounts,
   count(qr_visible_at) qr_visible_accounts,count(qr_download_initiated_at) qr_download_initiated_accounts,
   count(qr_share_confirmed_at) qr_share_confirmed_accounts,count(care_created_at) care_created_accounts,
   count(*) FILTER(WHERE first_utility_at+interval '7 days'<=statement_timestamp()) d7_matured_accounts,
   count(return_d7_at) d7_return_accounts
  FROM owners GROUP BY segment
 ) SELECT coalesce(jsonb_agg(to_jsonb(groups) ORDER BY segment),'[]'::jsonb) INTO result FROM groups;
 RETURN jsonb_build_object('status',CASE WHEN collecting THEN 'collecting' ELSE 'paused' END,
  'period_days',p_days,'effective_days',least(p_days,14),'coverage_since',started,
  'as_of',statement_timestamp(),'minimum_observational_sample',10,'groups',result);
END $$;

CREATE OR REPLACE FUNCTION public.pazo_marketing_prereg_signal_v1(p_creative text,p_step text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
BEGIN
 IF NOT marketing_private.behavior_ready() OR p_creative IS NULL OR p_creative NOT IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en')
 OR p_step IS NULL OR p_step NOT IN('signup_cta','signup_start','signup_requested','signup_error') THEN RETURN false;END IF;
 INSERT INTO marketing_private.prereg_daily(day,creative,step,signals) VALUES((statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date,p_creative,p_step,1)
 ON CONFLICT(day,creative,step) DO UPDATE SET signals=marketing_private.prereg_daily.signals+1 WHERE marketing_private.prereg_daily.signals<3000;
 RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.pazo_admin_behavior_summary_v1(p_days integer DEFAULT 7,p_segment text DEFAULT 'all',p_creative text DEFAULT 'all') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='5s' AS $$
DECLARE since_at timestamptz;start_at timestamptz;healthy boolean;result jsonb;cutoff timestamptz;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 -- Preserve #161 aggregate admin reads at AAL1.
 IF p_days IS NULL OR p_days NOT IN(7,30,90) OR p_segment IS NULL OR p_segment NOT IN('all','paid_attributed','unknown')
 OR p_creative IS NULL OR p_creative NOT IN('all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en')
 OR (p_segment='unknown' AND p_creative<>'all') THEN RAISE EXCEPTION 'invalid closed filter' USING ERRCODE='22023';END IF;
 SELECT behavior_started_at INTO start_at FROM marketing_private.collection_gate WHERE singleton;
 healthy:=marketing_private.behavior_ready();
 since_at:=greatest(start_at,statement_timestamp()-make_interval(days=>least(p_days,14)));
 cutoff:=statement_timestamp();
 WITH base AS (
  SELECT u.id,u.email_confirmed_at,
   CASE WHEN a.owner_id IS NOT NULL THEN 'paid_attributed' ELSE 'unknown' END segment,a.creative
  FROM auth.users u LEFT JOIN marketing_private.acquisition a ON a.owner_id=u.id AND a.recorded_at>=cutoff-interval '14 days'
  WHERE start_at IS NOT NULL AND marketing_private.behavior_eligible(u.id)
 ), selected AS (
  SELECT * FROM base WHERE (p_segment='all' OR segment=p_segment) AND (p_creative='all' OR creative=p_creative)
 ), sessions AS (
  SELECT s.*,EXISTS(SELECT 1 FROM marketing_private.behavior_sessions prior WHERE prior.owner_id=s.owner_id
   AND prior.started_at>=cutoff-interval '14 days' AND prior.started_at<s.started_at-interval '30 minutes') AS is_return
  FROM marketing_private.behavior_sessions s JOIN selected b ON b.id=s.owner_id WHERE s.started_at>=since_at
 ), events AS (
  SELECT e.*,s.owner_id,s.started_at,s.is_return FROM marketing_private.behavior_events e JOIN sessions s ON s.id=e.session_id
 ), population AS (
  SELECT count(DISTINCT owner_id) n,count(*) sessions,count(*) FILTER(WHERE is_return) returns,
   count(*) FILTER(WHERE NOT is_return) firsts,count(DISTINCT (owner_id,(started_at AT TIME ZONE 'America/Los_Angeles')::date)) active_days,
   count(DISTINCT owner_id) FILTER(WHERE EXISTS(SELECT 1 FROM events e WHERE e.session_id=s.id AND e.event IN('care_created','qr_share_confirmed'))) useful
  FROM sessions s
 ), safe AS (
  -- Suppress complementary populations too, rather than exposing a small remainder.
  SELECT n>=10 AND NOT EXISTS(SELECT 1 FROM base b JOIN marketing_private.behavior_sessions s ON s.owner_id=b.id AND s.started_at>=since_at
    GROUP BY b.segment HAVING count(DISTINCT b.id) BETWEEN 1 AND 9) AS ok FROM population
 ), cohort AS (
  SELECT b.*,p.first_pet_at,v.first_view IS NOT NULL viewed,u.first_use IS NOT NULL useful,u.first_use
  FROM selected b LEFT JOIN LATERAL(SELECT min(created_at) first_pet_at FROM public.pets WHERE owner_id=b.id)p ON true
  LEFT JOIN LATERAL(SELECT min(received_at) first_view FROM events e WHERE e.owner_id=b.id AND e.event='screen_view' AND e.screen IN('pet','qr','agenda') AND e.received_at>=p.first_pet_at)v ON true
  LEFT JOIN LATERAL(SELECT min(received_at) first_use FROM events e WHERE e.owner_id=b.id AND e.event IN('care_created','qr_share_confirmed') AND e.received_at>=v.first_view)u ON true
  WHERE b.email_confirmed_at>=since_at AND b.segment='paid_attributed'
 ), funnel AS (
  SELECT count(*) verified,count(*) FILTER(WHERE first_pet_at>=email_confirmed_at) pet,
   count(*) FILTER(WHERE first_pet_at>=email_confirmed_at AND viewed) view,
   count(*) FILTER(WHERE first_pet_at>=email_confirmed_at AND viewed AND useful) utility FROM cohort
 ), stages AS (
  SELECT * FROM (SELECT 'verified' step,verified n,verified denominator FROM funnel UNION ALL
   SELECT 'first_pet',pet,verified FROM funnel UNION ALL SELECT 'tool_view',view,pet FROM funnel UNION ALL SELECT 'utility',utility,view FROM funnel) f
 ), ordered_views AS (
  SELECT session_id,owner_id,screen,received_at,lead(screen) OVER(PARTITION BY session_id ORDER BY seq) next_screen FROM events WHERE event='screen_view' AND seq>0
 ), paths AS (
  SELECT screen,next_screen,count(DISTINCT owner_id) accounts FROM ordered_views v
  WHERE next_screen IS NOT NULL OR NOT EXISTS(SELECT 1 FROM events e WHERE e.session_id=v.session_id AND e.event IN('care_created','qr_share_confirmed') AND e.received_at>=v.received_at)
  GROUP BY screen,next_screen HAVING count(DISTINCT owner_id)>=10
 ), issues AS (
  SELECT screen,event,category,count(DISTINCT owner_id) accounts FROM events WHERE event IN('error','loading','retry') GROUP BY screen,event,category HAVING count(DISTINCT owner_id)>=10
 ), returning_modules AS (
  SELECT screen,count(DISTINCT owner_id) accounts FROM events WHERE is_return AND event='screen_view' GROUP BY screen HAVING count(DISTINCT owner_id)>=10
 ), return_first AS (
  SELECT DISTINCT ON(session_id) session_id,owner_id,event FROM events WHERE is_return AND event IN('care_created','qr_share_confirmed') ORDER BY session_id,received_at,seq DESC
 ), first_actions AS (
  SELECT event,count(DISTINCT owner_id) accounts FROM return_first GROUP BY event HAVING count(DISTINCT owner_id)>=10
 ), anchors AS (
  SELECT owner_id,min(started_at) first_at FROM marketing_private.behavior_sessions
  WHERE started_at>=greatest(start_at,cutoff-interval '14 days') GROUP BY owner_id
 ), outcomes AS (
  SELECT event,count(DISTINCT owner_id) accounts FROM events WHERE event IN('care_created','qr_share_confirmed') GROUP BY event HAVING count(DISTINCT owner_id)>=10 AND ((SELECT n FROM population)-count(DISTINCT owner_id)=0 OR (SELECT n FROM population)-count(DISTINCT owner_id)>=10)
 ), paid_retention AS (
  SELECT 7 AS "day",count(*) matured,
   count(*) FILTER(WHERE EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id=c.id AND (s.started_at AT TIME ZONE 'America/Los_Angeles')::date=(c.first_use AT TIME ZONE 'America/Los_Angeles')::date+7)) reopened,
   count(*) FILTER(WHERE EXISTS(SELECT 1 FROM events e WHERE e.owner_id=c.id AND e.event IN('care_created','qr_share_confirmed') AND (e.received_at AT TIME ZONE 'America/Los_Angeles')::date=(c.first_use AT TIME ZONE 'America/Los_Angeles')::date+7)) useful
  FROM cohort c WHERE c.first_pet_at>=c.email_confirmed_at AND c.first_use IS NOT NULL AND ((c.first_use AT TIME ZONE 'America/Los_Angeles')::date+8)<=(cutoff AT TIME ZONE 'America/Los_Angeles')::date
 ), retention AS (
  SELECT d.day,count(*) matured,
   count(*) FILTER(WHERE EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id=a.owner_id
    AND (s.started_at AT TIME ZONE 'America/Los_Angeles')::date=(a.first_at AT TIME ZONE 'America/Los_Angeles')::date+d.day)) reopened,
   count(*) FILTER(WHERE EXISTS(SELECT 1 FROM events e WHERE e.owner_id=a.owner_id AND e.event IN('care_created','qr_share_confirmed')
    AND (e.received_at AT TIME ZONE 'America/Los_Angeles')::date=(a.first_at AT TIME ZONE 'America/Los_Angeles')::date+d.day)) useful
  FROM anchors a JOIN selected b ON b.id=a.owner_id CROSS JOIN (VALUES(1),(7))d(day)
  WHERE a.first_at>=since_at AND ((a.first_at AT TIME ZONE 'America/Los_Angeles')::date+d.day+1)<=(cutoff AT TIME ZONE 'America/Los_Angeles')::date
  GROUP BY d.day
 )
 SELECT jsonb_build_object(
  'status',CASE WHEN NOT healthy THEN 'paused' WHEN NOT safe.ok THEN 'insufficient' ELSE 'collecting' END,
  'period_days',p_days,'effective_days',CASE WHEN start_at IS NULL THEN 0 ELSE greatest(0,least(p_days,14,ceil(extract(epoch FROM cutoff-start_at)/86400)::integer)) END,'coverage_since',start_at,'as_of',cutoff,'timezone','America/Los_Angeles','minimum_sample',10,
  'segment',p_segment,'creative',p_creative,'source_gaps',jsonb_build_array('organic_evidenced','direct','anonymous_unique_people','historical_sessions','self_reported_reason','repeat_qr_share'),
  'totals',CASE WHEN safe.ok AND (returns=0 OR returns>=10) AND (firsts=0 OR firsts>=10) THEN jsonb_build_object('accounts',n,'sessions',sessions,'first_observed_sessions',firsts,'return_sessions',returns,'active_account_days',active_days,'useful_accounts',CASE WHEN (useful=0 OR useful>=10) AND (n-useful=0 OR n-useful>=10) THEN useful ELSE NULL END) ELSE NULL END,
  'funnel',coalesce((SELECT jsonb_agg(jsonb_build_object('step',step,'accounts',CASE WHEN n=0 OR n>=10 THEN n ELSE NULL END,'denominator',CASE WHEN denominator=0 OR denominator>=10 THEN denominator ELSE NULL END) ORDER BY CASE step WHEN 'verified' THEN 1 WHEN 'first_pet' THEN 2 WHEN 'tool_view' THEN 3 ELSE 4 END) FROM stages WHERE (SELECT verified FROM funnel)>=10 AND NOT EXISTS(SELECT 1 FROM stages WHERE n BETWEEN 1 AND 9 OR denominator-n BETWEEN 1 AND 9)),'[]'::jsonb),
  'paths',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM paths ORDER BY accounts DESC,screen,next_screen LIMIT 12)p),'[]'::jsonb) ELSE '[]'::jsonb END,
  'issues',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM (SELECT * FROM issues ORDER BY accounts DESC LIMIT 12)i),'[]'::jsonb) ELSE '[]'::jsonb END,
  'return_modules',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY accounts DESC,screen) FROM returning_modules r),'[]'::jsonb) ELSE '[]'::jsonb END,
  'return_actions',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM first_actions a),'[]'::jsonb) ELSE '[]'::jsonb END,
  'outcomes',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM outcomes o),'[]'::jsonb) ELSE '[]'::jsonb END,
  'paid_retention',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM paid_retention r WHERE matured>=10 AND (reopened=0 OR reopened>=10) AND (useful=0 OR useful>=10) AND (matured-reopened=0 OR matured-reopened>=10) AND (reopened-useful=0 OR reopened-useful>=10)),'[]'::jsonb),
  'retention',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.day) FROM retention r WHERE matured>=10 AND (reopened=0 OR reopened>=10) AND (useful=0 OR useful>=10) AND (matured-reopened=0 OR matured-reopened>=10) AND (reopened-useful=0 OR reopened-useful>=10)),'[]'::jsonb),
  'prereg',coalesce((SELECT jsonb_agg(jsonb_build_object('step',step,'signals',signals)) FROM (
    SELECT step,sum(signals) signals FROM marketing_private.prereg_daily WHERE day>=(since_at AT TIME ZONE 'America/Los_Angeles')::date
    AND (p_creative='all' OR creative=p_creative) GROUP BY step)q),'[]'::jsonb),
  'landing_signals',coalesce((SELECT sum(signals) FROM marketing_private.landing_daily WHERE landing_day>=(since_at AT TIME ZONE 'America/Los_Angeles')::date AND (p_creative='all' OR creative=p_creative)),0)
 ) INTO result FROM population,safe;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.pazo_admin_intelligence_summary_v1(p_days integer DEFAULT 7,p_segment text DEFAULT 'all',p_creative text DEFAULT 'all') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='3s' AS $$
DECLARE since_at timestamptz;start_at timestamptz;source_since timestamptz;healthy boolean;result jsonb;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,30,90) OR p_segment IS NULL OR p_segment NOT IN('all','paid_attributed','unknown') OR p_creative IS NULL OR p_creative NOT IN('all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en') OR (p_segment='unknown' AND p_creative<>'all') THEN RAISE EXCEPTION 'invalid closed filter' USING ERRCODE='22023';END IF;
 SELECT intelligence_started_at INTO start_at FROM marketing_private.collection_gate WHERE singleton;
 healthy:=marketing_private.intelligence_ready();
 since_at:=greatest(start_at,statement_timestamp()-make_interval(days=>least(p_days,14)));
 source_since:=greatest(start_at,statement_timestamp()-interval '14 days');
 IF NOT healthy THEN RETURN jsonb_build_object('version',1,'status','paused','coverage_since',start_at,'as_of',statement_timestamp(),'effective_days',least(p_days,14),'tasks','[]'::jsonb,'facts','[]'::jsonb,'anonymous','[]'::jsonb);END IF;
 WITH eligible AS (
  SELECT u.id,a.creative,CASE WHEN a.owner_id IS NULL THEN 'unknown' ELSE 'paid_attributed' END segment
  FROM auth.users u LEFT JOIN marketing_private.acquisition a ON a.owner_id=u.id AND a.recorded_at>=statement_timestamp()-interval '14 days' WHERE marketing_private.behavior_eligible(u.id)
 ), selected AS (
  SELECT id FROM eligible WHERE (p_segment='all' OR segment=p_segment) AND (p_creative='all' OR creative=p_creative)
 ), task_source AS MATERIALIZED (
  SELECT e.*,s.owner_id FROM marketing_private.task_events e JOIN marketing_private.behavior_sessions s ON s.id=e.session_id JOIN eligible u ON u.id=s.owner_id WHERE e.received_at>=source_since
 ), task_safety AS (
  SELECT task,kind,marketing_private.intelligence_cohort_safe(array_agg(DISTINCT owner_id),coalesce(array_agg(DISTINCT owner_id) FILTER(WHERE received_at>=statement_timestamp()-interval '7 days'),'{}'::uuid[])) safe FROM task_source GROUP BY task,kind
 ), tasks AS (
  SELECT e.task,e.kind,count(DISTINCT e.owner_id) accounts FROM task_source e JOIN selected u ON u.id=e.owner_id JOIN task_safety g ON g.task=e.task AND g.kind=e.kind AND g.safe WHERE e.received_at>=since_at GROUP BY e.task,e.kind HAVING count(DISTINCT e.owner_id)>=10
 ), fact_source AS MATERIALIZED (
  SELECT f.* FROM marketing_private.intelligence_facts(source_since) f JOIN eligible u ON u.id=f.owner WHERE f.at<=statement_timestamp()
 ), fact_safety AS (
  SELECT metric,marketing_private.intelligence_cohort_safe(array_agg(DISTINCT owner),coalesce(array_agg(DISTINCT owner) FILTER(WHERE at>=statement_timestamp()-interval '7 days'),'{}'::uuid[])) safe FROM fact_source GROUP BY metric
 ), facts AS (
  SELECT f.metric,count(DISTINCT f.owner) accounts,count(DISTINCT f.owner) FILTER(WHERE EXISTS(SELECT 1 FROM marketing_private.behavior_sessions prior WHERE prior.owner_id=f.owner AND prior.started_at>=statement_timestamp()-interval '14 days' AND prior.started_at<f.at-interval '30 minutes')) returning_accounts
  FROM fact_source f JOIN selected u ON u.id=f.owner JOIN fact_safety g ON g.metric=f.metric AND g.safe WHERE f.at>=since_at GROUP BY f.metric HAVING count(DISTINCT f.owner)>=10
 ), anon AS (
  SELECT signal,sum(requests)::integer requests FROM marketing_private.experience_daily WHERE day>=(since_at AT TIME ZONE 'America/Los_Angeles')::date AND p_segment='all' AND p_creative='all' GROUP BY signal HAVING sum(requests)>=10
 ) SELECT jsonb_build_object('version',1,'status','observing','coverage_since',start_at,'as_of',statement_timestamp(),'effective_days',least(p_days,14),
 'tasks',coalesce((SELECT jsonb_agg(jsonb_build_object('task',task,'kind',kind,'accounts',accounts) ORDER BY task,kind) FROM tasks),'[]'),
 'facts',coalesce((SELECT jsonb_agg(jsonb_build_object('metric',metric,'accounts',accounts,'returning',CASE WHEN returning_accounts>=10 AND (accounts-returning_accounts=0 OR accounts-returning_accounts>=10) THEN returning_accounts ELSE NULL END) ORDER BY metric) FROM facts),'[]'),
 'anonymous',coalesce((SELECT jsonb_agg(jsonb_build_object('signal',signal,'requests',requests) ORDER BY signal) FROM anon),'[]')) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.pazo_admin_visual_summary_v1(
 p_days integer DEFAULT 14,p_segment text DEFAULT 'all',
 p_creative text DEFAULT 'all',p_audience text DEFAULT 'all'
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path='' SET statement_timeout='5s' AS $report$
DECLARE cutoff timestamptz:=statement_timestamp();start_at timestamptz;
 day_now date;from14 timestamptz;from7 timestamptz;since_at timestamptz;
 healthy boolean;result jsonb;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,14)
 OR p_segment IS NULL OR p_segment NOT IN('all','paid_attributed','unknown')
 OR p_creative IS NULL OR p_creative NOT IN('all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en')
 OR p_audience IS NULL OR p_audience NOT IN('all','returning')
 OR (p_segment='unknown' AND p_creative<>'all') THEN
  RAISE EXCEPTION 'invalid closed filter' USING ERRCODE='22023';
 END IF;
 SELECT behavior_started_at INTO start_at FROM marketing_private.collection_gate WHERE singleton;
 healthy:=marketing_private.behavior_ready();
 day_now:=(cutoff AT TIME ZONE 'America/Los_Angeles')::date;
 from14:=greatest(start_at,(day_now-13)::timestamp AT TIME ZONE 'America/Los_Angeles');
 from7:=greatest(start_at,(day_now-6)::timestamp AT TIME ZONE 'America/Los_Angeles');
 since_at:=CASE WHEN p_days=7 THEN from7 ELSE from14 END;
 WITH owners AS MATERIALIZED (
  SELECT u.id,u.email_confirmed_at,a.creative,
   CASE WHEN a.owner_id IS NULL THEN 'unknown' ELSE 'paid_attributed' END segment
  FROM auth.users u LEFT JOIN marketing_private.acquisition a
   ON a.owner_id=u.id AND a.recorded_at>=cutoff-interval '14 days'
  WHERE healthy AND start_at IS NOT NULL AND marketing_private.behavior_eligible(u.id)
 ), sessions AS MATERIALIZED (
  SELECT s.*,EXISTS(SELECT 1 FROM marketing_private.behavior_sessions prior
   WHERE prior.owner_id=s.owner_id AND prior.started_at>=cutoff-interval '14 days'
   AND prior.started_at<s.started_at-interval '30 minutes') is_return
  FROM marketing_private.behavior_sessions s JOIN owners o ON o.id=s.owner_id
  WHERE s.started_at>=greatest(start_at,cutoff-interval '14 days') AND s.started_at<=cutoff
 ), events AS MATERIALIZED (
  SELECT e.*,s.owner_id,s.is_return FROM marketing_private.behavior_events e
  JOIN sessions s ON s.id=e.session_id
  WHERE e.received_at>=from14 AND e.received_at<=cutoff
 ), views AS MATERIALIZED (
  SELECT *,lead(screen) OVER(PARTITION BY session_id ORDER BY seq) next_screen,
   row_number() OVER(PARTITION BY session_id ORDER BY seq DESC) last_rank
  FROM events WHERE event='screen_view' AND seq>0
   AND screen IN('home','pet','qr','agenda','communities','places','explore','first_pet')
 ), funnel AS MATERIALIZED (
  SELECT o.id,o.email_confirmed_at,p.first_pet_at,v.first_view,u.first_use,
   EXISTS(SELECT 1 FROM sessions s WHERE s.owner_id=o.id AND s.is_return) is_return
  FROM owners o
  LEFT JOIN LATERAL(SELECT min(created_at) first_pet_at FROM public.pets WHERE owner_id=o.id)p ON true
  LEFT JOIN LATERAL(SELECT min(received_at) first_view FROM events e WHERE e.owner_id=o.id
   AND e.event='screen_view' AND e.screen IN('pet','qr','agenda') AND e.received_at>=p.first_pet_at)v ON true
  LEFT JOIN LATERAL(SELECT min(received_at) first_use FROM events e WHERE e.owner_id=o.id
   AND e.event IN('care_created','qr_share_confirmed') AND e.received_at>=v.first_view)u ON true
  WHERE o.segment='paid_attributed' AND o.email_confirmed_at>=from14 AND o.email_confirmed_at<=cutoff
 ), core(metric,owner_id,at,is_return,session_id) AS MATERIALIZED (
  SELECT 'active',owner_id,started_at,is_return,id FROM sessions WHERE started_at>=from14
  UNION ALL SELECT 'active',owner_id,received_at,is_return,session_id FROM events
  UNION ALL SELECT 'useful',owner_id,received_at,is_return,session_id FROM events WHERE event IN('care_created','qr_share_confirmed')
  UNION ALL SELECT 'returning',owner_id,started_at,true,id FROM sessions WHERE is_return AND started_at>=from14
  UNION ALL SELECT 'returning',owner_id,received_at,true,session_id FROM events WHERE is_return
  UNION ALL SELECT 'last:'||screen,owner_id,received_at,is_return,session_id FROM views WHERE last_rank=1
  UNION ALL SELECT 'move:'||screen||':'||next_screen,owner_id,received_at,is_return,session_id FROM views WHERE next_screen IS NOT NULL AND next_screen<>screen
  UNION ALL SELECT 'module:'||screen,owner_id,received_at,true,session_id FROM views WHERE is_return AND screen IN('pet','qr','agenda','communities','places')
  UNION ALL SELECT 'verified',id,email_confirmed_at,is_return,NULL::uuid FROM funnel
  UNION ALL SELECT 'first_pet',id,email_confirmed_at,is_return,NULL::uuid FROM funnel WHERE first_pet_at>=email_confirmed_at AND first_pet_at<=cutoff
  UNION ALL SELECT 'tool_view',id,email_confirmed_at,is_return,NULL::uuid FROM funnel WHERE first_pet_at>=email_confirmed_at AND first_view IS NOT NULL
  UNION ALL SELECT 'utility',id,email_confirmed_at,is_return,NULL::uuid FROM funnel WHERE first_pet_at>=email_confirmed_at AND first_view IS NOT NULL AND first_use IS NOT NULL
 ), facts AS MATERIALIZED (
  SELECT * FROM core
  UNION ALL SELECT 'day:'||(at AT TIME ZONE 'America/Los_Angeles')::date,owner_id,at,is_return,session_id FROM core WHERE metric='active'
  UNION ALL SELECT 'dayreturn:'||(at AT TIME ZONE 'America/Los_Angeles')::date,owner_id,at,true,session_id FROM core WHERE metric='returning'
 ), cells AS MATERIALIZED (
  -- Compute safety BEFORE applying UI filters. A small cell suppresses its metric
  -- in every source/creative/audience/window, preventing repeated-filter leakage.
  SELECT f.metric,w.days,a.audience,
   CASE WHEN grouping(o.segment)=1 THEN 'all' ELSE o.segment END segment,
   CASE WHEN grouping(o.creative)=1 THEN 'all' ELSE coalesce(o.creative,'none') END creative,
   count(DISTINCT f.owner_id)::integer n,count(DISTINCT f.session_id)::integer sessions
  FROM facts f JOIN owners o ON o.id=f.owner_id
  CROSS JOIN (VALUES(7),(14))w(days)
  CROSS JOIN LATERAL(VALUES('all'),(CASE WHEN f.is_return THEN 'returning' END))a(audience)
  WHERE a.audience IS NOT NULL AND f.at>=CASE WHEN w.days=7 THEN from7 ELSE from14 END
  GROUP BY f.metric,w.days,a.audience,GROUPING SETS((o.segment,o.creative),(o.segment),(o.creative),())
 ), safety AS MATERIALIZED (
  SELECT c.metric,bool_and(c.n>=10
   AND (c.days<>14 OR c.n-coalesce(recent.n,0) NOT BETWEEN 1 AND 9)
   AND (c.audience<>'all' OR c.n-coalesce(returned.n,0) NOT BETWEEN 1 AND 9)
   AND coalesce(parent.n,0)>=c.n AND coalesce(parent.n,0)-c.n NOT BETWEEN 1 AND 9) safe
  FROM cells c
  LEFT JOIN cells recent ON recent.metric=c.metric AND recent.days=7 AND recent.audience=c.audience AND recent.segment=c.segment AND recent.creative=c.creative
  LEFT JOIN cells returned ON returned.metric=c.metric AND returned.days=c.days AND returned.audience='returning' AND returned.segment=c.segment AND returned.creative=c.creative
  LEFT JOIN cells parent ON parent.metric=CASE
    WHEN c.metric='first_pet' THEN 'verified' WHEN c.metric='tool_view' THEN 'first_pet' WHEN c.metric='utility' THEN 'tool_view'
    WHEN c.metric='verified' THEN 'verified' WHEN c.metric LIKE 'dayreturn:%' THEN replace(c.metric,'dayreturn:','day:')
    WHEN c.metric LIKE 'module:%' THEN 'returning' ELSE 'active' END
   AND parent.days=c.days AND parent.audience=c.audience AND parent.segment=c.segment AND parent.creative=c.creative
  GROUP BY c.metric
 ), scope AS MATERIALIZED (
  SELECT c.* FROM cells c WHERE days=p_days AND audience=p_audience AND segment=p_segment AND creative=p_creative
 ), flags AS (
  SELECT coalesce((SELECT safe FROM safety WHERE metric='active'),false) active,
   coalesce((SELECT safe FROM safety WHERE metric='useful'),true) useful,
   coalesce((SELECT safe FROM safety WHERE metric='returning'),true) returning_safe,
   NOT EXISTS(SELECT 1 FROM safety WHERE metric IN('verified','first_pet','tool_view','utility') AND NOT safe)
    AND coalesce((SELECT n FROM cells WHERE metric='verified' AND days=p_days AND audience='all' AND segment='all' AND creative='all'),0)>=10 funnel,
   NOT EXISTS(SELECT 1 FROM safety WHERE (metric LIKE 'day:%' OR metric LIKE 'dayreturn:%') AND NOT safe) trend,
   NOT EXISTS(SELECT 1 FROM safety WHERE metric LIKE 'last:%' AND NOT safe) last,
   NOT EXISTS(SELECT 1 FROM safety WHERE metric LIKE 'move:%' AND NOT safe) moves,
   NOT EXISTS(SELECT 1 FROM safety WHERE metric LIKE 'module:%' AND NOT safe) modules
 ), landing AS (
  SELECT creative,sum(signals)::integer n FROM marketing_private.landing_daily
  WHERE landing_day>=(since_at AT TIME ZONE 'America/Los_Angeles')::date GROUP BY creative
 ), days AS (
  SELECT day_now-(p_days-1)+g.n AS observed_day FROM generate_series(0,p_days-1)g(n)
 )
 SELECT jsonb_build_object('version',1,'status',CASE WHEN NOT healthy THEN 'paused' WHEN active OR funnel THEN 'observing' ELSE 'insufficient' END,
  'as_of',cutoff,'coverage_since',start_at,'timezone','America/Los_Angeles','days',p_days,
  'segment',p_segment,'creative',p_creative,'audience',p_audience,
  'totals',CASE WHEN healthy AND active THEN jsonb_build_object(
   'accounts',coalesce((SELECT n FROM scope WHERE metric='active'),0),
   'sessions',coalesce((SELECT sessions FROM scope WHERE metric='active'),0),
   'useful',CASE WHEN useful THEN coalesce((SELECT n FROM scope WHERE metric='useful'),0) END,
   'returning',CASE WHEN returning_safe THEN coalesce((SELECT n FROM scope WHERE metric='returning'),0) END) END,
  'segments',CASE WHEN healthy AND active THEN jsonb_build_object(
   'all',coalesce((SELECT n FROM cells WHERE metric='active' AND days=p_days AND audience='all' AND segment='all' AND creative=p_creative),0),
   'paid',coalesce((SELECT n FROM cells WHERE metric='active' AND days=p_days AND audience='all' AND segment='paid_attributed' AND creative=p_creative),0),
   'unknown',coalesce((SELECT n FROM cells WHERE metric='active' AND days=p_days AND audience='all' AND segment='unknown' AND creative=p_creative),0),
   'returning',CASE WHEN returning_safe THEN coalesce((SELECT n FROM cells WHERE metric='returning' AND days=p_days AND audience='all' AND segment='all' AND creative=p_creative),0) END) END,
  'landing_requests',CASE WHEN healthy AND p_segment<>'unknown' AND p_audience='all'
    AND NOT EXISTS(SELECT 1 FROM landing WHERE n BETWEEN 1 AND 9)
    THEN (SELECT sum(n) FROM landing WHERE p_creative='all' OR creative=p_creative) END,
  'funnel',CASE WHEN healthy AND funnel AND p_segment<>'unknown' AND p_audience='all' THEN
   (SELECT jsonb_agg(jsonb_build_object('step',step,'accounts',coalesce((SELECT n FROM scope WHERE metric=step),0)) ORDER BY ord)
    FROM (VALUES('verified',1),('first_pet',2),('tool_view',3),('utility',4))s(step,ord)) ELSE '[]'::jsonb END,
  'trend',(SELECT jsonb_agg(jsonb_build_object('day',d.observed_day,
   'accounts',CASE WHEN healthy AND active AND trend AND d.observed_day>=(start_at AT TIME ZONE 'America/Los_Angeles')::date THEN coalesce((SELECT n FROM scope WHERE metric='day:'||d.observed_day),0) END,
   'returning',CASE WHEN healthy AND active AND trend AND returning_safe AND d.observed_day>=(start_at AT TIME ZONE 'America/Los_Angeles')::date THEN coalesce((SELECT n FROM scope WHERE metric='dayreturn:'||d.observed_day),0) END) ORDER BY d.observed_day) FROM days d),
  'last_steps',CASE WHEN healthy AND active AND last THEN coalesce((SELECT jsonb_agg(jsonb_build_object('screen',substring(metric FROM 6),'sessions',sessions,'accounts',n) ORDER BY sessions DESC,metric) FROM scope WHERE metric LIKE 'last:%'),'[]') ELSE '[]'::jsonb END,
  'moves',CASE WHEN healthy AND active AND moves THEN coalesce((SELECT jsonb_agg(jsonb_build_object('from',split_part(metric,':',2),'to',split_part(metric,':',3),'accounts',n) ORDER BY n DESC,metric) FROM scope WHERE metric LIKE 'move:%'),'[]') ELSE '[]'::jsonb END,
  'return_modules',CASE WHEN healthy AND active AND modules THEN coalesce((SELECT jsonb_agg(jsonb_build_object('screen',substring(metric FROM 8),'accounts',n) ORDER BY n DESC,metric) FROM scope WHERE metric LIKE 'module:%'),'[]') ELSE '[]'::jsonb END,
  'creatives',CASE WHEN healthy AND funnel AND p_segment<>'unknown' AND p_audience='all' THEN
   coalesce((SELECT jsonb_agg(jsonb_build_object('creative',v.creative,'verified',v.n,'pet',coalesce(p.n,0),'viewed',coalesce(t.n,0),'useful',coalesce(u.n,0)) ORDER BY coalesce(u.n,0)::numeric/v.n DESC,v.creative)
    FROM cells v LEFT JOIN cells p ON p.metric='first_pet' AND p.days=v.days AND p.audience=v.audience AND p.segment=v.segment AND p.creative=v.creative
    LEFT JOIN cells t ON t.metric='tool_view' AND t.days=v.days AND t.audience=v.audience AND t.segment=v.segment AND t.creative=v.creative
    LEFT JOIN cells u ON u.metric='utility' AND u.days=v.days AND u.audience=v.audience AND u.segment=v.segment AND u.creative=v.creative
    WHERE v.metric='verified' AND v.days=p_days AND v.audience='all' AND v.segment='paid_attributed'
     AND v.creative IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en','qr_v2_en','cuidados_v2_en','app_v2_en') AND v.n>=10
     AND (p_creative='all' OR v.creative=p_creative)),'[]') ELSE '[]'::jsonb END
 ) INTO result FROM flags;
 RETURN result;
END
$report$;
COMMIT;
