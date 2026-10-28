import assert from 'node:assert/strict'
import {prepareMarketingLab,sql,sqlAsync,file,runMockCron} from './marketing-sql-lab.mjs'
import {readdirSync} from 'node:fs'
await prepareMarketingLab()
sql('CREATE TABLE public.care_items(id uuid PRIMARY KEY,pet_id uuid NOT NULL REFERENCES public.pets(id),title text NOT NULL)')
const migration=readdirSync('supabase/migrations').find(x=>x.endsWith('_pazo_first_utility_outcomes.sql'))
assert.ok(migration);file('supabase/migrations/'+migration)
let checks=0
const check=(value,message)=>{assert.ok(value,message);checks++}
const reject=query=>{assert.throws(()=>sql(query));checks++}
const id=n=>'97000000-0000-4000-8000-'+String(n).padStart(12,'0')
const owner=id(1),pet=id(2),other=id(3),admin=id(4)
const actor=query=>`SET ROLE authenticated;SET "request.jwt.claim.sub"='${owner}';${query}`
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES
 ('${owner}',now()-interval '1 day',now()-interval '1 day'),('${other}',now(),now()),('${admin}',now(),now());
 INSERT INTO public.profiles(id) VALUES('${owner}'),('${other}'),('${admin}');
 INSERT INTO public.pets VALUES('${pet}','${owner}',now()-interval '23 hours');
 INSERT INTO admin_private.admin_grants VALUES('${admin}')`)
check(sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`))==='f','new gate is OFF')
reject(`SET ROLE anon;SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`)
for(const role of ['anon','authenticated','service_role'])for(const table of ['utility_outcomes','utility_suppression'])
 reject(`SET ROLE ${role};SELECT * FROM marketing_private.${table}`)
