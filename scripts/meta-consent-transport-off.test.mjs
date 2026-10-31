import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaConsentTransport}
  from '../src/features/marketing/metaConsentTransport.mjs'
import {completeExplicitMetaOptIn}
  from '../src/features/marketing/metaConsentRegistrationFlow.mjs'
import {createMetaGrantHandler}
  from '../supabase/functions/pazo-meta-consent/grantCore.mjs'
import {createMetaReceiptHandler}
  from '../supabase/functions/pazo-meta-receipt/receiptCore.mjs'
import {createMetaWithdrawalHandler}
  from '../supabase/functions/pazo-meta-consent/withdrawCore.mjs'

const owner='16900000-0000-4000-8000-000000000001'
const other='16900000-0000-4000-8000-000000000002'
const token='synthetic-user-jwt-token-for-PAZO-123456'
const datasetId='1438916858347709'
const eventId='11111111-2222-4333-8444-555555555555'
const origin='https://pazo-app.vercel.app'
const user={id:owner,is_anonymous:false,email_confirmed_at:new Date().toISOString()}

function fixture(){
  let session={id:owner,accessToken:token}
  let gpc=false,permitted=true,granted=false,taken=false
  const calls=[],effects=[]
  const browser={navigator:{get globalPrivacyControl(){return gpc}}}
  const grant=createMetaGrantHandler({released:true,privacyReviewed:true,
    authenticate:async current=>current===token?user:null,
    grant:async id=>{if(id!==owner)return false;granted=true;return true},
  })
  const receipt=createMetaReceiptHandler({released:true,privacyReviewed:true,
    authenticate:async current=>current===token?user:null,
    lookupReceipt:async id=>{
      if(id!==owner||!granted||taken)return null
      taken=true
      return {authorized:true,ownerId:owner,verifiedRegistration:true,
        excluded:false,gpc:false,sharingOptOut:false,withdrawn:false,
        metaReleaseEnabled:true,eventId,datasetId,
        eventTime:Math.floor(Date.now()/1000)}
    },
  })
  const client={functions:{invoke:async(name,options)=>{
    calls.push({name,options})
    const handler=name==='pazo-meta-grant'?grant:
      name==='pazo-meta-receipt'?receipt:null
    if(!handler)throw Error('unknown function')
    const req=new Request('https://pazo.invalid/functions/v1/'+name,{
      method:'POST',headers:{
        origin,'content-type':'application/json','x-client-info':'supabase-js-test',
        authorization:options.headers.Authorization,
      },body:JSON.stringify(options.body),
    })
    const reply=await handler(req)
    const data=await reply.json()
    calls[calls.length-1].httpStatus=reply.status
    calls[calls.length-1].responseStatus=data?.status
    return {data,error:reply.ok?null:{status:reply.status}}
  }}}
  const settings={released:true,privacyApproved:true,supabaseClient:client,
    ownerId:owner,getSessionSnapshot:()=>session,
    stillPermitted:()=>permitted,browser}
  return {settings,calls,effects,browser,
    changeUser:()=>{session={id:other,accessToken:token}},
    withdraw:()=>{permitted=false},
    setGpc:()=>{gpc=true},
    getSnapshot:()=>session,
  }
}
test('default OFF: no SDK client, privacy, or session reads',async()=>{
 let called=0
 const no=createMetaConsentTransport({
  supabaseClient:{functions:{invoke:()=>{called++}}},
  getSessionSnapshot:()=>{called++},
  stillPermitted:()=>{called++;return true},
 })
 assert.equal(no,null)
 assert.equal(called,0)
})
test('released transport requires an explicit owner UUID',async()=>{
 const f=fixture()
 assert.equal(createMetaConsentTransport({...f.settings,ownerId:null}),null)
 assert.equal(createMetaConsentTransport({...f.settings,ownerId:'wrong'}),null)
 const wrong=createMetaConsentTransport({...f.settings,ownerId:other})
 assert.equal((await wrong.requestGrant({accessToken:token,
   body:{action:'grant',noticeVersion:'pazo-meta-conversions-v1'}})).status,
   'not_available')
 assert.equal(f.calls.length,0)
})
test('real isolated Edge grant and receipt handlers accept canonical Supabase invoke body',async()=>{
 const f=fixture()
 const t=createMetaConsentTransport(f.settings)
 assert.ok(t)
 const g=await t.requestGrant({
   accessToken:token,body:{action:'grant',noticeVersion:'pazo-meta-conversions-v1'},
 })
 assert.deepEqual(g,{status:'granted'},JSON.stringify(f.calls.map(x=>({name:x.name,http:x.httpStatus,status:x.responseStatus}))))
 const r=await t.requestReceipt({accessToken:token,body:{}})
 assert.deepEqual(r,{status:'verified',eventName:'CompleteRegistration',
   eventId,datasetId})
 assert.equal((await t.requestReceipt({accessToken:token,body:{}})).status,
   'not_available','one-shot receipt is never reissued')
 assert.deepEqual(f.calls.map(x=>x.name),[
   'pazo-meta-grant','pazo-meta-receipt','pazo-meta-receipt',
 ])
 for(const c of f.calls){
   assert.equal(c.options.headers.Authorization,'Bearer '+token)
   assert.equal(JSON.stringify(c.options.body).includes(token),false)
   assert.equal(JSON.stringify(c.options.body).includes(owner),false)
 }
})
test('client GPC, withdrawal, token mismatch and changed account veto invocations',async()=>{
 for(const scenario of ['setGpc','withdraw','changeUser']){
   const f=fixture(),t=createMetaConsentTransport(f.settings)
   f[scenario]()
   assert.deepEqual(await t.requestGrant({accessToken:token,
     body:{action:'grant',noticeVersion:'pazo-meta-conversions-v1'}}),
     {status:'not_available'})
   assert.equal(f.calls.length,0)
 }
 const f=fixture(),t=createMetaConsentTransport(f.settings)
 assert.equal((await t.requestReceipt({accessToken:'other-token-long',body:{}})).status,
   'not_available')
 assert.equal(f.calls.length,0)
})
test('unknown body keys never enter a Meta consent endpoint',async()=>{
 const f=fixture(),t=createMetaConsentTransport(f.settings)
 for(const b of [{action:'grant',noticeVersion:'wrong'},
   {action:'grant',noticeVersion:'pazo-meta-conversions-v1',ownerId:other},
   {action:'withdraw'},{foo:'bar'}]){
   assert.equal((await t.requestGrant({accessToken:token,body:b})).status,
     'not_available')
 }
 for(const b of [{ownerId:owner},{eventId},{consent:true},null]){
   assert.equal((await t.requestReceipt({accessToken:token,body:b})).status,
     'not_available')
 }
 assert.equal(f.calls.length,0)
})
test('full synthetic opt-in to Edge core returns server event to Pixel only after consent',async()=>{
 const f=fixture(),transport=createMetaConsentTransport(f.settings)
 const pixel=[]
 const result=await completeExplicitMetaOptIn({
   releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
   ownerId:owner,accessToken:token,
   getActiveSession:()=>f.getSnapshot(),stillPermitted:()=>true,
   browser:f.browser,dom:{},
   requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
   pixelLoader:async opts=>{pixel.push(opts);return {status:'queued'}},
 })
 assert.deepEqual(result,{status:'queued'})
 assert.equal(pixel.length,1)
 assert.equal(pixel[0].eventId,eventId)
 assert.equal(pixel[0].datasetId,datasetId)
 assert.equal(f.calls.length,2)
})
test('GPC introduced while grant is pending prevents receipt and Pixel',async()=>{
 const f=fixture()
 const client=f.settings.supabaseClient
 const invoke=client.functions.invoke
 client.functions.invoke=async(...args)=>{
   const result=await invoke(...args)
   if(args[0]==='pazo-meta-grant')f.setGpc()
   return result
 }
 const transport=createMetaConsentTransport(f.settings)
 let pixel=0
 const out=await completeExplicitMetaOptIn({
   releaseEnabled:true,privacyApproved:true,deliberateOptIn:true,
   ownerId:owner,accessToken:token,getActiveSession:f.getSnapshot,
   stillPermitted:()=>true,browser:f.browser,dom:{},
   requestGrant:transport.requestGrant,requestReceipt:transport.requestReceipt,
   pixelLoader:async()=>{pixel++;return {status:'queued'}},
 })
 assert.equal(out.status,'suppressed')
 assert.equal(pixel,0)
 assert.deepEqual(f.calls.map(x=>x.name),['pazo-meta-grant'])
 // In-flight grant may commit before the browser learns about new GPC.
 // Production must honor GPC in the server's persistent preference too.
})
test('preflight accepts Supabase x-client-info only on trusted origin and never opts in',async()=>{
 const cases=[
   createMetaGrantHandler({released:true,privacyReviewed:true,
     authenticate:async()=>user,grant:async()=>true}),
   createMetaReceiptHandler({released:true,privacyReviewed:true,
     authenticate:async()=>user,lookupReceipt:async()=>null}),
   createMetaWithdrawalHandler({released:true,
     authenticate:async()=>user,withdraw:async()=>true}),
 ]
 for(const handler of cases){
   const req=new Request('https://pazo.invalid/functions/v1/test',{
     method:'OPTIONS',headers:{
       origin,'access-control-request-method':'POST',
       'access-control-request-headers':'authorization,apikey,content-type,x-client-info',
     },
   })
   const res=await handler(req)
   assert.equal(res.status,204)
   assert.equal(res.headers.get('access-control-allow-origin'),origin)
   const headers=res.headers.get('access-control-allow-headers').split(',')
   for(const name of ['authorization','apikey','content-type','x-client-info'])
     assert.ok(headers.includes(name))
   const foreign=await handler(new Request('https://pazo.invalid/',{
     method:'OPTIONS',headers:{origin:'https://evil.invalid'},
   }))
   assert.equal(foreign.status,403)
 }
})
