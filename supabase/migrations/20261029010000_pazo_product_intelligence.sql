-- #153 PREPARED. Independent OFF gate. Do not reinstall/reset #150 or its dates.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE marketing_private.collection_gate
 ADD COLUMN intelligence_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN intelligence_started_at timestamptz,
 ADD COLUMN intelligence_notice_version text;
CREATE TABLE marketing_private.task_events(
 session_id uuid NOT NULL REFERENCES marketing_private.behavior_sessions(id) ON DELETE CASCADE,
 seq smallint NOT NULL CHECK(seq BETWEEN 1 AND 64),
 task text NOT NULL,kind text NOT NULL CHECK(kind IN('exposure','intent','attempt','failure','retry','cancel')),
 received_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(session_id,seq),
 UNIQUE(session_id,task,kind));
CREATE TABLE marketing_private.experience_daily(
 day date NOT NULL,signal text NOT NULL,requests integer NOT NULL CHECK(requests BETWEEN 1 AND 3000),PRIMARY KEY(day,signal));
ALTER TABLE marketing_private.task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.task_events FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.experience_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.experience_daily FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.task_events,marketing_private.experience_daily FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.intelligence_ready() RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT marketing_private.behavior_ready() AND coalesce((SELECT intelligence_enabled
 AND intelligence_started_at<=statement_timestamp() AND intelligence_notice_version='pazo-intelligence-notice-v1'
 FROM marketing_private.collection_gate WHERE singleton),false)
