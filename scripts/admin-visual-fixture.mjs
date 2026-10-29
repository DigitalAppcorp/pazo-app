// Test-only synthetic population. The transport accepts only the fenced local
// Docker/CI laboratory, never a hosted URL. This is not a production seed.
import {sql} from './marketing-sql-lab.mjs'
export function seedVisualFixture(){
 sql(`
 TRUNCATE marketing_private.behavior_events,marketing_private.behavior_sessions,marketing_private.acquisition,marketing_private.landing_daily CASCADE;
 UPDATE marketing_private.retention_runtime SET last_success_at=now();
 UPDATE marketing_private.collection_gate SET behavior_enabled=true,behavior_started_at=now()-interval '14 days';
 CREATE TEMP TABLE visual_clock AS SELECT (now() AT TIME ZONE 'America/Los_Angeles')::date today,
  least(interval '1 hour',(now()-((now() AT TIME ZONE 'America/Los_Angeles')::date::timestamp AT TIME ZONE 'America/Los_Angeles'))/2) AS clock_offset;
 CREATE TEMP TABLE visual_people AS SELECT n,((n-1)%40)+1 AS position,
  ('98000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid id,
  CASE WHEN n<=40 THEN 'qr_es' WHEN n<=80 THEN 'perfil_es' END creative,
  ((c.today-13)::timestamp AT TIME ZONE 'America/Los_Angeles')+c.clock_offset/4 verified_at,
  ((c.today-13)::timestamp AT TIME ZONE 'America/Los_Angeles')+c.clock_offset/2 pet_at
 FROM generate_series(1,120)n CROSS JOIN visual_clock c;
 INSERT INTO auth.users(id,created_at,email_confirmed_at)
  SELECT id,verified_at,verified_at FROM visual_people
  ON CONFLICT(id) DO UPDATE SET email_confirmed_at=excluded.email_confirmed_at,created_at=excluded.created_at;
 INSERT INTO public.profiles(id) SELECT id FROM visual_people ON CONFLICT DO NOTHING;
 DELETE FROM public.pets WHERE id::text LIKE '98100000-%';
 INSERT INTO public.pets(id,owner_id,created_at)
  SELECT ('98100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,id,pet_at FROM visual_people WHERE n>80 OR position>10;
 INSERT INTO marketing_private.acquisition(owner_id,campaign,creative,first_touch_at,signup_verified_at,notice_version,recorded_at)
  SELECT id,'pazo_beta_local_202610',creative,verified_at,verified_at,'pazo-marketing-attribution-notice-v1',verified_at FROM visual_people WHERE creative IS NOT NULL;
 CREATE TEMP TABLE visual_sessions AS SELECT p.*,
  ('98200000-0000-4000-8000-'||lpad((p.n*100+d)::text,12,'0'))::uuid sid,
  ((c.today-d)::timestamp AT TIME ZONE 'America/Los_Angeles')+c.clock_offset AS at
 FROM visual_people p CROSS JOIN visual_clock c CROSS JOIN generate_series(0,13)d
 WHERE p.position<=10*(1+d%4);
 INSERT INTO marketing_private.behavior_sessions(id,owner_id,started_at,last_at,last_seq)
  SELECT sid,id,at,at,4 FROM visual_sessions;
 INSERT INTO marketing_private.behavior_events(session_id,seq,received_at,event,screen)
  SELECT sid,1,at,'screen_view','home' FROM visual_sessions;
 INSERT INTO marketing_private.behavior_events(session_id,seq,received_at,event,screen)
  SELECT sid,2,at,'screen_view','pet' FROM visual_sessions WHERE n>80 OR position>20;
 INSERT INTO marketing_private.behavior_events(session_id,seq,received_at,event,screen)
  SELECT sid,3,at,'screen_view',CASE WHEN n<=40 THEN 'qr' WHEN n<=80 OR n>100 THEN 'agenda' ELSE 'communities' END
  FROM visual_sessions WHERE n>80 OR position>20;
 INSERT INTO marketing_private.behavior_events(session_id,seq,received_at,event,screen)
  SELECT sid,4,at,'screen_view','places' FROM visual_sessions WHERE n BETWEEN 81 AND 100;
 INSERT INTO marketing_private.behavior_events(session_id,seq,received_at,event,screen)
  SELECT sid,CASE WHEN n<=40 THEN -2 ELSE -1 END,at,
   CASE WHEN n<=40 THEN 'qr_share_confirmed' ELSE 'care_created' END,
   CASE WHEN n<=40 THEN 'qr' ELSE 'agenda' END
  FROM visual_sessions WHERE (n<=80 AND position>30) OR n>100;
 INSERT INTO marketing_private.landing_daily(landing_day,creative,signals)
  SELECT today,creative,640 FROM visual_clock CROSS JOIN (VALUES('qr_es'),('perfil_es'))v(creative);
 `)
}
export const visualAdmin=(q,aal='aal1')=>`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"${aal}"}';${q}`
export function visualReport(days=14,segment='all',creative='all',audience='all'){
 const quote=v=>"'"+String(v).replaceAll("'","''")+"'"
 return JSON.parse(sql(visualAdmin(`SELECT public.pazo_admin_visual_summary_v1(${Number(days)},${quote(segment)},${quote(creative)},${quote(audience)})`)))
}
