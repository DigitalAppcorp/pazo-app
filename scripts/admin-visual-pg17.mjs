// The imported suites recreate ONLY the fenced disposable laboratory.
import './intelligence-pg17.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {sql,file} from './marketing-sql-lab.mjs'
import {seedVisualFixture,visualReport} from './admin-visual-fixture.mjs'
const adminId='96000000-0000-4000-8000-000000000031'
const actor=(id,aal,q)=>`SET ROLE authenticated;SET "request.jwt.claim.sub"='${id}';SET "request.jwt.claims"='{"aal":"${aal}"}';${q}`
const admin=(q,aal='aal1')=>actor(adminId,aal,q)
const signatures=['public.pazo_admin_behavior_summary_v1(integer,text,text)','public.pazo_admin_intelligence_summary_v1(integer,text,text)']
const definitions=signatures.map(s=>sql(`SELECT pg_get_functiondef('${s}'::regprocedure)`))
const sensitiveFingerprint=()=>sql("SELECT md5(string_agg(pg_get_functiondef(p.oid),E'\\n' ORDER BY p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('public','marketing_private') AND p.prokind='f' AND p.proname NOT IN('pazo_admin_behavior_summary_v1','pazo_admin_intelligence_summary_v1')")
const fingerprint=sensitiveFingerprint()
const gate=sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g')
const grants=()=>sql("SELECT jsonb_agg(jsonb_build_array(oid,proacl,prosecdef,provolatile,proconfig) ORDER BY oid) FROM pg_proc WHERE oid IN('public.pazo_admin_behavior_summary_v1(integer,text,text)'::regprocedure,'public.pazo_admin_intelligence_summary_v1(integer,text,text)'::regprocedure)")
const beforeGrants=grants()
let checks=0
for(const name of ['behavior','intelligence']){assert.throws(()=>sql(admin(`SELECT public.pazo_admin_${name}_summary_v1()`)));checks++}
const accessSource=fs.readFileSync('supabase/migrations/20261029120000_pazo_analytics_admin_read_access.sql','utf8')
assert.throws(()=>sql(accessSource.replace("guard:='IF NOT public.pazo_is_admin()","guard:='unexpected IF NOT public.pazo_is_admin()")));checks++
assert.deepEqual(signatures.map(s=>sql(`SELECT pg_get_functiondef('${s}'::regprocedure)`)),definitions);checks++
file('supabase/migrations/20261029120000_pazo_analytics_admin_read_access.sql')
assert.equal(grants(),beforeGrants);checks++
assert.equal(sensitiveFingerprint(),fingerprint);checks++
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),gate);checks++
for(const name of ['behavior','intelligence']){
 const q=`SELECT public.pazo_admin_${name}_summary_v1()`
 const low=JSON.parse(sql(admin(q))),high=JSON.parse(sql(admin(q,'aal2')))
 delete low.as_of;delete high.as_of
 assert.deepEqual(low,high);checks++
 for(const id of ['97000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000000']){assert.throws(()=>sql(actor(id,'aal1',q)));checks++}
 assert.throws(()=>sql('SET ROLE anon;'+q));checks++
 assert.throws(()=>sql('SET ROLE service_role;'+q));checks++
 assert.throws(()=>sql(actor('97000000-0000-4000-8000-000000000003','aal2',`SET "request.jwt.claims"='{"aal":"aal2","user_metadata":{"is_admin":true}}';${q}`)));checks++
 assert.throws(()=>sql(admin(`SELECT public.pazo_admin_${name}_summary_v1(7,'organic')`)));checks++
}
// Deliberately rerunning the migration must fail closed and atomically, not
// silently broaden a second authorization check or rewrite unrelated code.
assert.throws(()=>file('supabase/migrations/20261029120000_pazo_analytics_admin_read_access.sql'));checks++
assert.equal(sensitiveFingerprint(),fingerprint);checks++
assert.ok(definitions.every(d=>d.includes('aal2')));checks++
fs.mkdirSync('artifacts/admin-visual',{recursive:true})
const result={status:'PASS',checks,hostedWrites:0,environment:'disposable PostgreSQL17',adminAggregateReads:'aal1 allowed',nonAdmin:'denied',sensitiveFunctions:'unchanged',collectionGate:'unchanged'}
fs.writeFileSync('artifacts/admin-visual/access-pg17.json',JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result))