$$;
CREATE FUNCTION marketing_private.intelligence_task_valid(task text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT task=ANY(ARRAY['pet_create','pet_edit','feed_like','feed_save','feed_comment','feed_publish','profile_follow','profile_open','community_discover','community_open','community_join','community_leave','community_create','community_publish','community_comment','community_like','map_open','map_route','map_suggest','qr_download','qr_share','care_create','care_edit','care_archive','care_complete','care_undo','document_upload','document_edit','document_download','document_delete','feed_hide','report_submit','pwa_prompt','pwa_request','pwa_accepted','pwa_dismissed','language_change'])
$$;
ALTER TABLE marketing_private.task_events ADD CHECK(marketing_private.intelligence_task_valid(task));
CREATE FUNCTION marketing_private.experience_signal_valid(signal text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT signal=ANY(ARRAY['welcome','login_open','login_attempt','login_error','reset_attempt','reset_error','demo_enter','demo_home','demo_pet','demo_communities','demo_places','demo_explore','demo_action','demo_signup','demo_exit','signup_cta','signup_start','signup_requested','signup_error'])
$$;
ALTER TABLE marketing_private.experience_daily ADD CHECK(marketing_private.experience_signal_valid(signal));

CREATE FUNCTION public.pazo_intelligence_record_v1(p_session uuid,p_items jsonb) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
DECLARE owner uuid:=auth.uid();s marketing_private.behavior_sessions;item jsonb;next_seq integer;duplicate boolean;
BEGIN
 IF owner IS NULL OR p_session IS NULL OR NOT marketing_private.intelligence_ready() OR NOT marketing_private.behavior_eligible(owner)
 OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RETURN false;END IF;
 IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 8 OR octet_length(p_items::text)>1800 THEN RETURN false;END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>3
  OR NOT(item ?& ARRAY['seq','task','kind']) OR jsonb_typeof(item->'seq')<>'number'
  OR (item->>'seq')!~'^[0-9]{1,2}$' OR (item->>'seq')::integer NOT BETWEEN 1 AND 64
  OR jsonb_typeof(item->'task')<>'string' OR NOT marketing_private.intelligence_task_valid(item->>'task')
  OR jsonb_typeof(item->'kind')<>'string' OR item->>'kind' NOT IN('exposure','intent','attempt','failure','retry','cancel') THEN RETURN false;END IF;
 END LOOP;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pazo_behavior:'||owner::text,0));
 IF NOT marketing_private.intelligence_ready() OR NOT marketing_private.behavior_eligible(owner) THEN RETURN false;END IF;
 SELECT * INTO s FROM marketing_private.behavior_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND THEN
  IF p_items->0->>'seq'<>'1' OR (SELECT count(*) FROM marketing_private.behavior_sessions WHERE owner_id=owner AND started_at>statement_timestamp()-interval '1 day')>=12 THEN RETURN false;END IF;
  INSERT INTO marketing_private.behavior_sessions(id,owner_id) VALUES(p_session,owner) RETURNING * INTO s;
 END IF;
 IF s.owner_id<>owner OR s.started_at<statement_timestamp()-interval '4 hours' OR s.last_at<statement_timestamp()-interval '30 minutes' THEN RETURN false;END IF;
 SELECT coalesce(max(seq),0) INTO next_seq FROM marketing_private.task_events WHERE session_id=p_session;
 -- Validate entire batch before any write; partial acceptance would break idempotence.
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  SELECT EXISTS(SELECT 1 FROM marketing_private.task_events WHERE session_id=p_session AND seq=(item->>'seq')::integer AND task=item->>'task' AND kind=item->>'kind') INTO duplicate;
  IF NOT duplicate THEN
   IF (item->>'seq')::integer<>next_seq+1 OR EXISTS(SELECT 1 FROM marketing_private.task_events WHERE session_id=p_session AND task=item->>'task' AND kind=item->>'kind') THEN RETURN false;END IF;
   next_seq:=next_seq+1;
  END IF;
 END LOOP;
 -- Reject duplicate task/kind or sequence inside a new batch, without throwing into UX.
 IF (SELECT count(DISTINCT(value->>'seq'))<>count(*) OR count(DISTINCT(value->>'task',value->>'kind'))<>count(*) FROM jsonb_array_elements(p_items)) THEN RETURN false;END IF;
 INSERT INTO marketing_private.task_events(session_id,seq,task,kind)
 SELECT p_session,(value->>'seq')::smallint,value->>'task',value->>'kind' FROM jsonb_array_elements(p_items) ON CONFLICT DO NOTHING;
 UPDATE marketing_private.behavior_sessions SET last_at=clock_timestamp() WHERE id=p_session;
 RETURN true;
EXCEPTION WHEN lock_not_available OR query_canceled OR unique_violation THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.pazo_intelligence_record_v1(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_intelligence_record_v1(uuid,jsonb) TO authenticated;

CREATE FUNCTION public.pazo_intelligence_experience_v1(p_signal text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
BEGIN
 IF p_signal IS NULL OR NOT marketing_private.experience_signal_valid(p_signal) OR NOT marketing_private.intelligence_ready() THEN RETURN false;END IF;
 INSERT INTO marketing_private.experience_daily VALUES((statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date,p_signal,1)
 ON CONFLICT(day,signal) DO UPDATE SET requests=marketing_private.experience_daily.requests+1 WHERE marketing_private.experience_daily.requests<3000;
 RETURN FOUND;
EXCEPTION WHEN lock_not_available OR query_canceled THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.pazo_intelligence_experience_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_intelligence_experience_v1(text) TO service_role;

-- Existing Cron and withdrawal continue deleting sessions -> tasks by FK cascade.
ALTER FUNCTION marketing_private.prune_expired() RENAME TO prune_before_intelligence;
CREATE FUNCTION marketing_private.prune_expired() RETURNS integer LANGUAGE plpgsql SET search_path='' AS $$
DECLARE n integer;
BEGIN
 n:=marketing_private.prune_before_intelligence();
 DELETE FROM marketing_private.experience_daily WHERE day<=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-14;
 RETURN n;
END $$;

-- Source adapter, not a second event store. Only owner/time/closed metric projected.
-- Current business rows can disappear: these counts are not immutable event totals.
CREATE FUNCTION marketing_private.intelligence_facts(since_at timestamptz) RETURNS TABLE(owner uuid,at timestamptz,metric text)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT p.owner_id,i.created_at,'feed_'||i.action_type FROM public.interactions i JOIN public.pets p ON p.id=i.actor_pet_id WHERE i.created_at>=since_at AND i.action_type IN('impression','view','like','save')
 UNION ALL SELECT user_id,created_at,'feed_publish' FROM public.posts WHERE created_at>=since_at
 UNION ALL SELECT p.owner_id,c.created_at,'feed_comment' FROM public.post_comments c JOIN public.pets p ON p.id=c.author_pet_id WHERE c.created_at>=since_at
 UNION ALL SELECT p.owner_id,f.created_at,'profile_follow' FROM public.follows f JOIN public.pets p ON p.id=f.follower_id WHERE f.created_at>=since_at
 UNION ALL SELECT owner_id,created_at,'pet_create' FROM public.pets WHERE created_at>=since_at
 UNION ALL SELECT owner_user_id,created_at,'community_create' FROM public.communities WHERE created_at>=since_at
 UNION ALL SELECT user_id,joined_at,'community_join' FROM public.community_memberships WHERE joined_at>=since_at
 UNION ALL SELECT author_user_id,created_at,'community_publish' FROM public.community_posts WHERE created_at>=since_at
 UNION ALL SELECT p.owner_id,c.created_at,'community_comment' FROM public.community_post_comments c JOIN public.pets p ON p.id=c.author_pet_id WHERE c.created_at>=since_at
 UNION ALL SELECT p.owner_id,c.created_at,'community_like' FROM public.community_post_likes c JOIN public.pets p ON p.id=c.actor_pet_id WHERE c.created_at>=since_at
 UNION ALL SELECT p.owner_id,c.completed_at,'care_complete' FROM public.care_completions c JOIN public.pets p ON p.id=c.pet_id WHERE c.completed_at>=since_at
 UNION ALL SELECT user_id,created_at,CASE WHEN event_type='search_execute' AND had_results=false THEN 'search_empty' WHEN event_type='search_result_open' THEN 'search_result' ELSE event_type END FROM public.search_usage_events WHERE created_at>=since_at AND event_type IN('search_open','search_execute','search_result_open')
 UNION ALL SELECT user_id,created_at,'map_'||event_type FROM public.place_usage_events WHERE created_at>=since_at AND event_type IN('map_open','search','place_open','directions')
 UNION ALL SELECT user_id,created_at,'future_view'||'_'||module_key FROM public.module_validation_views WHERE created_at>=since_at AND module_key IN('communities_events','communities_challenges','communities_qa','communities_badges','communities_admin_tools','places_user_photos','places_reviews','places_events','places_routes','places_business_offers','places_favorites')
 UNION ALL SELECT user_id,created_at,'future_interest'||'_'||module_key FROM public.module_validation_interests WHERE created_at>=since_at AND module_key IN('communities_events','communities_challenges','communities_qa','communities_badges','communities_admin_tools','places_user_photos','places_reviews','places_events','places_routes','places_business_offers','places_favorites')
 UNION ALL SELECT user_id,updated_at,'future_intent_'||intent_key||'_'||module_key FROM public.module_validation_intents WHERE updated_at>=since_at AND module_key IN('communities_events','communities_challenges','communities_qa','communities_badges','communities_admin_tools','places_user_photos','places_reviews','places_events','places_routes','places_business_offers','places_favorites') AND intent_key IN('use','create','explore')
 UNION ALL SELECT s.owner_id,e.received_at,e.event FROM marketing_private.behavior_events e JOIN marketing_private.behavior_sessions s ON s.id=e.session_id WHERE e.received_at>=since_at AND e.event IN('care_created','qr_share_confirmed')
$$;

-- Consistent suppression across all/paid/unknown, six creatives and 7/14-day views.
-- Hiding only the selected small row would expose it by subtraction from All.
CREATE FUNCTION marketing_private.intelligence_cohort_safe(owners uuid[],recent uuid[]) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH people AS (
  SELECT o.owner,a.creative,CASE WHEN a.owner_id IS NULL THEN 'unknown' ELSE 'paid' END segment,
   o.owner=ANY(recent) is_recent
  FROM unnest(owners) o(owner) LEFT JOIN marketing_private.acquisition a ON a.owner_id=o.owner AND a.recorded_at>=statement_timestamp()-interval '14 days'
 ), groups AS (
  SELECT count(*) n,count(*) FILTER(WHERE is_recent) r FROM people GROUP BY segment
  UNION ALL SELECT count(*),count(*) FILTER(WHERE is_recent) FROM people GROUP BY creative
 ), total AS (SELECT count(*) n,count(*) FILTER(WHERE is_recent) r FROM people)
 SELECT coalesce((SELECT n>=10 AND n-r NOT BETWEEN 1 AND 9 FROM total),false)
 AND NOT EXISTS(SELECT 1 FROM groups g CROSS JOIN total t WHERE g.n BETWEEN 1 AND 9 OR t.n-g.n BETWEEN 1 AND 9
  OR g.r BETWEEN 1 AND 9 OR t.r-g.r BETWEEN 1 AND 9 OR g.n-g.r BETWEEN 1 AND 9)
$$;

CREATE FUNCTION public.pazo_admin_intelligence_summary_v1(p_days integer DEFAULT 7,p_segment text DEFAULT 'all',p_creative text DEFAULT 'all') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='3s' AS $$
DECLARE since_at timestamptz;start_at timestamptz;source_since timestamptz;healthy boolean;result jsonb;
BEGIN
 IF NOT public.pazo_is_admin() OR coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'admin MFA required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,30,90) OR p_segment IS NULL OR p_segment NOT IN('all','paid_attributed','unknown') OR p_creative IS NULL OR p_creative NOT IN('all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en') OR (p_segment='unknown' AND p_creative<>'all') THEN RAISE EXCEPTION 'invalid closed filter' USING ERRCODE='22023';END IF;
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
REVOKE ALL ON FUNCTION public.pazo_admin_intelligence_summary_v1(integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_intelligence_summary_v1(integer,text,text) TO authenticated;
REVOKE ALL ON FUNCTION marketing_private.intelligence_ready(),marketing_private.intelligence_task_valid(text),marketing_private.experience_signal_valid(text),marketing_private.intelligence_facts(timestamptz),marketing_private.intelligence_cohort_safe(uuid[],uuid[]),marketing_private.prune_expired() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

