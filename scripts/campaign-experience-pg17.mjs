// Imports reset only the explicitly fenced, disposable laboratory, never hosted.
import './ads2-pg17.mjs'
import assert from 'node:assert/strict'
import {sql,file,runMockCron} from './marketing-sql-lab.mjs'
let checks=0
const check=(ok,name)=>{assert.ok(ok,name);checks++}
const admin=q=>`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal1"}';${q}`
const service=q=>`SET ROLE service_role;${q}`
const record=(creative,signal)=>sql(service(`SELECT public.pazo_intelligence_experience_campaign_v1('${creative}','${signal}')`))
const gate=()=>sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g')
const others=()=>sql("SELECT md5(string_agg(pg_get_functiondef(p.oid),E'\\n' ORDER BY p.proname)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('public','marketing_private') AND p.proname NOT IN('prune_expired','prune_before_campaign_experience','prune_before_intelligence','campaign_experience_ready','pazo_intelligence_experience_campaign_v1','pazo_admin_campaign_experience_v1') AND p.prokind='f'")
const others2=()=>sql("SELECT md5(string_agg(pg_get_functiondef(p.oid),E'\\n' ORDER BY p.proname)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('public','marketing_private') AND p.proname NOT LIKE 'prune_%' AND p.proname NOT IN('experience_detail_valid','experience_details_ready','pazo_experience_detail_v1','pazo_admin_experience_details_v1') AND p.prokind='f'")
const fingerprint=others(),before=sql("SELECT coalesce(sum(requests),0) FROM marketing_private.experience_daily")
file('supabase/migrations/20261102120000_pazo_campaign_experience.sql')
// Installed OFF: previous functions and counters untouched, nothing collected.
check(others()===fingerprint,'every existing function unchanged')
check(sql("SELECT campaign_experience_enabled FROM marketing_private.collection_gate")==='f','gate ships closed')
check(record('qr_v2_en','demo_enter')==='f','no collection while closed')
check(sql('SELECT count(*) FROM marketing_private.experience_campaign_daily')==='0','no rows while closed')
check(sql("SELECT coalesce(sum(requests),0) FROM marketing_private.experience_daily")===before,'global counter untouched while closed')
check(JSON.parse(sql(admin("SELECT public.pazo_admin_campaign_experience_v1(14,'all')"))).status==='paused','report says paused')
// Access boundaries.
assert.throws(()=>sql("SET ROLE anon;SELECT public.pazo_intelligence_experience_campaign_v1('qr_v2_en','demo_enter')"));checks++
assert.throws(()=>sql(admin("SELECT public.pazo_intelligence_experience_campaign_v1('qr_v2_en','demo_enter')")));checks++
assert.throws(()=>sql("SET ROLE authenticated;SET \"request.jwt.claim.sub\"='98000000-0000-4000-8000-000000000001';SELECT public.pazo_admin_campaign_experience_v1(14,'all')"));checks++
assert.throws(()=>sql("SET ROLE anon;SELECT public.pazo_admin_campaign_experience_v1(14,'all')"));checks++
assert.throws(()=>sql(admin('SELECT * FROM marketing_private.experience_campaign_daily')));checks++
assert.throws(()=>sql(admin("SELECT public.pazo_admin_campaign_experience_v1(5,'all')")));checks++
assert.throws(()=>sql(admin("SELECT public.pazo_admin_campaign_experience_v1(14,'hack')")));checks++
// Open only in this laboratory, two days ago so the start day is excluded by the reader.
sql("UPDATE marketing_private.collection_gate SET behavior_enabled=true,intelligence_enabled=true,intelligence_started_at=coalesce(intelligence_started_at,now()-interval '3 days'),intelligence_notice_version='pazo-intelligence-notice-v1',campaign_experience_enabled=true,campaign_experience_started_at=now()-interval '2 days',campaign_experience_notice_version='pazo-campaign-experience-notice-v1'")
sql("UPDATE marketing_private.retention_runtime SET last_success_at=now()")
check(sql('SELECT marketing_private.campaign_experience_ready()')==='t','ready once every gate is open')
check(record('hack','demo_enter')==='f','unknown creative refused');check(record('qr_v2_en','email')==='f','unknown signal refused')
sql('TRUNCATE marketing_private.experience_daily,marketing_private.experience_campaign_daily')
check(record('qr_v2_en','demo_enter')==='t','tagged signal accepted')
check(sql("SELECT requests FROM marketing_private.experience_daily WHERE signal='demo_enter'")==='1','global counter moves too')
check(sql("SELECT requests FROM marketing_private.experience_campaign_daily WHERE signal='demo_enter' AND creative='qr_v2_en'")==='1','campaign counter moves')
const columns=sql("SELECT string_agg(column_name,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='marketing_private' AND table_name='experience_campaign_daily'")
check(columns==='day,creative,signal,requests','table holds no identifier')
// Small samples never appear, on either side.
const seed=`INSERT INTO marketing_private.experience_daily VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date,'demo_pet',60),((now() AT TIME ZONE 'America/Los_Angeles')::date,'demo_home',25),((now() AT TIME ZONE 'America/Los_Angeles')::date,'demo_exit',40),((now() AT TIME ZONE 'America/Los_Angeles')::date,'welcome',30)
 ON CONFLICT(day,signal) DO UPDATE SET requests=excluded.requests;
 INSERT INTO marketing_private.experience_campaign_daily VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date,'qr_v2_en','demo_pet',20),((now() AT TIME ZONE 'America/Los_Angeles')::date,'app_v2_en','demo_pet',15),((now() AT TIME ZONE 'America/Los_Angeles')::date,'qr_v2_en','demo_home',4),((now() AT TIME ZONE 'America/Los_Angeles')::date,'qr_v2_en','demo_exit',36),((now() AT TIME ZONE 'America/Los_Angeles')::date,'qr_v2_en','welcome',30)
 ON CONFLICT(day,creative,signal) DO UPDATE SET requests=excluded.requests`
