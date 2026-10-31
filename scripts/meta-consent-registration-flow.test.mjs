import test from 'node:test'
import assert from 'node:assert/strict'
import {completeExplicitMetaOptIn}
  from '../src/features/marketing/metaConsentRegistrationFlow.mjs'

const owner='16900000-0000-4000-8000-000000000001'
const other='16900000-0000-4000-8000-000000000002'
const accessToken='synthetic-verified-jwt-do-not-use'
const eventId='11111111-2222-4333-8444-555555555555'
const datasetId='1438916858347709'
const make=()=>{
 let session={id:owner,accessToken}
 let permitted=true
 let gpc=false
 const calls=[]
 const browser={navigator:{get globalPrivacyControl(){return gpc}}}
 const base={
  releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
  ownerId:owner,accessToken,getActiveSession:()=>session,browser,
  stillPermitted:()=>permitted,
  requestGrant:async request=>{
    calls.push(['grant',request])
    return {status:'granted'}
  },
  requestReceipt:async request=>{
    calls.push(['receipt',request])
    return {status:'verified',eventName:'CompleteRegistration',
      eventId,datasetId}
  },
  pixelLoader:async options=>{
    calls.push(['pixel',options])
    return {status:'queued'}
  },
 }
 return {base,calls,switchAccount:()=>{session={id:other,accessToken}},
  withdraw:()=>{permitted=false},changeGpc:()=>{gpc=true}}
}
test('default OFF, no explicit opt-in, GPC and stale Auth perform no work',async()=>{
 for(const patch of [
  {releaseEnabled:false},{privacyApproved:false},
  {deliberateOptIn:false},{accessToken:''},{ownerId:'bad'}
 ]) {
  const f=make()
  const result=await completeExplicitMetaOptIn({...f.base,...patch})
  assert.notEqual(result.status,'queued')
  assert.equal(f.calls.length,0)
 }
 for(const act of ['changeGpc','switchAccount','withdraw']){
  const f=make()
  f[act]()
  assert.deepEqual(await completeExplicitMetaOptIn(f.base),{status:'suppressed'})
  assert.equal(f.calls.length,0)
 }
})
test('explicit opt-in pins authenticated owner, grant notice and empty receipt',async()=>{
 const f=make()
 const out=await completeExplicitMetaOptIn(f.base)
 assert.deepEqual(out,{status:'queued'})
 assert.deepEqual(f.calls.map(x=>x[0]),['grant','receipt','pixel'])
 assert.deepEqual(f.calls[0][1],{
  accessToken,body:{action:'grant',noticeVersion:'pazo-meta-conversions-v1'}
 })
 assert.deepEqual(f.calls[1][1],{accessToken,body:{}})
 const pixel=f.calls[2][1]
 assert.equal(pixel.eventId,eventId)
 assert.equal(pixel.datasetId,datasetId)
 assert.equal(pixel.verifiedRegistration,true)
 assert.equal(pixel.stillAllowed(),true)
})
test('grant failure, refusal, and changed account prevent receipt or Pixel',async()=>{
 for(const outcome of ['unavailable','refused','account-switch','gpc','withdraw']){
  const f=make()
  const result=await completeExplicitMetaOptIn({...f.base,
    requestGrant:async req=>{
      f.calls.push(['grant',req])
      if(outcome==='unavailable')throw Error('offline')
      if(outcome==='account-switch')f.switchAccount()
      if(outcome==='gpc')f.changeGpc()
      if(outcome==='withdraw')f.withdraw()
      return {status:outcome==='refused'?'not_available':'granted'}
    },
  })
  assert.notEqual(result.status,'queued')
  assert.deepEqual(f.calls.map(x=>x[0]),['grant'])
 }
})
test('receipt failure, malformed attestation, or session replacement veto Pixel',async()=>{
 for(const outcome of ['failed','malformed','account-switch','gpc','withdraw']){
  const f=make()
  const result=await completeExplicitMetaOptIn({...f.base,
    requestReceipt:async req=>{
      f.calls.push(['receipt',req])
      if(outcome==='failed')throw Error('unavailable')
      if(outcome==='account-switch')f.switchAccount()
      if(outcome==='gpc')f.changeGpc()
      if(outcome==='withdraw')f.withdraw()
      if(outcome==='malformed')return {status:'verified',
        eventName:'CompleteRegistration',eventId:'bad',datasetId}
      return {status:'verified',eventName:'CompleteRegistration',eventId,datasetId}
    },
  })
  assert.notEqual(result.status,'queued')
  assert.deepEqual(f.calls.map(x=>x[0]),['grant','receipt'])
 }
})
test('late preference change is still vetoed by Pixel callback',async()=>{
 const f=make()
 const out=await completeExplicitMetaOptIn({...f.base,
  pixelLoader:async opts=>{
    f.withdraw()
    assert.equal(opts.stillAllowed(),false)
    return {status:'suppressed'}
  },
 })
 assert.deepEqual(out,{status:'suppressed'})
})
