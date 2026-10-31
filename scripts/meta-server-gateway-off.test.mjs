import test from 'node:test'
import assert from 'node:assert/strict'
import {runMetaCapiWorker}
  from '../supabase/functions/_shared/metaServerGateway.mjs'
const eventId='11111111-2222-4333-8444-555555555555'
const leaseId='77777777-8888-4999-aaaa-bbbbbbbbbbbb'
const now=Date.now()
const record={
  purpose:'meta_conversions_v1',version:'pazo-meta-conversions-v1',
  decision:'granted',decidedAt:new Date(now).toISOString(),
  withdrawnAt:null,revokedAt:null,
}
const privacy={record,trusted:true,gpc:false,sharingOptOut:false,
  accountExcluded:false,qaOrAdmin:false,verifiedRegistration:true}
const repository=()=>({
  leaseOne:async()=>({kind:'new',claimWasInserted:true,
    eventId,leaseId,eventTime:Math.floor(now/1000),hashedEmail:'a'.repeat(64)}),
  checkPrivacy:async()=>privacy,
  readApprovedMatchField:async()=> ({em:'a'.repeat(64),
    clientUserAgent:'Mozilla/5.0 (PAZO Synthetic Consent Test)'}),
  settle:async()=>true,
})
const fixture={
  META_DATASET_ID:'1438916858347709',
  META_CAPI_ACCESS_TOKEN:'synthetic_token_never_use_for_Meta_api_123',
}
const base={releaseEnabled:true,privacyGateApproved:true,repository:repository(),
  readSecret:name=>fixture[name],apiVersion:'v24.0',clock:()=>now}
test('OFF means zero environment reads and zero lease/network calls',async()=>{
 let reads=0,leases=0,net=0
 const out=await runMetaCapiWorker({
  readSecret:()=>{reads++},
  repository:{leaseOne:async()=>{leases++}},
  fetchImpl:async()=>{net++},
 })
 assert.deepEqual(out,{status:'disabled'})
 assert.equal(reads+leases+net,0)
})
test('missing or mismatched server secrets must not lease any event',async()=>{
 let leases=0
 const repo={leaseOne:async()=>{leases++}}
 for(const readSecret of [()=>undefined,name=>name==='META_DATASET_ID'?
   '648944045758089':fixture[name]]) {
   const out=await runMetaCapiWorker({...base,repository:repo,readSecret})
   assert.deepEqual(out,{status:'not_configured'})
 }
 assert.equal(leases,0)
})
test('synthetic trusted server integration passes single event with no token leakage',async()=>{
 let transmitted=0
 const out=await runMetaCapiWorker({...base,fetchImpl:async(url,req)=>{
  transmitted++
  assert.equal(url,'https://graph.facebook.com/v24.0/1438916858347709/events')
  assert.equal(req.headers.authorization,'Bearer '+fixture.META_CAPI_ACCESS_TOKEN)
  assert.equal(req.body.includes(fixture.META_CAPI_ACCESS_TOKEN),false)
  assert.equal(JSON.parse(req.body).data[0].event_id,eventId)
  return {ok:true,json:async()=>({events_received:1})}
 }})
 assert.deepEqual(out,{status:'accepted'})
 assert.equal(transmitted,1)
})
test('late GPC overrides stored grant in the network-time privacy recheck',async()=>{
 let checks=0,net=0
 const repo={...repository(),checkPrivacy:async()=>{
   checks++
   return checks===1?privacy:{...privacy,gpc:true}
 }}
 const out=await runMetaCapiWorker({...base,repository:repo,
   fetchImpl:async()=>{net++;throw Error('should never send')}
 })
 assert.equal(out.status,'suppressed')
 assert.equal(net,0)
 assert.equal(checks,2)
})
