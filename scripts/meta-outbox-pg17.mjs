// Runs AFTER ads2-pg17.mjs against its fenced disposable PG17.
// The SQL is test-only: NEVER a hosted Supabase migration.
import assert from 'node:assert/strict'
import {sql,sqlAsync,file} from './marketing-sql-lab.mjs'
const before=sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g')
file('supabase/tests/marketing/meta-outbox-candidate.sql')
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),before)
const owner='16900000-0000-4000-8000-000000000001'
const inactive='16900000-0000-4000-8000-000000000002'
const late='16900000-0000-4000-8000-000000000003'
const qa='16900000-0000-4000-8000-000000000004'
const withdrawn='16900000-0000-4000-8000-000000000005'
const noGrant='16900000-0000-4000-8000-000000000006'
const create=uid=>sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at)
 VALUES('${uid}',now()-interval '3 minutes',now()-interval '1 minute');
 INSERT INTO public.profiles(id) VALUES('${uid}');`)
const record=uid=>`SET ROLE service_role;
 SELECT public.pazo_marketing_record_verified_v1('${uid}','qr_v2_en',now()-interval '4 minutes')`
const pref=uid=>sql(`INSERT INTO marketing_private.meta_purpose_candidate(
 owner_id,purpose,version,decision,decided_at,gpc_at_last_request,sharing_opt_out)
 VALUES('${uid}','meta_conversions_v1','pazo-meta-conversions-v1',
 'granted',now()-interval '2 minutes',false,false)`)
const count=uid=>sql(`SELECT count(*) FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${uid}'`)
const gate=()=>sql('SELECT enabled FROM marketing_private.meta_release_gate_candidate')
assert.equal(gate(),'f','independent provider switch must start OFF')
create(noGrant)
assert.equal(sql(record(noGrant)),'t')
assert.equal(count(noGrant),'0','provider OFF: no outbox even though first-party registered')
pref(noGrant)
sql('UPDATE marketing_private.meta_release_gate_candidate SET enabled=true WHERE singleton')
assert.equal(gate(),'t','synthetic laboratory only')
assert.equal(count(noGrant),'0','late opt-in never backfills older registration')

create(owner);pref(owner)
const results=await Promise.all(Array.from({length:8},()=>sqlAsync(record(owner))))
assert.equal(results.filter(v=>v==='t').length,1,'only one first-party registration under concurrency')
assert.equal(count(owner),'1','trigger must atomically mint exactly one event')
const eventId=sql(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`)
assert.match(eventId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
assert.equal(sql(record(owner)),'f','revisiting verified registration cannot mint another event')
assert.equal(sql(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`),eventId)

const leased=await Promise.all(Array.from({length:8},
 ()=>sqlAsync('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()')))
const active=leased.filter(Boolean)
assert.equal(active.length,1,'only one worker gets a live lease')
const [leasedOwner,leasedEvent,leasedAt,leaseToken]=active[0].split('|')
assert.equal(leasedOwner,owner)
assert.equal(leasedEvent,eventId,'worker must reuse verified event_id')
assert.match(leaseToken,/^[0-9a-f-]{36}$/)
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${leasedEvent}','11111111-1111-4111-8111-111111111111',true)`),'f','wrong lease cannot settle')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${leasedEvent}','${leaseToken}',false)`),'t','failed provider call becomes retryable')
const retry=sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()')
const [retryOwner,retryEvent,retryTime,retryLease]=retry.split('|')
assert.equal(retryOwner,owner)
assert.equal(retryEvent,eventId,'retry cannot mint another conversion')
assert.notEqual(retryLease,leaseToken,'fresh worker lease id')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${leasedEvent}','${leaseToken}',true)`),'f','old worker cannot settle after re-lease')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${retryEvent}','${retryLease}',true)`),'t','current worker settles')
assert.equal(sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()'),'')
assert.equal(sql(`SELECT event_time=(SELECT email_confirmed_at FROM auth.users
 WHERE id='${owner}') FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`),'t','event time is trusted verified time')

create(inactive);pref(inactive)
sql(`UPDATE marketing_private.meta_purpose_candidate SET
 gpc_at_last_request=true WHERE owner_id='${inactive}'`)
assert.equal(sql(record(inactive)),'t')
assert.equal(count(inactive),'0','GPC veto suppresses even atomic event mint')

create(late)
assert.equal(sql(record(late)),'t')
pref(late)
assert.equal(count(late),'0','consent written after confirmed registration cannot backfill')

create(qa);pref(qa)
assert.equal(sql(record(qa)),'t')
assert.equal(count(qa),'1','pre-existing opt-in can create a candidate')
sql(`UPDATE auth.users SET raw_app_meta_data='{"pazo_marketing_qa":true}'
 WHERE id='${qa}'`)
assert.equal(sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()'),'','QA excluded at send time')

create(withdrawn);pref(withdrawn)
assert.equal(sql(record(withdrawn)),'t')
assert.equal(count(withdrawn),'1')
sql(`UPDATE marketing_private.meta_purpose_candidate SET
 decision='withdrawn',withdrawn_at=now() WHERE owner_id='${withdrawn}'`)
assert.equal(sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()'),'','withdrawn grant suppresses pending event')

for(const role of ['anon','authenticated','service_role']){
  assert.throws(()=>sql(`SET ROLE ${role};SELECT * FROM marketing_private.meta_outbox_candidate`))
  assert.throws(()=>sql(`SET ROLE ${role};SELECT * FROM marketing_private.meta_purpose_candidate`))
  assert.throws(()=>sql(`SET ROLE ${role};SELECT * FROM marketing_private.meta_release_gate_candidate`))
}
assert.equal(sql(`SELECT bool_and(relrowsecurity AND relforcerowsecurity)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='marketing_private' AND c.relname IN(
 'meta_outbox_candidate','meta_purpose_candidate','meta_release_gate_candidate')`),'t')

sql(`DELETE FROM marketing_private.acquisition WHERE owner_id='${owner}'`)
assert.equal(count(owner),'0','withdrawing acquisition removes unsent/sent outbox')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${owner}'`),'1','privacy decision has separate lifecycle')
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),before)
console.log(JSON.stringify({status:'PASS',environment:'disposable PG17',
 atomicSignupAndEvent:true,concurrentFirstParty:8,concurrentLeases:8,
 oneTimeClaims:1,leaseFence:true,stableRetryId:true,revocationStopsPending:true,
 independentGateDefaultsOff:true,gpcExclusion:true,qaExclusion:true,
 noBackfill:true,rlsForced:true,retentionCascade:true,hostedWrites:0}))
