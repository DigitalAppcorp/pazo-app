// No remote credentials/URLs: the shared transport is fenced to disposable PG17.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {sql} from './marketing-sql-lab.mjs'
import {visualAdmin} from './admin-visual-fixture.mjs'
if(process.env.PAZO_ANALYTICS_REUSE_LAB!=='true')await import('./admin-visual-pg17.mjs')
const out='artifacts/admin-visual/issue161';fs.mkdirSync(out,{recursive:true})
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++}
const tx=q=>sql('BEGIN;'+q+'ROLLBACK;'),last=s=>JSON.parse(s.split('\n').at(-1))
const tables=['acquisition','behavior_sessions','behavior_events','task_events','prereg_daily','experience_daily','landing_daily']
const state=()=>sql(`SELECT jsonb_build_object(${tables.map(t=>`'${t}',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]') FROM marketing_private.${t} t)`).join(',')},'gate',(SELECT row_to_json(g) FROM marketing_private.collection_gate g))`)
const before=state(),admin='96000000-0000-4000-8000-000000000031'
check(sql(`SELECT marketing_private.is_eligible_owner('${admin}')`) ==='f','authenticated admin is already excluded in the shared owner eligibility')
check(tx(`SET LOCAL ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${admin}','perfil_es',now());`)==='f','admin cannot become a campaign acquisition')
check(tx(`SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claim.sub"='${admin}';SELECT public.pazo_behavior_record_v1('98300000-0000-4000-8000-000000000001',1,'home','screen_view','none');`)==='f','authenticated admin cannot create an observed user session')
check(tx(`SET LOCAL ROLE authenticated;SET LOCAL "request.jwt.claim.sub"='${admin}';SELECT public.pazo_intelligence_record_v1('98300000-0000-4000-8000-000000000001','[{"seq":1,"task":"care_create","kind":"attempt"}]');`)==='f','admin task traffic remains excluded')
// Reproduce the incident as anonymous counters. There is deliberately no owner,
// campaign or anonymous identifier to recover the operator after logout.
const single=last(tx(`DELETE FROM marketing_private.experience_daily WHERE signal IN('login_open','login_attempt');
 SET LOCAL ROLE service_role;
 SELECT public.pazo_intelligence_experience_v1('login_open');SELECT public.pazo_intelligence_experience_v1('login_attempt');
 RESET ROLE;${visualAdmin("SELECT public.pazo_admin_intelligence_summary_v1(30,'all','all')")};`))
check(!single.anonymous.some(r=>r.signal.startsWith('login_')),'one request stays below the existing publication threshold')
const repeated=last(tx(`DELETE FROM marketing_private.experience_daily WHERE signal IN('login_open','login_attempt');
 SET LOCAL ROLE service_role;
 SELECT public.pazo_intelligence_experience_v1('login_open') FROM generate_series(1,10);
 SELECT public.pazo_intelligence_experience_v1('login_attempt') FROM generate_series(1,10);
 RESET ROLE;${visualAdmin("SELECT public.pazo_admin_intelligence_summary_v1(30,'all','all')")};`))
const logins=repeated.anonymous.filter(r=>r.signal.startsWith('login_'))
check(logins.length===2&&logins.every(r=>r.requests===10),'repeated requests are counters, not a unique-person population')
check(logins.every(r=>Object.keys(r).sort().join(',')==='requests,signal'),'anonymous report contains no owner, campaign, session or inferred success')
const campaign=last(tx(`INSERT INTO marketing_private.experience_daily VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date,'login_attempt',10)
 ON CONFLICT(day,signal) DO UPDATE SET requests=10;${visualAdmin("SELECT public.pazo_admin_intelligence_summary_v1(30,'paid_attributed','qr_es')")};`))
check(campaign.anonymous.length===0,'campaign filter cannot attribute anonymous access counters to ads')
const baseline=last(sql(visualAdmin("SELECT public.pazo_admin_visual_summary_v1(14,'all','all','all')")))
const withRequests=last(tx(`SET LOCAL ROLE service_role;SELECT public.pazo_intelligence_experience_v1('login_attempt');RESET ROLE;
 ${visualAdmin("SELECT public.pazo_admin_visual_summary_v1(14,'all','all','all')")};`))
for(const field of ['totals','segments','funnel','moves','last_steps','return_modules','creatives'])check(JSON.stringify(withRequests[field])===JSON.stringify(baseline[field]),field+' cannot change because an anonymous login request arrived')
check(withRequests.landing_requests===baseline.landing_requests,'anonymous experience cannot increment campaign landing requests')
for(const role of ['anon','authenticated'])check(assert.throws(()=>tx(`SET LOCAL ROLE ${role};SELECT public.pazo_intelligence_experience_v1('login_open');`),/permission denied/)===undefined,role+' cannot bypass the challenge Edge into the privileged anonymous intake')
// A genuine new verified account remains eligible. The privileged Edge owns
// this call; clients cannot supply an owner to it directly.
const owner='98300000-0000-4000-8000-000000000099'
check(tx(`INSERT INTO auth.users(id,created_at,email_confirmed_at,is_anonymous) VALUES('${owner}',now(),now(),false);
 INSERT INTO public.profiles(id,is_founder) VALUES('${owner}',false);
 SET LOCAL ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${owner}','perfil_es',now());`)==='t','new eligible verified account still accepts the established attribution contract')
check(tx(`INSERT INTO auth.users(id,created_at,email_confirmed_at,is_anonymous,raw_app_meta_data) VALUES('${owner}',now(),now(),false,'{"pazo_marketing_qa":true}');
 INSERT INTO public.profiles(id,is_founder) VALUES('${owner}',false);
 SET LOCAL ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${owner}','perfil_es',now());`)==='f','QA exclusions still apply to verified registrations')
check(last(tx(`INSERT INTO marketing_private.experience_daily VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date-15,'login_attempt',1);
 SELECT marketing_private.prune_expired();SELECT to_json(count(*)=0) FROM marketing_private.experience_daily WHERE day<(now() AT TIME ZONE 'America/Los_Angeles')::date-14;`))===true,'existing retention still removes expired anonymous aggregates')
check(state()===before,'all adversarial fixtures rolled back; no aggregate history or collection gate changed')
const result={status:'PASS',checks,environment:'disposable PostgreSQL17',cause:'anonymous requests have no account/campaign join; admin owner traffic already excluded',historicalDeletion:false,hostedWrites:0}
fs.writeFileSync(out+'/pg17.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