sql(seed)
const report=c=>JSON.parse(sql(admin(`SELECT public.pazo_admin_campaign_experience_v1(14,'${c}')`)))
const all=report('all'),row=(r,s)=>r.rows.find(x=>x.signal===s)
check(all.status==='observing','report observing')
check(row(all,'demo_pet').ads===35&&row(all,'demo_pet').other===25,'ads and no campaign separated')
check(!row(all,'demo_home'),'side under 10 hides the pair')
check(!row(all,'demo_exit'),'complement under 10 hides the pair')
check(row(all,'welcome').ads===30&&row(all,'welcome').other===0,'zero complement is safe')
const qr=report('qr_v2_en')
check(row(qr,'demo_pet').ads===20&&row(qr,'demo_pet').other===null,'single ad has no complement')
check(!row(qr,'demo_home'),'single ad small sample hidden')
check(all.rows.every(r=>Object.keys(r).sort().join()==='ads,other,signal'),'closed rows')
check(Object.keys(all).sort().join()==='as_of,coverage_since,creative,rows,status,version','closed envelope')
// The start day cannot mix pre-gate totals.
sql("UPDATE marketing_private.collection_gate SET campaign_experience_started_at=now()")
check(report('all').rows.length===0,'start day excluded')
sql("UPDATE marketing_private.collection_gate SET campaign_experience_started_at=now()-interval '2 days'")
// Retention follows the existing 14-day purge through the same Cron entry.
sql("INSERT INTO marketing_private.experience_campaign_daily VALUES((now() AT TIME ZONE 'America/Los_Angeles')::date-14,'qr_v2_en','welcome',12),((now() AT TIME ZONE 'America/Los_Angeles')::date-13,'qr_v2_en','welcome',13)")
sql('SELECT marketing_private.prune_expired()')
check(sql("SELECT count(*) FROM marketing_private.experience_campaign_daily WHERE day<=(now() AT TIME ZONE 'America/Los_Angeles')::date-14")==='0','day 14 purged')
check(sql("SELECT count(*) FROM marketing_private.experience_campaign_daily WHERE day=(now() AT TIME ZONE 'America/Los_Angeles')::date-13")==='1','day 13 kept')
runMockCron();checks++
// Second prepared migration: closed categories, same boundaries.
const fp2=others2()
file('supabase/migrations/20261102130000_pazo_experience_details.sql')
check(others2()===fp2,'existing functions unchanged by details')
check(sql('SELECT experience_details_enabled FROM marketing_private.collection_gate')==='f','details gate ships closed')
const detail=(k,v,c='')=>sql(service(`SELECT public.pazo_experience_detail_v1('${k}','${v}','${c}')`))
check(detail('signup_failure','age_required')==='f','no details while closed')
check(sql('SELECT count(*) FROM marketing_private.experience_detail_daily')==='0','no detail rows while closed')
assert.throws(()=>sql("SET ROLE anon;SELECT public.pazo_experience_detail_v1('signup_failure','other','')"));checks++
assert.throws(()=>sql(admin("SELECT public.pazo_experience_detail_v1('signup_failure','other','')")));checks++
assert.throws(()=>sql("SET ROLE authenticated;SET \"request.jwt.claim.sub\"='98000000-0000-4000-8000-000000000001';SELECT public.pazo_admin_experience_details_v1(14,'all')"));checks++
assert.throws(()=>sql(admin("SELECT public.pazo_admin_experience_details_v1(14,'hack')")));checks++
assert.throws(()=>sql(admin('SELECT * FROM marketing_private.experience_detail_daily')));checks++
sql("UPDATE marketing_private.collection_gate SET experience_details_enabled=true,experience_details_started_at=now()-interval '1 day',experience_details_notice_version='pazo-experience-details-notice-v1'")
check(detail('signup_failure','a@b.c')==='f','free text refused');check(detail('arrival_source','pet')==='f','value of another kind refused');check(detail('signup_failure','other','hack')==='f','forged ad refused')
check(detail('signup_failure','age_required')==='t','category accepted');check(detail('signup_failure','age_required','qr_v2_en')==='t','tagged category accepted')
const columns2=sql("SELECT string_agg(column_name,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='marketing_private' AND table_name='experience_detail_daily'")
check(columns2==='day,kind,value,creative,requests','table holds no identifier')
const today="(now() AT TIME ZONE 'America/Los_Angeles')::date"
sql(`TRUNCATE marketing_private.experience_detail_daily;INSERT INTO marketing_private.experience_detail_daily VALUES(${today},'signup_failure','age_required','',12),(${today},'signup_failure','age_required','qr_v2_en',20),(${today},'signup_failure','network','',4),(${today},'demo_last_screen','pet','app_v2_en',15),(${today},'arrival_source','search','',30),(${today},'arrival_source','social','qr_v2_en',50)`)
const details=s=>JSON.parse(sql(admin(`SELECT public.pazo_admin_experience_details_v1(14,'${s}')`)))
const find=(r,k,v)=>r.rows.find(x=>x.kind===k&&x.value===v)
const everything=details('all')
check(everything.status==='observing','details observing')
check(find(everything,'signup_failure','age_required').requests===32,'all scope adds both')
check(!find(everything,'signup_failure','network'),'under 10 hidden')
check(find(everything,'arrival_source','search').requests===30,'arrival without ad counted')
check(!find(everything,'arrival_source','social'),'arrival with ad never counted as no ad')
check(find(details('ads'),'signup_failure','age_required').requests===20,'ads scope')
check(!find(details('qr_v2_en'),'demo_last_screen','pet'),'other ad excluded')
check(find(details('app_v2_en'),'demo_last_screen','pet').requests===15,'one ad scope')
sql(`INSERT INTO marketing_private.experience_detail_daily VALUES(${today}-14,'signup_failure','other','',12),(${today}-13,'signup_failure','other','',13)`)
sql('SELECT marketing_private.prune_expired()')
check(sql(`SELECT count(*) FROM marketing_private.experience_detail_daily WHERE day<=${today}-14`)==='0','details day 14 purged')
check(sql(`SELECT count(*) FROM marketing_private.experience_detail_daily WHERE day=${today}-13`)==='1','details day 13 kept')
check(sql('SELECT count(*) FROM marketing_private.experience_campaign_daily WHERE day<=(now() AT TIME ZONE \'America/Los_Angeles\')::date-14')==='0','earlier purge chain still runs')
runMockCron();checks++
console.log(JSON.stringify({status:'PASS',checks,hostedWrites:0,environment:'disposable PostgreSQL17'}))
