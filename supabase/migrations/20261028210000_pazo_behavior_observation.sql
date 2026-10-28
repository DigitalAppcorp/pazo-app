-- #150 PREPARED ONLY. Independent collection OFF; no production installation authorized.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE marketing_private.collection_gate ADD COLUMN behavior_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN behavior_started_at timestamptz, ADD COLUMN behavior_notice_version text;
CREATE TABLE marketing_private.behavior_suppression(owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE marketing_private.behavior_sessions(
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_seq integer NOT NULL DEFAULT 0 CHECK(last_seq BETWEEN 0 AND 120));
CREATE INDEX behavior_owner_start ON marketing_private.behavior_sessions(owner_id,started_at);
CREATE TABLE marketing_private.behavior_events(
 session_id uuid NOT NULL REFERENCES marketing_private.behavior_sessions(id) ON DELETE CASCADE,
 seq integer NOT NULL,received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 event text NOT NULL CHECK(event IN('screen_view','loading','error','retry','care_created','qr_share_confirmed')),
 screen text NOT NULL CHECK(screen IN('home','pet','qr','agenda','communities','places','explore','first_pet')),
 category text NOT NULL DEFAULT 'none' CHECK(category IN('none','network','unavailable')),
 PRIMARY KEY(session_id,seq));
CREATE TABLE marketing_private.prereg_daily(
 day date NOT NULL,creative text NOT NULL CHECK(creative IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')),
 step text NOT NULL CHECK(step IN('signup_cta','signup_start','signup_requested','signup_error')),
 signals integer NOT NULL CHECK(signals BETWEEN 0 AND 3000),PRIMARY KEY(day,creative,step));
ALTER TABLE marketing_private.behavior_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.behavior_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.behavior_events FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.behavior_suppression ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.behavior_suppression FORCE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.prereg_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_private.prereg_daily FORCE ROW LEVEL SECURITY;
REVOKE ALL ON marketing_private.behavior_sessions,marketing_private.behavior_events,marketing_private.behavior_suppression,marketing_private.prereg_daily FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION marketing_private.behavior_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce((SELECT enabled AND behavior_enabled AND behavior_started_at<=statement_timestamp()
  AND behavior_notice_version='pazo-behavior-notice-v1' AND retention_days=14
  AND marketing_private.retention_ready(retention_days,policy_version) FROM marketing_private.collection_gate WHERE singleton),false)
$$;
CREATE FUNCTION marketing_private.behavior_eligible(owner uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT marketing_private.is_eligible_owner(owner)
 AND NOT EXISTS(SELECT 1 FROM marketing_private.behavior_suppression WHERE owner_id=owner)
 AND NOT EXISTS(SELECT 1 FROM marketing_private.utility_suppression WHERE owner_id=owner AND expires_at>statement_timestamp())
$$;
CREATE FUNCTION public.pazo_behavior_record_v1(p_session uuid,p_seq integer,p_screen text,p_event text,p_category text DEFAULT 'none') RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
DECLARE owner uuid:=auth.uid();s marketing_private.behavior_sessions;
BEGIN
 IF owner IS NULL OR p_session IS NULL OR p_seq IS NULL OR p_seq NOT BETWEEN 1 AND 110
 OR p_screen IS NULL OR p_screen NOT IN('home','pet','qr','agenda','communities','places','explore','first_pet')
 OR p_event IS NULL OR p_event NOT IN('screen_view','loading','error','retry')
 OR p_category IS NULL OR p_category NOT IN('none','network','unavailable')
 OR (p_event<>'error' AND p_category<>'none')
 OR NOT marketing_private.behavior_ready() OR NOT marketing_private.behavior_eligible(owner) THEN RETURN false;END IF;
 -- Serialize account budget and independent session creation, without delaying product writes.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pazo_behavior:'||owner::text,0));
 IF NOT marketing_private.behavior_ready() OR NOT marketing_private.behavior_eligible(owner) THEN RETURN false;END IF;
 SELECT * INTO s FROM marketing_private.behavior_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND THEN
  IF p_seq<>1 OR (SELECT count(*) FROM marketing_private.behavior_sessions WHERE owner_id=owner AND started_at>statement_timestamp()-interval '1 day')>=12 THEN RETURN false;END IF;
  INSERT INTO marketing_private.behavior_sessions(id,owner_id) VALUES(p_session,owner) RETURNING * INTO s;
 END IF;
 IF s.owner_id<>owner OR s.started_at<statement_timestamp()-interval '4 hours' OR s.last_at<statement_timestamp()-interval '30 minutes' THEN RETURN false;END IF;
 IF p_seq<=s.last_seq THEN RETURN EXISTS(SELECT 1 FROM marketing_private.behavior_events WHERE session_id=p_session AND seq=p_seq AND event=p_event AND screen=p_screen AND category=p_category);END IF;
 IF p_seq<>s.last_seq+1 THEN RETURN false;END IF;
 INSERT INTO marketing_private.behavior_events(session_id,seq,event,screen,category) VALUES(p_session,p_seq,p_event,p_screen,p_category);
 UPDATE marketing_private.behavior_sessions SET last_seq=p_seq,last_at=clock_timestamp() WHERE id=p_session;
 RETURN true;
EXCEPTION WHEN lock_not_available OR query_canceled THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.pazo_behavior_record_v1(uuid,integer,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_behavior_record_v1(uuid,integer,text,text,text) TO authenticated;

-- Outcomes are written by committed domain operations, never by the navigation RPC.
CREATE FUNCTION marketing_private.behavior_success(owner uuid,kind text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path='' AS $$
DECLARE sid uuid;next_seq integer;
BEGIN
 IF NOT marketing_private.behavior_ready() OR NOT marketing_private.behavior_eligible(owner) THEN RETURN;END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pazo_behavior:'||owner::text,0));
 IF NOT marketing_private.behavior_ready() OR NOT marketing_private.behavior_eligible(owner) THEN RETURN;END IF;
 SELECT id INTO sid FROM marketing_private.behavior_sessions WHERE owner_id=owner
 AND started_at>statement_timestamp()-interval '4 hours' AND last_at>statement_timestamp()-interval '30 minutes'
 ORDER BY last_at DESC LIMIT 1 FOR UPDATE;
 IF sid IS NULL THEN RETURN;END IF;
 -- Server outcomes occupy negative slots, independent of client retry sequence.
 SELECT coalesce(min(seq),0)-1 INTO next_seq FROM marketing_private.behavior_events WHERE session_id=sid AND seq<0;
 IF next_seq < -10 THEN RETURN;END IF;
 INSERT INTO marketing_private.behavior_events(session_id,seq,event,screen)
 VALUES(sid,next_seq,kind,CASE kind WHEN 'care_created' THEN 'agenda' ELSE 'qr' END);
END $$;
CREATE FUNCTION marketing_private.behavior_care_success() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
BEGIN
 PERFORM marketing_private.behavior_success((SELECT owner_id FROM public.pets WHERE id=NEW.pet_id),'care_created');RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
CREATE TRIGGER pazo_behavior_care AFTER INSERT ON public.care_items FOR EACH ROW EXECUTE FUNCTION marketing_private.behavior_care_success();
CREATE FUNCTION marketing_private.behavior_qr_success() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
BEGIN
 IF NEW.qr_share_confirmed_at IS NOT NULL AND (TG_OP='INSERT' OR OLD.qr_share_confirmed_at IS NULL) THEN
 PERFORM marketing_private.behavior_success(NEW.owner_id,'qr_share_confirmed');END IF;RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
CREATE TRIGGER pazo_behavior_qr AFTER INSERT OR UPDATE ON marketing_private.utility_outcomes FOR EACH ROW EXECUTE FUNCTION marketing_private.behavior_qr_success();

CREATE FUNCTION public.pazo_behavior_withdraw_v1() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN false;END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pazo_behavior:'||auth.uid()::text,0));
 INSERT INTO marketing_private.behavior_suppression VALUES(auth.uid()) ON CONFLICT DO NOTHING;
 DELETE FROM marketing_private.behavior_sessions WHERE owner_id=auth.uid();RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.pazo_behavior_withdraw_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_behavior_withdraw_v1() TO authenticated;

CREATE FUNCTION public.pazo_marketing_prereg_signal_v1(p_creative text,p_step text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' SET lock_timeout='100ms' AS $$
BEGIN
 IF NOT marketing_private.behavior_ready() OR p_creative IS NULL OR p_creative NOT IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')
 OR p_step IS NULL OR p_step NOT IN('signup_cta','signup_start','signup_requested','signup_error') THEN RETURN false;END IF;
 INSERT INTO marketing_private.prereg_daily(day,creative,step,signals) VALUES((statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date,p_creative,p_step,1)
 ON CONFLICT(day,creative,step) DO UPDATE SET signals=marketing_private.prereg_daily.signals+1 WHERE marketing_private.prereg_daily.signals<3000;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.pazo_marketing_prereg_signal_v1(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_prereg_signal_v1(text,text) TO service_role;

-- Preserve previous acquisition counter and existing Cron chain; no new schedule.
CREATE OR REPLACE FUNCTION marketing_private.prune_expired() RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE days smallint;version text;removed integer;
BEGIN
 DELETE FROM marketing_private.behavior_sessions WHERE started_at<statement_timestamp()-interval '14 days' OR NOT marketing_private.behavior_eligible(owner_id);
 DELETE FROM marketing_private.prereg_daily WHERE day<=(statement_timestamp() AT TIME ZONE 'America/Los_Angeles')::date-14;
 DELETE FROM marketing_private.utility_suppression WHERE expires_at<=statement_timestamp();
 DELETE FROM marketing_private.utility_outcomes WHERE registered_at<statement_timestamp()-interval '14 days' OR NOT marketing_private.is_eligible_owner(owner_id);
 SELECT g.retention_days,g.policy_version INTO days,version FROM marketing_private.collection_gate g WHERE singleton FOR SHARE;
 IF days IS NULL OR days<=0 OR version IS DISTINCT FROM 'pazo-marketing-attribution-notice-v1' THEN RETURN 0;END IF;
 DELETE FROM marketing_private.acquisition WHERE recorded_at<statement_timestamp()-make_interval(days=>days);
 GET DIAGNOSTICS removed=ROW_COUNT;RETURN removed;
END $$;
CREATE OR REPLACE FUNCTION public.pazo_marketing_withdraw_v1(p_owner uuid) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_owner IS NULL THEN RETURN false;END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pazo_behavior:'||p_owner::text,0));
 INSERT INTO marketing_private.behavior_suppression SELECT id FROM auth.users WHERE id=p_owner ON CONFLICT DO NOTHING;
 DELETE FROM marketing_private.behavior_sessions WHERE owner_id=p_owner;
 DELETE FROM marketing_private.acquisition WHERE owner_id=p_owner;
 DELETE FROM marketing_private.utility_outcomes WHERE owner_id=p_owner;
 INSERT INTO marketing_private.utility_suppression(owner_id,expires_at) SELECT id,email_confirmed_at+interval '14 days' FROM auth.users WHERE id=p_owner AND email_confirmed_at+interval '14 days'>statement_timestamp() ON CONFLICT(owner_id) DO NOTHING;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.pazo_marketing_withdraw_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_marketing_withdraw_v1(uuid) TO service_role;
REVOKE ALL ON FUNCTION marketing_private.behavior_ready(),marketing_private.behavior_eligible(uuid),marketing_private.behavior_success(uuid,text),marketing_private.behavior_care_success(),marketing_private.behavior_qr_success() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.pazo_admin_behavior_summary_v1(p_days integer DEFAULT 7,p_segment text DEFAULT 'all',p_creative text DEFAULT 'all') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' SET statement_timeout='5s' AS $$
DECLARE since_at timestamptz;start_at timestamptz;healthy boolean;result jsonb;cutoff timestamptz;
BEGIN
 IF NOT public.pazo_is_admin() THEN RAISE EXCEPTION 'admin required' USING ERRCODE='42501';END IF;
 IF coalesce(auth.jwt()->>'aal','')<>'aal2' THEN RAISE EXCEPTION 'mfa_required' USING ERRCODE='42501';END IF;
 IF p_days IS NULL OR p_days NOT IN(7,30,90) OR p_segment IS NULL OR p_segment NOT IN('all','paid_attributed','unknown')
 OR p_creative IS NULL OR p_creative NOT IN('all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')
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
  SELECT session_id,owner_id,screen,lead(screen) OVER(PARTITION BY session_id ORDER BY seq) next_screen FROM events WHERE event='screen_view' AND seq>0
 ), paths AS (
  SELECT screen,next_screen,count(DISTINCT owner_id) accounts FROM ordered_views GROUP BY screen,next_screen HAVING count(DISTINCT owner_id)>=10
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
  'funnel',coalesce((SELECT jsonb_agg(jsonb_build_object('step',step,'accounts',CASE WHEN n=0 OR n>=10 THEN n ELSE NULL END,'denominator',CASE WHEN denominator=0 OR denominator>=10 THEN denominator ELSE NULL END)) FROM stages WHERE (SELECT verified FROM funnel)>=10 AND NOT EXISTS(SELECT 1 FROM stages WHERE n BETWEEN 1 AND 9 OR denominator-n BETWEEN 1 AND 9)),'[]'::jsonb),
  'paths',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM paths ORDER BY accounts DESC,screen,next_screen LIMIT 12)p),'[]'::jsonb) ELSE '[]'::jsonb END,
  'issues',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM (SELECT * FROM issues ORDER BY accounts DESC LIMIT 12)i),'[]'::jsonb) ELSE '[]'::jsonb END,
  'return_modules',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM returning_modules r),'[]'::jsonb) ELSE '[]'::jsonb END,
  'return_actions',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM first_actions a),'[]'::jsonb) ELSE '[]'::jsonb END,
  'outcomes',CASE WHEN safe.ok THEN coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM outcomes o),'[]'::jsonb) ELSE '[]'::jsonb END,
  'paid_retention',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM paid_retention r WHERE matured>=10 AND (reopened=0 OR reopened>=10) AND (useful=0 OR useful>=10) AND (matured-reopened=0 OR matured-reopened>=10) AND (reopened-useful=0 OR reopened-useful>=10)),'[]'::jsonb),
  'retention',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM retention r WHERE matured>=10 AND (reopened=0 OR reopened>=10) AND (useful=0 OR useful>=10) AND (matured-reopened=0 OR matured-reopened>=10) AND (reopened-useful=0 OR reopened-useful>=10)),'[]'::jsonb),
  'prereg',coalesce((SELECT jsonb_agg(jsonb_build_object('step',step,'signals',signals)) FROM (
    SELECT step,sum(signals) signals FROM marketing_private.prereg_daily WHERE day>=(since_at AT TIME ZONE 'America/Los_Angeles')::date
    AND (p_creative='all' OR creative=p_creative) GROUP BY step)q),'[]'::jsonb),
  'landing_signals',coalesce((SELECT sum(signals) FROM marketing_private.landing_daily WHERE landing_day>=(since_at AT TIME ZONE 'America/Los_Angeles')::date AND (p_creative='all' OR creative=p_creative)),0)
 ) INTO result FROM population,safe;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pazo_admin_behavior_summary_v1(integer,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_behavior_summary_v1(integer,text,text) TO authenticated;
COMMIT;
