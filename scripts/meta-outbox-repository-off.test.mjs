import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaOutboxRepository}
  from '../supabase/functions/_shared/metaOutboxRepository.mjs'
import {runMetaCapiWorker}
  from '../supabase/functions/_shared/metaServerGateway.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co'
const serviceKey='synthetic_service_role_secret_not_real_123456'
const owner='16900000-0000-4000-8000-000000000001'
const eventId='11111111-2222-4333-8444-555555555555'
const leaseId='77777777-8888-4999-aaaa-bbbbbbbbbbbb'
const now=Date.now()
const stamp=new Date(now-1000).toISOString()
const purpose={owner_id:owner,event_time:stamp,
 purpose:'meta_conversions_v1',version:'pazo-meta-conversions-v1',
 decision:'granted',decided_at:stamp,withdrawn_at:null,
 gpc:false,sharing_opt_out:false,eligible:true}
const secrets={
 META_DATASET_ID:'1438916858347709',
 META_CAPI_ACCESS_TOKEN:'synthetic_access_token_not_a_real_meta_token_12345',
}
function fake({privacy=purpose,claimed=true,match='a'.repeat(64)}={}) {
 const calls=[]
 let available=claimed
 const repository=createMetaOutboxRepository({
  enabled:true,privacyApproved:true,matchFieldsApproved:true,
  url,serviceKey,readApprovedMatchField:async()=>match,
  fetchImpl:async(uri,req)=>{
    const name=uri.split('/rpc/')[1]
    const body=JSON.parse(req.body)
    calls.push({name,body,uri,req})
    assert.equal(req.headers.authorization,'Bearer '+serviceKey)
    if(name==='pazo_meta_lease_candidate'){
      if(!available)return new Response('[]',{status:200})
      available=false
      return new Response(JSON.stringify([{
        owner_id:owner,event_id:eventId,lease_id:leaseId,event_time:stamp,
      }]),{status:200})
    }
    if(name==='pazo_meta_check_claim_candidate'){
      if(body.p_lease!==leaseId||body.p_event!==eventId)
        return new Response('[]',{status:200})
      return new Response(JSON.stringify(privacy?[privacy]:[]),{status:200})
    }
    if(name==='pazo_meta_settle_candidate'){
      return new Response('true',{status:200})
    }
    throw Error('unexpected RPC')
  },
 })
 return {repository,calls}
}
test('OFF and missing privacy/approved field reader cause zero DB operations',async()=>{
 let requests=0,matching=0
 for(const patch of [{enabled:false},{privacyApproved:false},
   {matchFieldsApproved:false},{readApprovedMatchField:null},
   {url:'https://foreign.invalid'},{serviceKey:'bad'}]) {
   const r=createMetaOutboxRepository({
     enabled:true,privacyApproved:true,matchFieldsApproved:true,
     url,serviceKey,readApprovedMatchField:async()=>{matching++;return 'a'.repeat(64)},
     fetchImpl:async()=>{requests++;throw Error('should never call')},
     ...patch,
   })
   assert.equal(r,null)
 }
 assert.equal(requests+matching,0)
})
test('server-only lease, current lease privacy, typed settle; no PII in RPC request',async()=>{
 const f=fake()
 const c=await f.repository.leaseOne()
 assert.equal(c.eventId,eventId)
 assert.equal(c.leaseId,leaseId)
 assert.equal(c.hashedEmail,'a'.repeat(64))
 assert.equal(c.claimWasInserted,true)
 const p=await f.repository.checkPrivacy(eventId,leaseId)
 assert.equal(p.trusted,true)
 assert.equal(p.verifiedRegistration,true)
 assert.equal(p.record.decision,'granted')
 assert.equal(await f.repository.settle(eventId,leaseId,'sent'),true)
 assert.deepEqual(f.calls.map(x=>x.name),[
  'pazo_meta_lease_candidate','pazo_meta_check_claim_candidate',
  'pazo_meta_settle_candidate',
 ])
 for(const x of f.calls){
   assert.equal(x.uri.includes(serviceKey),false)
   assert.equal(x.req.body.includes(serviceKey),false)
   assert.equal(x.req.body.includes('@'),false)
 }
 assert.deepEqual(f.calls[1].body,{p_event:eventId,p_lease:leaseId})
 assert.deepEqual(f.calls[2].body,{
   p_event:eventId,p_lease:leaseId,p_status:'sent',
 })
})
test('unknown or stale lease and revoked privacy fail closed',async()=>{
 const f=fake()
 assert.equal(await f.repository.checkPrivacy(eventId,'11111111-1111-4111-8111-111111111111'),null)
 assert.equal(await f.repository.checkPrivacy('bad',leaseId),null)
 assert.equal(f.calls.length,1)
 const g=fake({privacy:{...purpose,decision:'withdrawn',withdrawn_at:stamp}})
 assert.equal(await g.repository.checkPrivacy(eventId,leaseId),null)
 const h=fake({privacy:{...purpose,gpc:true}})
 assert.equal(await h.repository.checkPrivacy(eventId,leaseId),null)
 const i=fake({privacy:{...purpose,eligible:false}})
 assert.equal(await i.repository.checkPrivacy(eventId,leaseId),null)
})
test('invalid settlement status cannot trigger a privileged RPC',async()=>{
 const f=fake()
 assert.equal(await f.repository.settle(eventId,leaseId,'success'),false)
 assert.equal(await f.repository.settle(eventId,'bad','sent'),false)
 assert.equal(f.calls.length,0)
})
test('missing approved match value yields retryable, no Meta request',async()=>{
 const f=fake({match:null})
 let sent=0
 const out=await runMetaCapiWorker({
  releaseEnabled:true,privacyGateApproved:true,repository:f.repository,
  apiVersion:'v24.0',readSecret:name=>secrets[name],
  clock:()=>now,fetchImpl:async()=>{sent++;throw Error('not allowed')},
 })
 assert.equal(out.status,'not_configured')
 assert.equal(sent,0)
 assert.equal(f.calls.at(-1).body.p_status,'retryable')
})
test('isolated synthetic end-to-end CAPI uses existing UUID with live lease policy',async()=>{
 const f=fake()
 let sent=0
 const out=await runMetaCapiWorker({
  releaseEnabled:true,privacyGateApproved:true,repository:f.repository,
  apiVersion:'v24.0',readSecret:name=>secrets[name],clock:()=>now,
  fetchImpl:async(uri,req)=>{
    sent++
    assert.equal(uri,'https://graph.facebook.com/v24.0/'+secrets.META_DATASET_ID+'/events')
    assert.equal(req.headers.authorization,'Bearer '+secrets.META_CAPI_ACCESS_TOKEN)
    const event=JSON.parse(req.body).data[0]
    assert.equal(event.event_id,eventId)
    assert.equal(event.event_name,'CompleteRegistration')
    assert.equal(req.body.includes(secrets.META_CAPI_ACCESS_TOKEN),false)
    return {ok:true,json:async()=>({events_received:1})}
  },
 })
 assert.deepEqual(out,{status:'accepted'})
 assert.equal(sent,1)
 assert.equal(f.calls.filter(x=>x.name==='pazo_meta_check_claim_candidate').length,2)
 assert.equal(f.calls.at(-1).body.p_status,'sent')
})