const projection='supabase/migrations/20261029121000_pazo_admin_visual_summary.sql'
const source=fs.readFileSync(projection,'utf8')
assert.throws(()=>sql(source.replace(/COMMIT;\s*$/,`DO $$BEGIN RAISE EXCEPTION 'synthetic rollback';END $$;COMMIT;`)))
assert.equal(sql("SELECT to_regprocedure('public.pazo_admin_visual_summary_v1(integer,text,text,text)') IS NULL"),'t')
file(projection)
seedVisualFixture()
let projectionChecks=2
const check=(v,m)=>{assert.ok(v,m);projectionChecks++}
const full=visualReport()
check(full.status==='observing','healthy existing source')
assert.deepEqual(full.totals,{accounts:120,sessions:990,useful:40,returning:120});projectionChecks++
assert.deepEqual(full.funnel.map(r=>r.accounts),[80,60,40,20]);projectionChecks++
check(full.landing_requests===1280,'requests are separate from verified accounts')
check(full.trend.length===14&&new Set(full.trend.map(r=>r.accounts)).size===4,'calendar trend from actual rows, not invented interpolation')
check(full.last_steps.reduce((n,r)=>n+r.sessions,0)===990,'last observed screen is counted once per viewed session')
check(full.moves.length===5&&full.creatives.length===2,'actual transitions and creative comparisons')
// Received order may differ from navigation sequence. Ten synthetic accounts
// avoid creating a protected cell while testing the sequence rule explicitly.
sql(`INSERT INTO marketing_private.behavior_events(session_id,seq,received_at,event,screen)
 SELECT s.id,v.seq,now()-v.age,v.kind,v.screen FROM marketing_private.behavior_sessions s
 CROSS JOIN (VALUES(10,interval '2 seconds','screen_view','qr'),(11,interval '10 seconds','screen_view','agenda'),(12,interval '-1 day','screen_view','places'))v(seq,age,kind,screen)
 WHERE s.owner_id BETWEEN '98000000-0000-4000-8000-000000000001'::uuid AND '98000000-0000-4000-8000-000000000010'::uuid
 AND (s.started_at AT TIME ZONE 'America/Los_Angeles')::date=(now() AT TIME ZONE 'America/Los_Angeles')::date;`)
