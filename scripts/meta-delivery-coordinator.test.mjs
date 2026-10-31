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
const claim={kind:'new',claimWasInserted:true,eventId,eventTime:Math.floor(now/1000),hashedEmail}
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
    checkPrivacy:async()=>{invoked++;return privacy},settle:async()=>{invoked++}}
  const out=await deliverVerifiedMetaRegistration({repository:repo})
  assert.equal(out.status,'disabled')
  assert.equal(invoked,0)
})
test('claim repository must be complete, and duplicate verified owner is suppressed',async()=>{
  assert.equal((await deliverVerifiedMetaRegistration(base)).status,'not_configured')
  const rep={leaseOne:async()=>({kind:'duplicate'}),checkPrivacy:async()=>privacy,settle:async()=>{}}
  assert.equal((await deliverVerifiedMetaRegistration({...base,repository:rep})).status,'not_eligible')
})
test('one lease + two privacy reads, same event_id, token only in header',async()=>{
  let checks=0,fetches=0,settled
  const repository={
    leaseOne:async()=>claim,
    checkPrivacy:async()=>{checks++;return privacy},
    settle:async(id,state)=>{assert.equal(id,eventId);settled=state},
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
test('a late GPC/withdrawal change suppresses the provider call',async()=>{
  let calls=0,checks=0,settled
  const repository={leaseOne:async()=>claim,
    checkPrivacy:async()=>++checks===1?privacy:{...privacy,gpc:true},
    settle:async(_,status)=>{settled=status}}
  const out=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++;throw Error('never called')}})
  assert.equal(out.status,'suppressed')
  assert.equal(settled,'suppressed')
  assert.equal(calls,0)
})
test('server account exclusion and unknown purpose suppress before provider',async()=>{
  let calls=0,settled
  const repository={leaseOne:async()=>claim,checkPrivacy:async()=>({...privacy,qaOrAdmin:true}),
    settle:async(_,status)=>{settled=status}}
  const result=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++}})
  assert.equal(result.status,'suppressed')
  assert.equal(settled,'suppressed')
  assert.equal(calls,0)
})
test('provider failure keeps same event lease retryable; no duplicate is minted',async()=>{
  let settled,calls=0
  const repository={leaseOne:async()=>claim,checkPrivacy:async()=>privacy,
    settle:async(_,status)=>{settled=status}}
  const result=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++;return {ok:false}}})
  assert.equal(result.status,'provider_error')
  assert.equal(settled,'retryable')
  assert.equal(calls,1)
})
test('absent match identifier, token or Meta dataset fails closed',async()=>{
  let calls=0,settled
  const repository={leaseOne:async()=>({...claim,hashedEmail:undefined}),
    checkPrivacy:async()=>privacy,settle:async(_,status)=>{settled=status}}
  const out=await deliverVerifiedMetaRegistration({...base,repository,
    fetchImpl:async()=>{calls++}})
  assert.equal(out.status,'not_configured')
  assert.equal(settled,'suppressed')
  assert.equal(calls,0)
})
