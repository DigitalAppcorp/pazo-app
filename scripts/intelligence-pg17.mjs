import './behavior-pg17.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {sql,sqlAsync,file,runMockCron} from './marketing-sql-lab.mjs'
// Minimal source-schema doubles mirror inspected production columns, no content.
const tables={interactions:'actor_pet_id uuid,target_id uuid,action_type text',posts:'user_id uuid',post_comments:'author_pet_id uuid',follows:'follower_id uuid',communities:'owner_user_id uuid',community_memberships:'user_id uuid,joined_at timestamptz DEFAULT now()',community_posts:'author_user_id uuid',community_post_comments:'author_pet_id uuid',community_post_likes:'actor_pet_id uuid',care_completions:'pet_id uuid,completed_at timestamptz DEFAULT now()',search_usage_events:'user_id uuid,event_type text,had_results boolean',place_usage_events:'user_id uuid,event_type text',module_validation_views:"user_id uuid,module_key text DEFAULT 'communities_events'",module_validation_interests:"user_id uuid,module_key text DEFAULT 'communities_events'",module_validation_intents:"user_id uuid,module_key text DEFAULT 'communities_events',intent_key text,updated_at timestamptz DEFAULT now()"}
for(const [name,cols]of Object.entries(tables))sql(`CREATE TABLE public.${name}(id uuid DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),${cols})`)
const migration='supabase/migrations/20261029010000_pazo_product_intelligence.sql',source=fs.readFileSync(migration,'utf8')
let checks=0
const check=(v,m)=>{assert.ok(v,m);checks++}
assert.throws(()=>sql(source.replace(/COMMIT;\s*$/,`DO $$BEGIN RAISE EXCEPTION 'synthetic rollback';END $$;COMMIT;`)))
check(sql("SELECT to_regclass('marketing_private.task_events') IS NULL")==='t','DDL rolls back atomically')
file(migration)
const id=n=>'97000000-0000-4000-8000-'+String(n).padStart(12,'0')
const actor=(n,q,aal='aal2')=>`SET ROLE authenticated;SET "request.jwt.claim.sub"='${id(n)}';SET "request.jwt.claims"='{"aal":"${aal}"}';${q}`
const admin=q=>`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal2"}';${q}`
const batch=(sid,items)=>`SELECT public.pazo_intelligence_record_v1('${id(sid)}','${JSON.stringify(items).replaceAll("'","''")}'::jsonb)`
const event=(seq=1,task='care_create',kind='attempt')=>({seq,task,kind})
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) SELECT ('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,now()-interval '3 days',now()-interval '3 days' FROM generate_series(1,40)n;INSERT INTO public.profiles SELECT id,false FROM auth.users WHERE id::text LIKE '97000000%';UPDATE marketing_private.collection_gate SET behavior_enabled=true;UPDATE marketing_private.retention_runtime SET last_success_at=now()`)
check(sql(actor(1,batch(100,[event()])))==='f','independent OFF even with #150 ON')
check(sql("SELECT behavior_enabled AND intelligence_enabled=false FROM marketing_private.collection_gate")==='t','#150 flag preserved')
for(const role of ['anon','authenticated','service_role'])for(const table of ['task_events','experience_daily']){assert.throws(()=>sql(`SET ROLE ${role};SELECT * FROM marketing_private.${table}`));checks++}
assert.throws(()=>sql(actor(1,'SELECT public.pazo_admin_intelligence_summary_v1()')));checks++
assert.throws(()=>sql(admin(`SET "request.jwt.claims"='{"aal":"aal1"}';SELECT public.pazo_admin_intelligence_summary_v1()`)));checks++
check(JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1()'))).status==='paused','OFF report honest')
sql("UPDATE marketing_private.collection_gate SET intelligence_enabled=true,intelligence_started_at=now()-interval '2 days',intelligence_notice_version='pazo-intelligence-notice-v1'")
check(sql(actor(1,batch(100,[event(),event(2,'care_create','failure')])))==='t','valid closed batch')
check(sql(actor(1,batch(100,[event(),event(2,'care_create','failure')])))==='t','identical retry')
check(sql(actor(2,batch(100,[event(3,'qr_share')])))==='f','session cannot cross owner')
for(const items of [[event(3,'unknown')],[{...event(3),text:'secret'}],[event(3,'care_edit','success')],[event(4)],[event(3,'care_edit'),event(5,'care_undo')],[event(3,'care_edit'),event(3,'care_edit')]])check(sql(actor(1,batch(100,items)))==='f','invalid batch rejected')
check(sql(`SELECT count(*) FROM marketing_private.task_events WHERE session_id='${id(100)}'`)==='2','invalid batch never partially inserts events')
const race=await Promise.all(Array.from({length:12},()=>sqlAsync(actor(1,batch(100,[event(3,'care_edit')])))))
check(race.some(x=>x==='t')&&sql(`SELECT count(*) FROM marketing_private.task_events WHERE session_id='${id(100)}' AND seq=3`)==='1','concurrent retry exactly once')
for(let n=2;n<=20;n++)check(sql(actor(n,batch(100+n,[event()])))==='t','known synthetic eligible task population')
let report=JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1(30)')))
check(report.tasks.find(x=>x.task==='care_create'&&x.kind==='attempt').accounts===20&&report.effective_days===14,'exact account population and 14d clamp')
check(!report.tasks.some(x=>x.kind==='failure'),'k10 masks small subgroup without denominators')
sql(`INSERT INTO public.pets SELECT ('97000000-0000-4000-8000-'||lpad((1000+n)::text,12,'0'))::uuid,('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,now() FROM generate_series(1,20)n;INSERT INTO public.interactions(actor_pet_id,action_type) SELECT id,'like' FROM public.pets WHERE id::text LIKE '97000000%';INSERT INTO public.module_validation_interests(user_id) SELECT id FROM auth.users WHERE id::text LIKE '97000000%' LIMIT 20`)
report=JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1()')))
check(report.facts.find(x=>x.metric==='feed_like').accounts===20,'reuses actual interaction rows')
check(report.facts.find(x=>x.metric==='future_interest_communities_events').accounts===20,'reuses fake door rows, not a second store')
sql(`DELETE FROM public.interactions WHERE actor_pet_id='${id(1001)}' AND action_type='like'`)
const afterRemoval=JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1()')))
check(afterRemoval.facts.find(x=>x.metric==='feed_like').accounts===19&&!afterRemoval.facts.some(x=>x.metric==='feed_unlike'),'source deletion reduces current relation count; removal history never invented')
sql(`INSERT INTO public.interactions(actor_pet_id,action_type) VALUES('${id(1001)}','like')`)
check(!JSON.stringify(report).includes(id(1)),'no owner, session or target IDs in report')
check(report.facts.find(x=>x.metric==='feed_like').returning===null,'unobserved return cohort not fabricated')
const attribute=(from,to,creative)=>`INSERT INTO marketing_private.acquisition(owner_id,campaign,creative,first_touch_at,signup_verified_at,notice_version) SELECT id,'pazo_beta_local_202610','${creative}',email_confirmed_at-interval '1 hour',email_confirmed_at,'pazo-marketing-attribution-notice-v1' FROM auth.users WHERE id BETWEEN '${id(from)}' AND '${id(to)}'`
sql(attribute(1,11,'qr_es'))
for(const segment of ['all','paid_attributed','unknown']){
 const r=JSON.parse(sql(admin(`SELECT public.pazo_admin_intelligence_summary_v1(7,'${segment}')`)))
 check(!r.facts.some(x=>x.metric==='feed_like')&&!r.tasks.some(x=>x.task==='care_create'),'11 paid + 9 unknown cannot expose complement through '+segment)
}
sql(attribute(12,20,'qr_es'))
check(JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1()'))).facts.find(x=>x.metric==='feed_like').accounts===20,'one sufficiently large creative can be shown')
sql(`UPDATE marketing_private.acquisition SET creative='perfil_es' WHERE owner_id='${id(1)}'`)
check(!JSON.parse(sql(admin("SELECT public.pazo_admin_intelligence_summary_v1(7,'paid_attributed','qr_es')"))).facts.some(x=>x.metric==='feed_like'),'19 vs 1 creative cannot be revealed by filtering')
sql("DELETE FROM marketing_private.acquisition WHERE owner_id::text LIKE '97000000%';UPDATE marketing_private.collection_gate SET intelligence_started_at=now()-interval '13 days'")
sql(`UPDATE marketing_private.task_events SET received_at=now()-interval '8 days' WHERE session_id='${id(102)}';UPDATE marketing_private.behavior_sessions SET started_at=now()-interval '8 days',last_at=now()-interval '8 days' WHERE id='${id(102)}'`)
for(const days of [7,30])check(!JSON.parse(sql(admin(`SELECT public.pazo_admin_intelligence_summary_v1(${days})`))).tasks.some(x=>x.task==='care_create'),'20 vs 19 across 14/7 days cannot reveal one old account')
sql(`UPDATE marketing_private.task_events SET received_at=now() WHERE session_id='${id(102)}';UPDATE marketing_private.behavior_sessions SET started_at=now(),last_at=now() WHERE id='${id(102)}';UPDATE marketing_private.collection_gate SET intelligence_started_at=now()-interval '2 days'`)
sql(`UPDATE auth.users SET raw_app_meta_data='{"pazo_marketing_qa":true}' WHERE id='${id(20)}'`)
check(sql(actor(20,batch(120,[event(2,'care_edit')])))==='f','trusted QA excluded')
check(JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1()'))).tasks.find(x=>x.kind==='attempt').accounts===19,'QA excluded retroactively')
sql(actor(1,'SELECT public.pazo_behavior_withdraw_v1()'))
check(sql(`SELECT count(*) FROM marketing_private.task_events WHERE session_id='${id(100)}'`)==='0','withdraw cascades all new tasks')
check(sql(actor(1,batch(300,[event()])))==='f','withdraw cannot be bypassed')
check(JSON.parse(sql(admin('SELECT public.pazo_admin_intelligence_summary_v1()'))).facts.find(x=>x.metric==='feed_like').accounts===18,'withdraw excludes reused sources from this report')
for(const role of ['anon','authenticated']){assert.throws(()=>sql(`SET ROLE ${role};SELECT public.pazo_intelligence_experience_v1('demo_enter')`));checks++}
check(sql("SET ROLE service_role;SELECT public.pazo_intelligence_experience_v1('demo_enter')")==='t','only privileged challenge adapter can aggregate')
check(sql("SET ROLE service_role;SELECT public.pazo_intelligence_experience_v1('email@example.com')")==='f','anonymous closed vocabulary')
sql("UPDATE marketing_private.experience_daily SET requests=3000")
check(sql("SET ROLE service_role;SELECT public.pazo_intelligence_experience_v1('demo_enter')")==='f','daily anonymous budget')
check(JSON.parse(sql(admin("SELECT public.pazo_admin_intelligence_summary_v1(7,'unknown')"))).anonymous.length===0,'anonymous never joined into account segment')
sql(`UPDATE marketing_private.behavior_sessions SET started_at=now()-interval '15 days' WHERE id='${id(102)}';UPDATE marketing_private.experience_daily SET day=current_date-16`)
runMockCron()
check(sql(`SELECT count(*) FROM marketing_private.task_events WHERE session_id='${id(102)}'`)==='0'&&sql('SELECT count(*) FROM marketing_private.experience_daily')==='0','existing cron purges tasks and anonymous 14d')
sql("UPDATE marketing_private.retention_runtime SET last_success_at=now()-interval '2 days'")
check(sql(actor(3,batch(103,[event(2,'care_edit')])))==='f','retention failure closes new intake')
const out='artifacts/issue153';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/pg17.json',JSON.stringify({status:'PASS',checks,hostedWrites:0,environment:'disposable PostgreSQL17',migration},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',checks,hostedWrites:0,environment:'disposable PostgreSQL17'}))