const sequenced=visualReport()
check(sequenced.last_steps.find(r=>r.screen==='agenda')?.sessions===full.last_steps.find(r=>r.screen==='agenda').sessions+10,'highest positive sequence wins over received_at')
check(sequenced.last_steps.find(r=>r.screen==='qr')?.sessions===full.last_steps.find(r=>r.screen==='qr').sessions,'later-received older view cannot win')
check(sequenced.last_steps.find(r=>r.screen==='places')?.sessions===full.last_steps.find(r=>r.screen==='places').sessions,'future observations excluded')
sql('DELETE FROM marketing_private.behavior_events WHERE seq IN(10,11,12)')
const dataState=()=>sql('SELECT jsonb_build_array((SELECT row_to_json(g) FROM marketing_private.collection_gate g),(SELECT count(*) FROM marketing_private.behavior_events),(SELECT count(*) FROM marketing_private.behavior_sessions),(SELECT count(*) FROM marketing_private.acquisition))')
const beforeReads=dataState()
for(const days of [7,14])for(const [segment,audience]of [['all','all'],['paid_attributed','all'],['unknown','all'],['all','returning']]){
 const r=visualReport(days,segment,'all',audience)
 check(r.totals.accounts===(segment==='paid_attributed'?80:segment==='unknown'?40:120),'source/audience cohort count')
 check(r.trend.length===days,'closed calendar window')
 check(r.moves.every(x=>x.accounts>=10),'no small journey cell')
 check(!JSON.stringify(r).includes('98000000'),'no owner or session identifiers escape')
}
const creative=visualReport(14,'paid_attributed','qr_es')
check(creative.totals.accounts===40&&creative.totals.useful===10&&creative.segments.all===40,'creative scope includes its actual denominator')
check(visualReport(14,'unknown').landing_requests===null&&visualReport(14,'all','all','returning').landing_requests===null,'anonymous requests never become an account journey')
assert.equal(dataState(),beforeReads);projectionChecks++
for(const args of ["15,'all','all','all'","14,'organic','all','all'","14,'all','email@example.com','all'","14,'unknown','qr_es','all'","14,'all','all','first'"]){assert.throws(()=>sql(admin(`SELECT public.pazo_admin_visual_summary_v1(${args})`)));projectionChecks++}
for(const role of ['anon','service_role']){assert.throws(()=>sql(`SET ROLE ${role};SELECT public.pazo_admin_visual_summary_v1()`));projectionChecks++}
assert.throws(()=>sql(actor('98000000-0000-4000-8000-000000000001','aal2','SELECT public.pazo_admin_visual_summary_v1()')));projectionChecks++
// Add ONE synthetic first-time account/creative. The cube must not leak it by
// querying all/paid/unknown, returning, creative, or 7/14-day differences.
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES('98000000-0000-4000-8000-000000000121',now(),now());
 INSERT INTO public.profiles(id) VALUES('98000000-0000-4000-8000-000000000121');
 INSERT INTO marketing_private.acquisition(owner_id,campaign,creative,first_touch_at,signup_verified_at,notice_version,recorded_at)
 VALUES('98000000-0000-4000-8000-000000000121','pazo_beta_local_202610','perfil_en',now(),now(),'pazo-marketing-attribution-notice-v1',now());
 INSERT INTO marketing_private.behavior_sessions(id,owner_id) VALUES('98200000-0000-4000-8000-000000012100','98000000-0000-4000-8000-000000000121');
 INSERT INTO marketing_private.behavior_events(session_id,seq,event,screen) VALUES('98200000-0000-4000-8000-000000012100',1,'screen_view','home');`)
for(const days of [7,14])for(const [segment,audience]of [['all','all'],['paid_attributed','all'],['unknown','all'],['all','returning']]){
 const r=visualReport(days,segment,'all',audience)
 check(r.totals===null&&r.segments===null,'global suppression across repeated closed filters')
 check(r.trend.every(d=>d.accounts===null&&d.returning===null),'protected is not zero')
}
fs.writeFileSync('artifacts/admin-visual/protected-synthetic.json',JSON.stringify(visualReport(),null,2)+'\n')
sql("DELETE FROM auth.users WHERE id='98000000-0000-4000-8000-000000000121'")
const after=visualReport();delete after.as_of;const expected={...full};delete expected.as_of
assert.deepEqual(after,expected);projectionChecks++
sql('UPDATE marketing_private.collection_gate SET behavior_enabled=false')
const paused=visualReport();check(paused.status==='paused'&&paused.totals===null&&paused.funnel.length===0,'source paused is distinct from a zero result')
sql('UPDATE marketing_private.collection_gate SET behavior_enabled=true')
fs.writeFileSync('artifacts/admin-visual/representative.json',JSON.stringify(visualReport(),null,2)+'\n')
const projectionResult={status:'PASS',checks:projectionChecks,hostedWrites:0,environment:'disposable PostgreSQL17',coverage:'calendar, source, creative, returning, ordered funnel, last-by-sequence, strict filters, suppression, read-only, rollback'}
fs.writeFileSync('artifacts/admin-visual/projection-pg17.json',JSON.stringify(projectionResult,null,2)+'\n')
console.log(JSON.stringify(projectionResult))
