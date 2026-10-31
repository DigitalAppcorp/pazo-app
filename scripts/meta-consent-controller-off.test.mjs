// Isolated controller contract: never uses actual Supabase, Meta SDK or users.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createMetaConsentController}
  from '../src/features/marketing/metaConsentController.mjs'

const owner='16900000-0000-4000-8000-000000000001'
const other='16900000-0000-4000-8000-000000000002'
const accessToken='synthetic-jwt-never-real-000001'
const eventId='11111111-2222-4333-8444-555555555555'
const datasetId='1438916858347709'
function lab(){
 let account=owner,token=accessToken,gpc=false,permit=true,grants=0
 let withdrawn=0,receiptCount=0,grantShouldFail=false
 const actions=[]
 const browser={navigator:{get globalPrivacyControl(){return gpc}}}
 const supabaseClient={functions:{invoke:async(name,opts)=>{
   actions.push(name)
   assert.equal(opts.headers.Authorization,'Bearer '+accessToken)
   if(name==='pazo-meta-grant'){
     grants++
     return grantShouldFail?{data:null,error:{status:503}}:
       {data:{status:'granted'},error:null}
   }
   if(name==='pazo-meta-receipt'){
     receiptCount++
     return {data:receiptCount===1?{
       status:'verified',eventId,eventName:'CompleteRegistration',datasetId,
     }:{status:'not_available'},error:null}
   }
   if(name==='pazo-meta-consent'){
     withdrawn++
     return {data:{status:'withdrawn'},error:null}
   }
   throw Error('Unexpected endpoint '+name)
 }}}
 const options=()=>({
   releaseEnabled:true,privacyApproved:true,withdrawalReleased:true,
   ownerId:owner,accessToken,supabaseClient,
   getSessionSnapshot:()=>({id:account,accessToken:token}),
   stillPermitted:()=>permit,browser,dom:{},
 })
 return {
   options,actions,
   counts:()=>({grants,receiptCount,withdrawn}),
   gpc:()=>{gpc=true},switchAccount:()=>{account=other},
   disable:()=>{permit=false},failGrant:()=>{grantShouldFail=true},
 }
}

test('controller is inert and performs no reads when all release flags are OFF',()=>{
 let reads=0
 const c=createMetaConsentController({
   supabaseClient:{functions:{invoke:()=>{reads++}}},
   getSessionSnapshot:()=>{reads++},
 })
 assert.equal(c,null)
 assert.equal(reads,0)
})
test('a saved consent is not falsely reported failed when Pixel is blocked',async()=>{
 const f=lab(),pixel=[]
 const c=createMetaConsentController({...f.options(),
   pixelLoader:async options=>{
     pixel.push(options.eventId)
     return {status:'unavailable'}
   },
 })
 assert.ok(c)
 assert.equal(await c.onGrant(),true,'server grant saved even if Pixel failed')
 assert.equal(await c.onGrant(),true,'second click should not send a new receipt')
 assert.deepEqual(f.actions,['pazo-meta-grant','pazo-meta-receipt'])
 assert.deepEqual(pixel,[eventId])
})
test('grant failure is not called saved and cannot request a receipt',async()=>{
 const f=lab();f.failGrant()
 let pixel=0
 const c=createMetaConsentController({...f.options(),
   pixelLoader:async()=>{pixel++;return {status:'queued'}},
 })
 assert.equal(await c.onGrant(),false)
 assert.equal(pixel,0)
 assert.deepEqual(f.actions,['pazo-meta-grant'])
})
test('without privacy approval only first-party withdrawal is available',async()=>{
 const f=lab()
 const c=createMetaConsentController({...f.options(),
   releaseEnabled:false,privacyApproved:false,
 })
 assert.equal(await c.onGrant(),false)
 assert.equal(await c.onWithdraw(),true)
 assert.deepEqual(f.actions,['pazo-meta-consent'])
})
test('GPC sync withdraws without consent or Meta provider requests',async()=>{
 const f=lab();f.gpc()
 const c=createMetaConsentController({...f.options(),
   releaseEnabled:false,privacyApproved:false,
 })
 assert.deepEqual(await c.syncGpc(),{status:'withdrawn'})
 assert.equal(await c.onGrant(),false)
 assert.deepEqual(f.actions,['pazo-meta-consent'])
})
test('a pending Pixel cannot complete after explicit withdrawal',async()=>{
 const f=lab();let finish,started
 const startedPromise=new Promise(resolve=>{started=resolve})
 const c=createMetaConsentController({...f.options(),
   pixelLoader:async()=>{
     started()
     return new Promise(resolve=>{finish=resolve})
   },
 })
 const attempt=c.onGrant()
 await startedPromise
 assert.equal(await c.onWithdraw(),true)
 finish({status:'queued'})
 assert.equal(await attempt,false)
 assert.equal(await c.onGrant(),false,'no opt-in resurrected after withdrawal')
 assert.deepEqual(f.actions,['pazo-meta-grant','pazo-meta-receipt',
   'pazo-meta-consent'])
})
test('account switch after saved consent vetoes UI confirmation',async()=>{
 const f=lab()
 const opts=f.options()
 const origInvoke=opts.supabaseClient.functions.invoke
 opts.supabaseClient.functions.invoke=async(name,options)=>{
   const res=await origInvoke(name,options)
   if(name==='pazo-meta-grant')f.switchAccount()
   return res
 }
 const c=createMetaConsentController({...opts,pixelLoader:async()=>{
   throw Error('should not reach pixel')
 }})
 assert.equal(await c.onGrant(),false)
 assert.deepEqual(f.actions,['pazo-meta-grant'])
})
test('parallel clicks share one flight and do not duplicate a receipt or Pixel',async()=>{
 const f=lab(),pixels=[]
 const c=createMetaConsentController({...f.options(),
   pixelLoader:async opt=>{
     pixels.push(opt.eventId)
     return {status:'queued'}
   },
 })
 const [a,b]=await Promise.all([c.onGrant(),c.onGrant()])
 assert.equal(a,true);assert.equal(b,true)
 assert.deepEqual(f.actions,['pazo-meta-grant','pazo-meta-receipt'])
 assert.deepEqual(pixels,[eventId])
})

test('positive Meta permission cannot start without an available withdrawal channel',async()=>{
 const f=lab()
 const c=createMetaConsentController({...f.options(),
   withdrawalReleased:false,pixelLoader:async()=>{
     throw Error('must never load Pixel')
   }})
 assert.ok(c)
 assert.equal(await c.onGrant(),false)
 assert.equal(await c.onWithdraw(),false)
 assert.deepEqual(f.actions,[])
})
