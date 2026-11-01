import test from 'node:test'
import assert from 'node:assert/strict'
import {completeExplicitMetaOptIn}
  from '../src/features/marketing/metaConsentRegistrationFlow.mjs'
import {dispatchMetaPixel} from '../src/features/marketing/metaPixel.mjs'
import {runMetaCapiWorker} from '../supabase/functions/_shared/metaServerGateway.mjs'

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

test('post-grant GPC requests durable withdrawal before receipt or Pixel',async()=>{
 const f=make()
 const out=await completeExplicitMetaOptIn({...f.base,
   requestGrant:async request=>{
     f.calls.push(['grant',request]);f.changeGpc()
     return {status:'granted'}
   },
   requestWithdraw:async request=>{
     f.calls.push(['withdraw',request])
     return {status:'withdrawn'}
   },
 })
 assert.deepEqual(out,{status:'suppressed'})
 assert.deepEqual(f.calls.map(x=>x[0]),['grant','withdraw'])
 assert.deepEqual(f.calls[1][1],{accessToken,body:{action:'withdraw'}})
})
test('after a possibly committed grant, failing opt-out is explicitly unconfirmed',async()=>{
 for(const outcome of ['not_configured','throw']){
   const f=make()
   const out=await completeExplicitMetaOptIn({...f.base,
     requestGrant:async request=>{
       f.calls.push(['grant',request]);f.changeGpc()
       return {status:'granted'}
     },
     requestWithdraw:async request=>{
       f.calls.push(['withdraw',request])
       if(outcome==='throw')throw Error('server unavailable')
       return {status:'not_available'}
     },
   })
   assert.deepEqual(out,{status:'withdrawal_unconfirmed'})
   assert.deepEqual(f.calls.map(x=>x[0]),['grant','withdraw'])
 }
})
test('account switch after grant never withdraws on behalf of another owner',async()=>{
 const f=make()
 const out=await completeExplicitMetaOptIn({...f.base,
   requestGrant:async request=>{
     f.calls.push(['grant',request]);f.switchAccount()
     return {status:'granted'}
   },
   requestWithdraw:async request=>{
     f.calls.push(['withdraw',request]);return {status:'withdrawn'}
   },
 })
 assert.deepEqual(out,{status:'withdrawal_unconfirmed'})
 assert.deepEqual(f.calls.map(x=>x[0]),['grant'])
})
test('privacy veto before any request requires no withdrawal',async()=>{
 const f=make()
 f.changeGpc()
 const out=await completeExplicitMetaOptIn({...f.base,
   requestWithdraw:async request=>{
     f.calls.push(['withdraw',request]);return {status:'withdrawn'}
   },
 })
 assert.deepEqual(out,{status:'suppressed'})
 assert.equal(f.calls.length,0)
})


