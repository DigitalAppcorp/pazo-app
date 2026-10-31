// Runs AFTER ads2-pg17.mjs against its already-fenced disposable PG17.
// Never connects to hosted Supabase. Test-only SQL is NOT a migration.
import assert from 'node:assert/strict'
import {sql,sqlAsync,file} from './marketing-sql-lab.mjs'
const before=sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g')
file('supabase/tests/marketing/meta-outbox-candidate.sql')
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),before)
const owner='16900000-0000-4000-8000-000000000001'
const inactive='16900000-0000-4000-8000-000000000002'
const late='16900000-0000-4000-8000-000000000003'
const qa='16900000-0000-4000-8000-000000000004'
for(const uid of [owner,inactive,late,qa]){
  sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at)
    VALUES('${uid}',now()-interval '3 minutes',now()-interval '1 minute');
    INSERT INTO public.profiles(id) VALUES('${uid}');`)
  assert.equal(sql(`SET ROLE service_role;
    SELECT public.pazo_marketing_record_verified_v1('${uid}','qr_v2_en',now()-interval '4 minutes')`),'t')
}
const claim=uid=>`SET ROLE service_role;SELECT coalesce(public.pazo_meta_claim_candidate('${uid}')::text,'none')`
const prefs=(uid,extras='')=>`INSERT INTO marketing_private.meta_purpose_candidate(
 owner_id,purpose,version,decision,decided_at,gpc_at_last_request,sharing_opt_out)
 VALUES('${uid}','meta_conversions_v1','pazo-meta-conversions-v1',
 'granted',now()-interval '2 minutes',false,false)${extras};`
assert.equal(sql(claim(owner)),'none','no purpose decision means no external claim')
sql(prefs(owner))
const results=await Promise.all(Array.from({length:8},()=>sqlAsync(claim(owner))))
const ids=results.filter(x=>x!=='none')
assert.equal(ids.length,1,'exactly one claim created under 8 concurrent requests')
assert.match(ids[0],/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
assert.equal(sql(claim(owner)),'none','refresh and retry cannot mint another conversion')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`),'1')
assert.equal(sql(`SELECT event_time=(SELECT email_confirmed_at FROM auth.users
 WHERE id='${owner}') FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`),'t','event time is trusted verification time')
sql(prefs(inactive))
sql(`UPDATE marketing_private.meta_purpose_candidate
 SET gpc_at_last_request=true WHERE owner_id='${inactive}'`)
assert.equal(sql(claim(inactive)),'none','GPC veto is a hard gate')
sql(prefs(late))
sql(`UPDATE marketing_private.meta_purpose_candidate
 SET decided_at=now() WHERE owner_id='${late}'`)
assert.equal(sql(claim(late)),'none','consent after verification cannot retroactively claim')
sql(prefs(qa))
sql(`UPDATE auth.users SET raw_app_meta_data='{"pazo_marketing_qa":true}'
 WHERE id='${qa}'`)
assert.equal(sql(claim(qa)),'none','retroactive QA is excluded')
for(const role of ['anon','authenticated','service_role']){
  assert.throws(()=>sql(`SET ROLE ${role};
    SELECT * FROM marketing_private.meta_outbox_candidate`))
  assert.throws(()=>sql(`SET ROLE ${role};
    SELECT * FROM marketing_private.meta_purpose_candidate`))
}
assert.equal(sql(`SELECT bool_and(relrowsecurity AND relforcerowsecurity)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='marketing_private'
 AND c.relname IN('meta_outbox_candidate','meta_purpose_candidate')`),'t')
sql(`DELETE FROM marketing_private.acquisition WHERE owner_id='${owner}'`)
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`),'0','withdrawal removes related outbound outbox')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${owner}'`),'1','consent history remains separately accountable')
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),before)
console.log(JSON.stringify({status:'PASS',environment:'disposable PG17',
 oneTimeClaims:1,concurrentRequests:8,gpcExclusion:true,qaExclusion:true,
 preConsentOnly:true,rlsForced:true,retentionCascade:true,hostedWrites:0}))
