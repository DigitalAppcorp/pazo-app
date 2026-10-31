// Runs AFTER ads2-pg17.mjs against its fenced disposable PG17.
// The SQL is test-only: NEVER a hosted Supabase migration.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
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
const ownerEventCount=count(owner)
if(ownerEventCount!=='1') {
 const diag=sql(`SELECT (
  SELECT row_to_json(x) FROM (
   SELECT
    a.signup_verified_at=u.email_confirmed_at AS verify_match,
    a.signup_verified_at<=statement_timestamp() AS verify_not_future,
    a.signup_verified_at>=statement_timestamp()-interval '15 minutes' AS fresh_verified,
    a.recorded_at>=statement_timestamp()-interval '15 minutes' AS fresh_recorded,
    p.decided_at<=statement_timestamp() AS grant_persisted,
    p.decision='granted' AS granted,
    p.gpc_at_last_request IS FALSE AS no_gpc,
    p.sharing_opt_out IS FALSE AS no_opt_out,
    marketing_private.is_eligible_owner(a.owner_id) AS eligible,
    (SELECT enabled FROM marketing_private.meta_release_gate_candidate) AS release_enabled
   FROM marketing_private.acquisition a JOIN auth.users u ON u.id=a.owner_id
    JOIN marketing_private.meta_purpose_candidate p ON p.owner_id=a.owner_id
   WHERE a.owner_id='${owner}'
  ) x
 )`)
 console.error('LAB_ONLY_META_ENQUEUE_DIAGNOSTIC',diag)
}
assert.equal(ownerEventCount,'1','trigger must atomically mint exactly one event')
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
assert.equal(sql(`SET ROLE service_role;
 SELECT owner_id::text FROM public.pazo_meta_check_claim_candidate(
  '${leasedEvent}','${leaseToken}')`),owner,'current worker sees only its eligible private policy')
const syntheticUA='Mozilla/5.0 (PAZO synthetic verified registration browser)'
const syntheticEmail='pazo-synthetic-verified@example.invalid'
sql(`UPDATE auth.users SET email='${syntheticEmail}' WHERE id='${owner}'`)
const expectedHash=createHash('sha256').update(syntheticEmail).digest('hex')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_capture_ua_candidate(
 '${owner}','Mozilla/5.0 (PAZO synthetic verified registration browser)')`),'t',
 'one genuine lab consented event may capture its browser UA')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_capture_ua_candidate(
 '${owner}','Mozilla/5.0 (different later browser)')`),'f',
 'later browser cannot overwrite the original UA')
assert.equal(sql(`SET ROLE service_role;SELECT * FROM public.pazo_meta_read_match_candidate(
 '${leasedEvent}','${leaseToken}')`),expectedHash+'|'+syntheticUA,
 'hash remains server-side, tied to lease and original browser snapshot')
assert.equal(sql(`SET ROLE service_role;SELECT * FROM public.pazo_meta_read_match_candidate(
 '${leasedEvent}','11111111-1111-4111-8111-111111111111')`),'',
 'stale lease cannot read personal matching material')
for(const role of ['anon','authenticated']){
 assert.throws(()=>sql(`SET ROLE ${role};
  SELECT * FROM public.pazo_meta_read_match_candidate('${leasedEvent}','${leaseToken}')`))
 assert.throws(()=>sql(`SET ROLE ${role};
  SELECT public.pazo_meta_capture_ua_candidate('${owner}','${syntheticUA}')`))
}

assert.equal(sql(`SET ROLE service_role;
 SELECT owner_id::text FROM public.pazo_meta_check_claim_candidate(
  '${leasedEvent}','11111111-1111-4111-8111-111111111111')`),'',
 'unowned/stale lease gets no privacy attestation')
assert.throws(()=>sql(`SET ROLE anon;
 SELECT * FROM public.pazo_meta_check_claim_candidate(
  '${leasedEvent}','${leaseToken}')`))
assert.throws(()=>sql(`SET ROLE authenticated;
 SELECT * FROM public.pazo_meta_check_claim_candidate(
  '${leasedEvent}','${leaseToken}')`))

assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${leasedEvent}','11111111-1111-4111-8111-111111111111','sent')`),'f','wrong lease cannot settle')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${leasedEvent}','${leaseToken}','retryable')`),'t','failed provider call becomes retryable')
const retry=sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()')
const [retryOwner,retryEvent,retryTime,retryLease]=retry.split('|')
assert.equal(retryOwner,owner)
assert.equal(retryEvent,eventId,'retry cannot mint another conversion')
assert.notEqual(retryLease,leaseToken,'fresh worker lease id')
assert.equal(sql(`SET ROLE service_role;
 SELECT owner_id::text FROM public.pazo_meta_check_claim_candidate(
  '${leasedEvent}','${leaseToken}')`),'','re-leased worker fences stale privacy read')
assert.equal(sql(`SET ROLE service_role;
 SELECT owner_id::text FROM public.pazo_meta_check_claim_candidate(
  '${retryEvent}','${retryLease}')`),owner,'new lease is authorized')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
  '${retryEvent}','${retryLease}','bad_status')`),'f','settlement requires typed state')

assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${leasedEvent}','${leaseToken}','sent')`),'f','old worker cannot settle after re-lease')
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${retryEvent}','${retryLease}','sent')`),'t','current worker settles')
assert.equal(sql(`SET ROLE service_role;
 SELECT owner_id::text FROM public.pazo_meta_check_claim_candidate(
  '${retryEvent}','${retryLease}')`),'','settled event must not issue another privacy proof')
assert.equal(sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()'),'')
assert.equal(sql(`SELECT event_time=(SELECT email_confirmed_at FROM auth.users
 WHERE id='${owner}') FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${owner}'`),'t','event time is trusted verified time')

// One browser proof for the SAME server event, despite concurrent tabs.
const browserReceipts=await Promise.all(Array.from({length:8},
 ()=>sqlAsync(`SET ROLE service_role;
 SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate('${owner}')`)))
const browserClaims=browserReceipts.filter(Boolean)
assert.equal(browserClaims.length,1,'only one verified browser receipt under concurrency')
assert.equal(browserClaims[0].split('|')[0],eventId,
 'Pixel receives the existing CAPI event_id')
assert.equal(sql(`SET ROLE service_role;
 SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate('${owner}')`),'',
 'refresh/revisit cannot return a second browser receipt')
assert.equal(sql(`SELECT pixel_receipt_claimed_at IS NOT NULL
 FROM marketing_private.meta_outbox_candidate WHERE owner_id='${owner}'`),'t')
assert.throws(()=>sql(`SET ROLE anon;
 SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate('${owner}')`))
assert.throws(()=>sql(`SET ROLE authenticated;
 SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate('${owner}')`))

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
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_capture_ua_candidate('${withdrawn}',
 'Mozilla/5.0 (PAZO synthetic browser about to withdraw)')`),'t')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_match_candidate
 WHERE owner_id='${withdrawn}'`),'1','consented UA snapshot stored server-only')

assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_withdraw_candidate('${withdrawn}')`),'t')
assert.equal(sql(`SELECT decision FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${withdrawn}'`),'withdrawn')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_match_candidate WHERE owner_id='${withdrawn}'`),'0','withdrawal atomically purges UA snapshot')
assert.equal(sql(`SELECT status FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${withdrawn}'`),'suppressed','pending work is canceled atomically')
assert.equal(sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()'),'','withdrawal suppresses pending event')
const firstWithdrawTime=sql(`SELECT withdrawn_at::text FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${withdrawn}'`)
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_withdraw_candidate('${withdrawn}')`),'t',
 'withdrawal is idempotent')
assert.equal(sql(`SELECT withdrawn_at::text FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${withdrawn}'`),firstWithdrawTime,'repeated opt-out does not forget original revocation time')

const noHistory='16900000-0000-4000-8000-000000000007'
create(noHistory)
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_withdraw_candidate('${noHistory}')`),'t',
 'no prior grant must not prevent withdrawal')
assert.equal(sql(`SELECT decision='withdrawn' AND gpc_at_last_request
 AND sharing_opt_out AND withdrawn_at IS NOT NULL
 FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${noHistory}'`),'t',
 'opt-out persists even if no conversion ever existed')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${noHistory}'`),'0')
assert.throws(()=>sql(`SET ROLE anon;
 SELECT public.pazo_meta_withdraw_candidate('${owner}')`))
assert.throws(()=>sql(`SET ROLE authenticated;
 SELECT public.pazo_meta_withdraw_candidate('${owner}')`))


const lateGranted='16900000-0000-4000-8000-000000000008'
create(lateGranted)
assert.equal(sql(record(lateGranted)),'t')
assert.equal(count(lateGranted),'0','first-party consent does not grant Meta')
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${lateGranted}','pazo-meta-conversions-v1',false)`),'t',
 'explicit consent after verified email, but within 15m, is supported')
assert.equal(count(lateGranted),'1','one short-window event, not historical backfill')
const lateGrantedEvent=sql(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${lateGranted}'`)
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${lateGranted}','pazo-meta-conversions-v1',false)`),'f',
 'an additional grant cannot mint another business event')
assert.equal(sql(`SELECT event_id::text FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${lateGranted}'`),lateGrantedEvent)
const lateGrantedLease=sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()')
const [lgOwner,lgEvent,lgTime,lgLease]=lateGrantedLease.split('|')
assert.equal(lgOwner,lateGranted)
assert.equal(lgEvent,lateGrantedEvent)
assert.equal(sql(`SET ROLE service_role;SELECT public.pazo_meta_settle_candidate(
 '${lgEvent}','${lgLease}','sent')`),'t')