reject(actor("SELECT public.pazo_admin_first_utility_summary(30)"))
sql("UPDATE marketing_private.collection_gate SET retention_days=14,policy_version='pazo-marketing-attribution-notice-v1'")
file('supabase/tests/marketing/cron-provider-mock.sql');sql('SELECT marketing_private.install_retention_schedule()');runMockCron()
sql("UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now(),utility_enabled=true,utility_started_at=now()-interval '2 days',utility_notice_version='pazo-first-utility-notice-v1'")
check(sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','care_created')`))==='f','browser cannot assert care')
check(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='${other}';SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`)==='f','other account rejected')
const burst=await Promise.all(Array.from({length:16},()=>sqlAsync(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`))))
check(burst.every(x=>x==='t')&&sql('SELECT count(*) FROM marketing_private.utility_outcomes')==='1','concurrent retries idempotent')
check(sql('SELECT first_utility_at IS NULL FROM marketing_private.utility_outcomes')==='t','QR visible is auxiliary')
sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_download_initiated')`))
check(sql('SELECT first_utility_at IS NULL FROM marketing_private.utility_outcomes')==='t','download initiation never means first utility completed')
sql(`BEGIN;INSERT INTO public.care_items VALUES('${id(5)}','${pet}','private test care');ROLLBACK`)
check(sql('SELECT care_created_at IS NULL FROM marketing_private.utility_outcomes')==='t','rolled-back care does not count')
sql(`INSERT INTO public.care_items VALUES('${id(5)}','${pet}','private test care')`)
check(sql('SELECT care_created_at IS NOT NULL AND first_utility_at IS NOT NULL FROM marketing_private.utility_outcomes')==='t','real care persisted and counted atomically')
check(sql(`SELECT count(*) FROM public.care_items WHERE id='${id(5)}'`)==='1','actual data row exists')
let lockFinished=false
const locked=sqlAsync("SET application_name='utility-lock-test';BEGIN;SELECT owner_id FROM marketing_private.utility_outcomes FOR UPDATE;SELECT pg_sleep(3);COMMIT").finally(()=>{lockFinished=true})
for(let i=0;i<30;i++){
 if(sql("SELECT count(*) FROM pg_stat_activity WHERE application_name='utility-lock-test' AND wait_event='PgSleep'")==='1')break
 await new Promise(r=>setTimeout(r,25))
}
check(!lockFinished,'analytics row lock established')
sql(`INSERT INTO public.care_items VALUES('${id(7)}','${pet}','care despite locked analytics')`)
check(!lockFinished&&sql(`SELECT count(*) FROM public.care_items WHERE id='${id(7)}'`)==='1','care succeeds while optional analytics row is locked')
await locked
let report=JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='${admin}';SELECT public.pazo_admin_first_utility_summary(30)`))
const group=report.groups.find(x=>x.segment==='organic')
check(report.effective_days===14&&group.first_utility_accounts===1&&group.qr_visible_accounts===1&&group.care_created_accounts===1,'aggregate neutral cohort and independent outcomes')
check(!JSON.stringify(report).includes(owner)&&!JSON.stringify(report).includes('private test care'),'no identity or care content in report')
reject(`SET ROLE authenticated;SET "request.jwt.claim.sub"='${admin}';SELECT public.pazo_admin_first_utility_summary(1000)`)
sql(`UPDATE auth.users SET raw_app_meta_data='{"pazo_marketing_qa":true}' WHERE id='${owner}'`)
check(sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_share_confirmed')`))==='f','trusted QA excluded')
report=JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='${admin}';SELECT public.pazo_admin_first_utility_summary(30)`))
check(report.groups.every(x=>x.first_utility_accounts===0),'retroactive QA excluded from reporting')
sql(`UPDATE auth.users SET raw_app_meta_data='{}' WHERE id='${owner}'`)
sql(`UPDATE marketing_private.utility_outcomes SET first_utility_at=now()-interval '8 days',last_meaningful_day=current_date-1 WHERE owner_id='${owner}'`)
sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_share_confirmed')`))
check(sql('SELECT return_d7_at IS NOT NULL FROM marketing_private.utility_outcomes')==='t','meaningful D7 is observed only with a mature window')
sql('UPDATE marketing_private.utility_outcomes SET return_d7_at=NULL,last_meaningful_day=current_date')
sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_share_confirmed')`))
check(sql('SELECT return_d7_at IS NOT NULL FROM marketing_private.utility_outcomes')==='t','same-day dedup does not hide crossing the D7 maturity boundary')
sql('UPDATE marketing_private.collection_gate SET enabled=false,enabled_at=NULL')
check(sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`))==='f','existing global emergency OFF remains valid with utility enabled')
sql('UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now()')
sql(`SET ROLE service_role;SELECT public.pazo_marketing_withdraw_v1('${owner}')`)
check(sql('SELECT count(*) FROM marketing_private.utility_outcomes')==='0','existing withdrawal deletes outcomes')
check(sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`))==='f','withdrawal cannot recollect during cohort window')
sql(`DELETE FROM marketing_private.utility_suppression WHERE owner_id='${owner}';UPDATE marketing_private.collection_gate SET utility_enabled=false`)
sql(`INSERT INTO public.care_items VALUES('${id(6)}','${pet}','care while analytics paused')`)
check(sql(`SELECT count(*) FROM public.care_items WHERE id='${id(6)}'`)==='1'&&sql('SELECT count(*) FROM marketing_private.utility_outcomes')==='0','analytics pause never blocks care')
sql("UPDATE marketing_private.collection_gate SET utility_enabled=true")
sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`))
sql("UPDATE marketing_private.utility_outcomes SET registered_at=now()-interval '15 days'")
sql('SELECT public.pazo_marketing_prune_all_v1()')
check(sql('SELECT count(*) FROM marketing_private.utility_outcomes')==='0','existing Cron purge removes expired outcomes')
sql(actor(`SELECT public.pazo_marketing_record_utility_v1('${pet}','qr_visible')`))
sql(`DELETE FROM auth.users WHERE id='${owner}'`)
check(sql('SELECT count(*) FROM marketing_private.utility_outcomes')==='0','account deletion cascades')
console.log(JSON.stringify({suite:'first-utility-pg17',checks,status:'PASS',isolated:true}))
