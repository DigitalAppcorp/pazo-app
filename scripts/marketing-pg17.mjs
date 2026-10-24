import assert from 'node:assert/strict'
import {prepareMarketingLab,sql,sqlAsync,file,runMockCron} from './marketing-sql-lab.mjs'
import {readFileSync} from 'node:fs'
await prepareMarketingLab()
let checks=0
const check=(value,message)=>{assert.ok(value,message);checks++}
const reject=(query)=>assert.throws(()=>sql(query))
check(sql("SELECT enabled::text||':'||retention_days FROM marketing_private.collection_gate")==='false:0','Default gate/policy untouched')
reject(readFileSync('supabase/operations/marketing-retention-cron-activation.sql','utf8'))
reject("UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now(),retention_days=30,policy_version=NULL")
reject('SELECT marketing_private.install_retention_schedule()')
sql("UPDATE marketing_private.collection_gate SET retention_days=30,policy_version='pazo-marketing-attribution-notice-v1'")
reject('SELECT marketing_private.install_retention_schedule()')
file('supabase/tests/marketing/cron-provider-mock.sql')
reject("SET cron.timezone='America/Los_Angeles';SELECT marketing_private.install_retention_schedule()")
const job=sql('SELECT marketing_private.install_retention_schedule()')
check(sql('SELECT marketing_private.install_retention_schedule()')===job,'Schedule idempotent')
reject('UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now()')
runMockCron()
sql('UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now()')
const result=await Promise.all(Array.from({length:40},()=>sqlAsync("SET ROLE service_role;SELECT public.pazo_marketing_record_landing_v1('comunidad_en')")))
check(result.filter(x=>x==='t').length>=30&&result.filter(x=>x==='t').length<=40,'Concurrent burst bounded')
check(sql('SELECT bool_and(accepted<=30) FROM marketing_private.landing_minute_budget')==='t','Minute ceilings preserved under concurrency')
check(Number(sql("SELECT sum(signals) FROM marketing_private.landing_daily"))===result.filter(x=>x==='t').length,'No counter divergence')
const owner='96000000-0000-4000-8000-000000000001'
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at) VALUES('${owner}',now()-interval '1 hour',now());INSERT INTO public.profiles VALUES('${owner}',false)`)
const acquisitions=await Promise.all(Array.from({length:12},()=>sqlAsync(`SET ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${owner}','perfil_es',now()-interval '2 hours')`)))
check(acquisitions.filter(x=>x==='t').length===1,'Unique attribution under concurrency')
sql(`INSERT INTO public.pets VALUES('96000000-0000-4000-8000-0000000000a1','${owner}',now()-interval '30 minutes'),('96000000-0000-4000-8000-0000000000a2','${owner}',now())`)
check(sql('SELECT coalesce(sum(first_pet_within_7d),0) FROM marketing_private.cohort_snapshot()')==='0','A later pet cannot replace the true first pet')
sql(`DELETE FROM public.pets WHERE owner_id='${owner}';UPDATE marketing_private.acquisition SET signup_verified_at=now()-interval '8 days',first_touch_at=now()-interval '8 days 1 hour' WHERE owner_id='${owner}';INSERT INTO public.pets SELECT '96000000-0000-4000-8000-0000000000a3','${owner}',signup_verified_at+interval '7 days' FROM marketing_private.acquisition WHERE owner_id='${owner}'`)
check(sql('SELECT coalesce(sum(first_pet_within_7d),0) FROM marketing_private.cohort_snapshot()')==='0','Exactly seven days is outside first-pet window')
sql(`UPDATE public.pets SET created_at=created_at-interval '1 microsecond' WHERE owner_id='${owner}'`)
check(sql('SELECT coalesce(sum(first_pet_within_7d),0) FROM marketing_private.cohort_snapshot()')==='1','First-pet window includes the instant before seven days')
for(const [exclude,restore] of [
 [`UPDATE public.profiles SET is_founder=true WHERE id='${owner}'`,`UPDATE public.profiles SET is_founder=false WHERE id='${owner}'`],
 [`INSERT INTO admin_private.admin_grants VALUES('${owner}')`,`DELETE FROM admin_private.admin_grants WHERE user_id='${owner}'`],
 [`INSERT INTO supporter_private.gradual_qa_accounts VALUES('${owner}','synthetic')`,`DELETE FROM supporter_private.gradual_qa_accounts WHERE owner_id='${owner}'`]]){
 sql(exclude);check(sql('SELECT count(*) FROM marketing_private.cohort_snapshot()')==='0','QA/founder/admin retroactive exclusion');sql(restore)
}
check(sql(`SET ROLE service_role;SELECT public.pazo_marketing_record_verified_v1('${owner}','qr_en',now()-interval '73 hours')`)==='f','Expired attribution rejected')
check(sql("SELECT bool_and(relrowsecurity AND relforcerowsecurity AND NOT has_table_privilege('anon',c.oid,'SELECT') AND NOT has_table_privilege('authenticated',c.oid,'INSERT') AND NOT has_table_privilege('service_role',c.oid,'SELECT')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='marketing_private' AND c.relkind='r'")==='t','All marketing tables FORCE RLS and deny direct access')
check(sql("SELECT ('2026-11-01T06:59:00Z'::timestamptz AT TIME ZONE 'America/Los_Angeles')::date='2026-10-31'::date AND ('2026-11-01T07:00:00Z'::timestamptz AT TIME ZONE 'America/Los_Angeles')::date='2026-11-01'::date") === 't','LA midnight and DST use named zone, not fixed UTC offset')
sql(`INSERT INTO cron.job_run_details(jobid,status,end_time) VALUES(${Number(job)},'failed',clock_timestamp())`)
check(sql("SET ROLE service_role;SELECT public.pazo_marketing_record_landing_v1('perfil_en')")==='f','Latest Cron failure stops ingestion despite an earlier fresh success')
runMockCron();sql('UPDATE cron.job SET active=false')
check(sql("SET ROLE service_role;SELECT public.pazo_marketing_record_landing_v1('perfil_en')")==='f','Disabled schedule immediately stops ingestion')
sql('UPDATE cron.job SET active=true')
sql("UPDATE cron.job_run_details SET end_time=now()-interval '8 hours'")
check(sql("SET ROLE service_role;SELECT public.pazo_marketing_record_landing_v1('perfil_en')")==='f','Stale deletion schedule stops ingest')
sql('UPDATE marketing_private.collection_gate SET enabled=false,enabled_at=NULL')
reject('UPDATE marketing_private.collection_gate SET retention_days=0,policy_version=NULL')
const lock=sqlAsync('BEGIN;SELECT pg_advisory_xact_lock(170096,1);SELECT pg_sleep(2);COMMIT')
let held=false
for(let i=0;i<15;i++){if(sql('SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype=\'advisory\' AND classid=170096 AND objid=1 AND granted)')==='t'){held=true;break}await new Promise(r=>setTimeout(r,30))}
check(held&&JSON.parse(sql('SELECT public.pazo_marketing_prune_all_v1()')).status==='busy','Overlapping purge does not pretend to have completed')
await lock
sql(`UPDATE marketing_private.acquisition SET recorded_at=now()-interval '31 days',signup_verified_at=now()-interval '31 days',first_touch_at=now()-interval '31 days 1 hour' WHERE owner_id='${owner}'`)
sql("INSERT INTO marketing_private.landing_daily VALUES(current_date-40,'pazo_beta_local_202610','perfil_en',5)")
const before=sql('SELECT row_to_json(r)::text FROM marketing_private.retention_runtime r')
sql("CREATE FUNCTION marketing_private.synthetic_delete_failure() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic deletion failure';END$$;CREATE TRIGGER fail_cleanup BEFORE DELETE ON marketing_private.landing_daily FOR EACH ROW EXECUTE FUNCTION marketing_private.synthetic_delete_failure()")
reject('SELECT public.pazo_marketing_prune_all_v1()')
check(sql('SELECT row_to_json(r)::text FROM marketing_private.retention_runtime r')===before,'Failed cleanup cannot advance success heartbeat')
check(sql('SELECT count(*) FROM marketing_private.acquisition')==='1','Failed cleanup rolls back earlier identity delete')
sql('DROP TRIGGER fail_cleanup ON marketing_private.landing_daily')
const cleanup=JSON.parse(runMockCron())
check(cleanup.acquisition_removed===1,'Scheduled cleanup works with collection OFF')
check(JSON.parse(runMockCron()).acquisition_removed===0,'Cleanup idempotent')
reject('SELECT marketing_private.remove_retention_schedule()')
sql('TRUNCATE marketing_private.landing_daily,marketing_private.landing_minute_budget')
check(sql('SELECT marketing_private.remove_retention_schedule()')==='t','Unschedule only after empty/off')
check(sql('SELECT marketing_private.remove_retention_schedule()')==='t','Unschedule idempotent')
check(sql("SELECT NOT has_function_privilege('service_role','marketing_private.install_retention_schedule()','EXECUTE') AND NOT has_function_privilege('authenticated','public.pazo_marketing_prune_all_v1()','EXECUTE')")==='t','Operator-only schedule / service-only cleanup')
// Leave a healthy, empty synthetic system for browser E2E. This is a provider
// mock, not hosted Cron evidence or approval of the fixture's 30-day policy.
sql('SELECT marketing_private.install_retention_schedule()');runMockCron();sql('UPDATE marketing_private.collection_gate SET enabled=true,enabled_at=now()')
console.log(`PASS ${checks} marketing PG17 checks plus legacy SQL; real concurrency, atomic deletion and explicit cron provider mock`)