// Simulated authenticated GPC arriving while the CAPI worker holds a lease.
// The private withdrawal RPC must atomically suppress the lease and the
// one-time browser proof; a late worker cannot settle the withdrawn event.
const leasedGpc='16900000-0000-4000-8000-00000000000b'
create(leasedGpc);pref(leasedGpc)
assert.equal(sql(record(leasedGpc)),'t')
const held=sql('SET ROLE service_role;SELECT * FROM public.pazo_meta_lease_candidate()')
const [gpcOwner,gpcEvent,gpcAt,gpcLease]=held.split('|')
assert.equal(gpcOwner,leasedGpc)
assert.equal(sql(`SET ROLE service_role;
 SELECT owner_id::text FROM public.pazo_meta_check_claim_candidate(
  '${gpcEvent}','${gpcLease}')`),leasedGpc)
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_withdraw_candidate('${leasedGpc}')`),'t',
 'authenticated GPC persist uses same service-only opt-out RPC')
assert.equal(sql(`SELECT status FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${leasedGpc}'`),'suppressed',
 'withdrawal cancels an already leased provider event')
assert.equal(sql(`SET ROLE service_role;
 SELECT * FROM public.pazo_meta_check_claim_candidate(
  '${gpcEvent}','${gpcLease}')`),'',
 'the old worker loses its live privacy proof')
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_settle_candidate(
  '${gpcEvent}','${gpcLease}','sent')`),'f',
 'GPC-withdrawn event cannot be marked sent by a stale lease')
assert.equal(sql(`SET ROLE service_role;
 SELECT * FROM public.pazo_meta_take_pixel_receipt_candidate(
  '${leasedGpc}')`),'',
 'GPC-withdrawn event cannot issue a Pixel receipt')
assert.equal(sql(`SELECT decision='withdrawn' AND sharing_opt_out
 AND gpc_at_last_request FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${leasedGpc}'`),'t')
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_grant_first_session_candidate(
  '${leasedGpc}','pazo-meta-conversions-v1',false)`),'f',
 'stored withdrawal prevents silent later re-grant')

const deniedGrant='16900000-0000-4000-8000-000000000009'
create(deniedGrant)
assert.equal(sql(record(deniedGrant)),'t')
for(const [notice,gpc] of [['bad-version',false],['pazo-meta-conversions-v1',true]]){
 assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${deniedGrant}','${notice}',${gpc})`),'f')
}
assert.equal(count(deniedGrant),'0','GPC or invalid notice never creates a conversion')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${deniedGrant}'`),'0','invalid grant never persists')
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${withdrawn}','pazo-meta-conversions-v1',false)`),'f',
 'withdrawal cannot be silently reversed')
assert.equal(sql(`SELECT status FROM marketing_private.meta_outbox_candidate
 WHERE owner_id='${withdrawn}'`),'suppressed')

const oldUser='16900000-0000-4000-8000-00000000000a'
sql(`INSERT INTO auth.users(id,created_at,email_confirmed_at)
 VALUES('${oldUser}',now()-interval '40 minutes',now()-interval '30 minutes');
 INSERT INTO public.profiles(id) VALUES('${oldUser}');`)
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_marketing_record_verified_v1(
 '${oldUser}','qr_v2_en',now()-interval '45 minutes')`),'t')
assert.equal(sql(`SET ROLE service_role;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${oldUser}','pazo-meta-conversions-v1',false)`),'f',
 'registration older than 15m is never backfilled')
assert.equal(count(oldUser),'0')
assert.throws(()=>sql(`SET ROLE anon;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${owner}','pazo-meta-conversions-v1',false)`))
assert.throws(()=>sql(`SET ROLE authenticated;
 SELECT public.pazo_meta_grant_first_session_candidate(
 '${owner}','pazo-meta-conversions-v1',false)`))

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
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_match_candidate WHERE owner_id='${owner}'`),'0','cascading 14-day attribution deletion also purges UA')
assert.equal(sql(`SELECT count(*) FROM marketing_private.meta_purpose_candidate
 WHERE owner_id='${owner}'`),'1','privacy decision has separate lifecycle')
assert.equal(sql('SELECT row_to_json(g) FROM marketing_private.collection_gate g'),before)
console.log(JSON.stringify({status:'PASS',environment:'disposable PG17',
 atomicSignupAndEvent:true,concurrentFirstParty:8,concurrentLeases:8,
 oneTimeClaims:1,leaseBoundPrivacy:true,typedSettlement:true,leaseFence:true,stableRetryId:true,revocationStopsPending:true,revocationStopsLeased:true,staleWorkerGpcDenied:true,withdrawalIdempotent:true,serverOnlyWithdrawal:true,
 singleUseBrowserReceipt:true,concurrentBrowserReceiptClaims:8,
 independentGateDefaultsOff:true,gpcExclusion:true,qaExclusion:true,
 noBackfill:true,verifiedSessionGrant:true,explicitNotice:true,grantGpcGate:true,grantNoReversal:true,rlsForced:true,retentionCascade:true,hostedWrites:0}))