// Full synthetic reconciliation across both real candidate orchestrators.
// This NEVER loads Meta's SDK, uses a real person's information, or sends
// network traffic. Meta's provider-side deduplication is NOT tested here.
test('synthetic Pixel and CAPI use one verified event id; replay cannot double-count',async()=>{
  const dataset='1438916858347709'
  const id=eventId
  const lease='77777777-8888-4999-aaaa-bbbbbbbbbbbb'
  const now=Date.now(),calls=[],pixel=[],capi=[]
  let granted=false,receiptUsed=false,leaseUsed=false
  let blocked=false,matched=0
  const browser={navigator:{get globalPrivacyControl(){return blocked}}}
  const session=()=>({id:owner,accessToken})
  const readSecret=name=>({
    META_DATASET_ID:dataset,
    META_CAPI_ACCESS_TOKEN:'synthetic_not_a_real_meta_token_123456789',
  })[name]
  const allowed=()=>granted&&!blocked
  const consentRecord={
    purpose:'meta_conversions_v1',version:'pazo-meta-conversions-v1',
    decision:'granted',decidedAt:new Date(now).toISOString(),
    withdrawnAt:null,revokedAt:null,
  }
  const repository={
    leaseOne:async()=>{
      calls.push('lease')
      if(!granted||leaseUsed)return null
      leaseUsed=true
      return {kind:'new',claimWasInserted:true,eventId:id,
        leaseId:lease,eventTime:Math.floor(now/1000)}
    },
    checkPrivacy:async()=>({
      record:consentRecord,trusted:true,gpc:blocked,sharingOptOut:false,
      accountExcluded:false,qaOrAdmin:false,verifiedRegistration:true,
    }),
    readApprovedMatchField:async()=>{
      matched++
      return {em:'a'.repeat(64),
        clientUserAgent:'Mozilla/5.0 (PAZO Synthetic Integration Test)'}
    },
    settle:async(e,l,state)=>{
      assert.equal(e,id);assert.equal(l,lease)
      calls.push('settled:'+state)
      return true
    },
  }
  const optIn=()=>completeExplicitMetaOptIn({
    releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
    ownerId:owner,accessToken,getActiveSession:session,
    browser,dom:{},stillPermitted:()=>!blocked,
    requestGrant:async()=>{
      calls.push('grant')
      if(blocked)return {status:'not_available'}
      granted=true
      return {status:'granted'}
    },
    requestReceipt:async()=>{
      calls.push('receipt')
      if(!allowed()||receiptUsed)return {status:'not_available'}
      receiptUsed=true
      return {status:'verified',eventName:'CompleteRegistration',
        eventId:id,datasetId:dataset}
    },
    pixelLoader:async options=>{
      return dispatchMetaPixel({
        authorized:true,browserGpc:blocked,
        stillConsented:options.stillAllowed,
        eventId:options.eventId,datasetId:options.datasetId,
        fbq:(...args)=>pixel.push(args),
      })
    },
  })
  const worker=()=>runMetaCapiWorker({
    releaseEnabled:true,privacyGateApproved:true,repository,
    readSecret,apiVersion:'v24.0',clock:()=>now,
    fetchImpl:async(url,request)=>{
      assert.equal(url,'https://graph.facebook.com/v24.0/'+dataset+'/events')
      assert.equal(request.headers.authorization,
        'Bearer synthetic_not_a_real_meta_token_123456789')
      const data=JSON.parse(request.body).data
      assert.equal(data.length,1)
      capi.push(data[0])
      return {ok:true,json:async()=>({events_received:1})}
    },
  })
  // Signup verified and deliberately consented: one browser event and
  // one identical server event, for Meta to deduplicate when connected.
  assert.equal((await optIn()).status,'queued')
  assert.deepEqual(pixel,[['trackSingle',dataset,'CompleteRegistration',{},
    {eventID:id}]])
  assert.equal((await worker()).status,'accepted')
  assert.equal(capi.length,1)
  assert.equal(capi[0].event_name,pixel[0][2])
  assert.equal(capi[0].event_id,pixel[0][4].eventID)
  assert.equal(capi[0].user_data.client_user_agent,
    'Mozilla/5.0 (PAZO Synthetic Integration Test)')
  // Re-entry must never emit another browser or server event.
  assert.equal((await optIn()).status,'no_receipt')
  assert.equal((await worker()).status,'not_eligible')
  assert.equal(pixel.length,1)
  assert.equal(capi.length,1)
  assert.equal(matched,1)
  // GPC takes precedence over a previously persisted grant.
  blocked=true
  assert.equal((await optIn()).status,'suppressed')
  assert.equal(pixel.length,1)
  assert.equal(capi.length,1)
})
test('synthetic late GPC suppresses CAPI after consent without reading identity',async()=>{
  const now=Date.now(),eventId='11111111-2222-4333-8444-555555555555'
  let checks=0,matchingReads=0,network=0
  const record={purpose:'meta_conversions_v1',
    version:'pazo-meta-conversions-v1',decision:'granted',
    decidedAt:new Date(now).toISOString(),withdrawnAt:null,revokedAt:null}
  const repository={
    leaseOne:async()=>({kind:'new',claimWasInserted:true,eventId,
      leaseId:'77777777-8888-4999-aaaa-bbbbbbbbbbbb',
      eventTime:Math.floor(now/1000)}),
    checkPrivacy:async()=>{
      checks++
      return {record,trusted:true,gpc:checks>=2,sharingOptOut:false,
        accountExcluded:false,qaOrAdmin:false,verifiedRegistration:true}
    },
    readApprovedMatchField:async()=>{
      matchingReads++
      return {em:'a'.repeat(64),
        clientUserAgent:'Mozilla/5.0 (PAZO Synthetic Integration Test)'}
    },
    settle:async()=>true,
  }
  const result=await runMetaCapiWorker({
    releaseEnabled:true,privacyGateApproved:true,repository,
    apiVersion:'v24.0',clock:()=>now,
    readSecret:key=>({
      META_DATASET_ID:'1438916858347709',
      META_CAPI_ACCESS_TOKEN:'synthetic_not_a_real_meta_token_123456789',
    })[key],
    fetchImpl:async()=>{network++;throw Error('must not reach provider')},
  })
  assert.equal(result.status,'suppressed')
  assert.equal(checks,2)
  assert.equal(matchingReads,1)
  assert.equal(network,0)
})
