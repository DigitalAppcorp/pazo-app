import test from 'node:test'
import assert from 'node:assert/strict'
import {assessMetaPurpose,META_PURPOSE,META_CONSENT_VERSION}
  from '../supabase/functions/_shared/metaPurposePolicy.mjs'
import {deliverVerifiedMetaRegistration}
  from '../supabase/functions/_shared/metaDeliveryCoordinator.mjs'
const eventId='11111111-2222-4333-8444-555555555555',datasetId='123456789012345'
const hashedEmail='a'.repeat(64) // synthetic, not an actual email hash
const now=Date.now(),date=new Date(now).toISOString()
const record={
  purpose:META_PURPOSE,version:META_CONSENT_VERSION,decision:'granted',
  decidedAt:date,withdrawnAt:null,revokedAt:null,
}
const privacy={
  record,trusted:true,gpc:false,sharingOptOut:false,
  accountExcluded:false,qaOrAdmin:false,verifiedRegistration:true,
}
const leaseId='77777777-8888-4999-aaaa-bbbbbbbbbbbb'
const claim={kind:'new',claimWasInserted:true,eventId,leaseId,eventTime:Math.floor(now/1000)}
const base={
  releaseEnabled:true,privacyGateApproved:true,
  datasetId,apiVersion:'v24.0',serverToken:'synthetic-server-only-secret-long',
  clock:()=>now,
}
test('a first-party analytics preference is not Meta advertising consent',()=>{
  const opts={record,now,trusted:true,gpc:false,sharingOptOut:false,
    accountExcluded:false,qaOrAdmin:false}
  assert.equal(assessMetaPurpose().allowed,false)
  assert.equal(assessMetaPurpose(opts).allowed,true)
  for(const bad of [{trusted:false},{gpc:true},{sharingOptOut:true},
    {accountExcluded:true},{qaOrAdmin:true},{record:{...record,purpose:'internal_analytics'}},
    {record:{...record,decision:'denied'}},{record:{...record,withdrawnAt:date}},
    {record:{...record,revokedAt:date}}, {record:{...record,decidedAt:'wrong'}},
    {record:{...record,decidedAt:new Date(now+60e3).toISOString()}},
    {record:{...record,version:'old'}}]){
    assert.equal(assessMetaPurpose({...opts,...bad}).allowed,false,JSON.stringify(bad))
  }
})
test('no release => no claim, no privacy query, no Meta call',async()=>{
  let invoked=0
  const repo={leaseOne:async()=>{invoked++;return claim},
    checkPrivacy:async()=>{invoked++;return privacy},readApprovedMatchField:async()=>hashedEmail,settle:async()=>{invoked++}}
  const out=await deliverVerifiedMetaRegistration({repository:repo})
  assert.equal(out.status,'disabled')
  assert.equal(invoked,0)
})
test('claim repository must be complete, and duplicate verified owner is suppressed',async()=>{
  assert.equal((await deliverVerifiedMetaRegistration(base)).status,'not_configured')
  const rep={leaseOne:async()=>({kind:'duplicate'}),checkPrivacy:async()=>privacy,readApprovedMatchField:async()=>hashedEmail,settle:async()=>true}
  assert.equal((await deliverVerifiedMetaRegistration({...base,repository:rep})).status,'not_eligible')
})
test('one lease + two privacy reads, same event_id, token only in header',async()=>{
  let checks=0,fetches=0,settled
  const repository={
    leaseOne:async()=>claim,
    checkPrivacy:async()=>{checks++;return privacy},
    readApprovedMatchField:async()=>hashedEmail,settle:async(id,lease,state)=>{assert.equal(id,eventId);assert.equal(lease,leaseId);settled=state;return true},
  }
  const out=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async(url,config)=>{
      fetches++
      assert.equal(url,'https://graph.facebook.com/v24.0/'+datasetId+'/events')
      assert.equal(config.headers.authorization,'Bearer '+base.serverToken)
      assert.equal(JSON.parse(config.body).data[0].event_id,eventId)
      assert.ok(!config.body.includes(base.serverToken))
      return {ok:true,json:async()=>({events_received:1})}
    }})
  assert.equal(out.status,'accepted')
  assert.equal(settled,'sent')
  assert.equal(fetches,1)
  assert.equal(checks,2)
})
test('uncertain initial DB privacy read retries without PII or provider request',async()=>{
 for(const source of [async()=>null,async()=>{throw Error('transient DB outage')}]) {
   let matchingReads=0,sends=0,settled=null
   const repo={
     leaseOne:async()=>claim,
     checkPrivacy:source,
     readApprovedMatchField:async()=>{matchingReads++;return hashedEmail},
     settle:async(id,lease,status)=>{
       assert.equal(id,eventId);assert.equal(lease,leaseId)
       settled=status;return true
     },
   }
   const result=await deliverVerifiedMetaRegistration({...base,repository:repo,
     fetchImpl:async()=>{sends++;throw Error('forbidden')}})
   assert.deepEqual(result,{status:'unavailable'})
   assert.equal(settled,'retryable')
   assert.equal(matchingReads,0,'privacy uncertainty must not read matching data')
   assert.equal(sends,0)
 }
})
test('uncertain final DB privacy recheck retries without provider request',async()=>{
 for(const failure of ['null','exception']) {
   let checked=0,reads=0,sends=0,settled=null
   const repo={
     leaseOne:async()=>claim,
     checkPrivacy:async()=>{
       checked++
       if(checked===1)return privacy
       if(failure==='null')return null
       throw Error('temporary DB failure')
     },
     readApprovedMatchField:async()=>{reads++;return hashedEmail},
     settle:async(_,lease,status)=>{
       assert.equal(lease,leaseId);settled=status;return true
     },
   }
   const result=await deliverVerifiedMetaRegistration({...base,repository:repo,
     fetchImpl:async()=>{sends++;throw Error('forbidden')}})
   assert.equal(result.status,'unavailable')
   assert.equal(settled,'retryable')
   assert.equal(checked,2)
   assert.equal(reads,1)
   assert.equal(sends,0)
 }
})
test('a late GPC/withdrawal change suppresses the provider call',async()=>{
  let calls=0,checks=0,settled
  const repository={leaseOne:async()=>claim,
    checkPrivacy:async()=>++checks===1?privacy:{...privacy,gpc:true},
    readApprovedMatchField:async()=>hashedEmail,settle:async(_,lease,status)=>{assert.equal(lease,leaseId);settled=status;return true}}
  const out=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++;throw Error('never called')}})
  assert.equal(out.status,'suppressed')
  assert.equal(settled,'suppressed')
  assert.equal(calls,0)
})
test('server account exclusion and unknown purpose suppress before provider',async()=>{
  let calls=0,settled
  const repository={leaseOne:async()=>claim,checkPrivacy:async()=>({...privacy,qaOrAdmin:true}),
    readApprovedMatchField:async()=>hashedEmail,settle:async(_,lease,status)=>{assert.equal(lease,leaseId);settled=status;return true}}
  const result=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++}})
  assert.equal(result.status,'suppressed')
  assert.equal(settled,'suppressed')
  assert.equal(calls,0)
})
test('privacy refusal never reads any approved matching data',async()=>{
 let reads=0,sends=0
 const repository={
   leaseOne:async()=>claim,
   checkPrivacy:async()=>({...privacy,gpc:true}),
   readApprovedMatchField:async()=>{reads++;return hashedEmail},
   settle:async()=>true,
 }
 const out=await deliverVerifiedMetaRegistration({...base,repository,
   fetchImpl:async()=>{sends++}})
 assert.equal(out.status,'suppressed')
 assert.equal(reads,0)
 assert.equal(sends,0)
})

