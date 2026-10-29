-- Read-only projection of existing #150 observations. No collection or gate changes.
-- PREPARED ONLY; install in production only with final launch approval.
BEGIN;
CREATE FUNCTION public.pazo_admin_visual_summary_v1(
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
 OR p_creative IS NULL OR p_creative NOT IN('all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en')
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
     AND v.creative IN('perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en') AND v.n>=10
     AND (p_creative='all' OR v.creative=p_creative)),'[]') ELSE '[]'::jsonb END
 ) INTO result FROM flags;
 RETURN result;
END
$report$;
REVOKE ALL ON FUNCTION public.pazo_admin_visual_summary_v1(integer,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.pazo_admin_visual_summary_v1(integer,text,text,text) TO authenticated;
COMMIT;