test('provider failure keeps same event lease retryable; no duplicate is minted',async()=>{
  let settled,calls=0
  const repository={leaseOne:async()=>claim,checkPrivacy:async()=>privacy,
    readApprovedMatchField:async()=>hashedEmail,settle:async(_,lease,status)=>{assert.equal(lease,leaseId);settled=status;return true}}
  const result=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++;return {ok:false}}})
  assert.equal(result.status,'provider_error')
  assert.equal(settled,'retryable')
  assert.equal(calls,1)
})
test('absent match identifier, token or Meta dataset fails closed',async()=>{
  let calls=0,settled
  const repository={leaseOne:async()=>claim,
    checkPrivacy:async()=>privacy,readApprovedMatchField:async()=>null,settle:async(_,lease,status)=>{assert.equal(lease,leaseId);settled=status;return true}}
  const out=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++}})
  assert.equal(out.status,'not_configured')
  assert.equal(settled,'retryable')
  assert.equal(calls,0)
})


test('CAPI retry leases the original verified event ID rather than minting a second conversion',async()=>{
  const observed=[],settled=[]
  const repository={
    leaseOne:async()=>({...claim,kind:'retry'}),
    checkPrivacy:async()=>privacy,
    readApprovedMatchField:async()=>hashedEmail,settle:async(id,lease,state)=>{settled.push([id,lease,state]);return true},
  }
  const result=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async(url,config)=>{
      observed.push(JSON.parse(config.body).data[0].event_id)
      return {ok:true,json:async()=>({events_received:1})}
    }})
  assert.equal(result.status,'accepted')
  assert.deepEqual(observed,[eventId])
  assert.deepEqual(settled,[[eventId,leaseId,'sent']])
})


test('invalid or missing lease ID cannot trigger provider or privacy reads',async()=>{
  for(const invalid of [undefined,'123','11111111-1111-1111-1111-111111111111']){
    let privacyReads=0,network=0,settles=0
    const repo={leaseOne:async()=>({...claim,leaseId:invalid}),
      checkPrivacy:async()=>{privacyReads++;return privacy},
      readApprovedMatchField:async()=>hashedEmail,settle:async()=>{settles++;return true}}
    const out=await deliverVerifiedMetaRegistration({...base,repository:repo,
      fetchImpl:async()=>{network++;return {ok:true,json:async()=>({events_received:1})}}})
    assert.equal(out.status,'not_eligible')
    assert.equal(privacyReads+network+settles,0)
  }
})
test('stale-worker settlement failure never reports successful completion',async()=>{
  let sent=0
  const repo={leaseOne:async()=>claim,checkPrivacy:async()=>privacy,
    readApprovedMatchField:async()=>hashedEmail,settle:async()=>false}
  const out=await deliverVerifiedMetaRegistration({...base,repository:repo,
    fetchImpl:async()=>{sent++;return {ok:true,json:async()=>({events_received:1})}}})
  assert.equal(sent,1)
  assert.equal(out.status,'unavailable','false settlement cannot be silently treated as saved')
})
