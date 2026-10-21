import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveOwnerAccountRead,normalizePazoLiveOwnerSlots}
 from '../../../../supabase/functions/pazo-paypal-live-account/liveAccountRead.mjs'
const owner='12345678-1234-4234-8234-123456789abc'
const intent='intent-23456789-1234-4234-8234-123456789abc'
const base='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-account'
const row=()=>({intentId:intent,merchantGeneration:1,planId:'P-ABCDEFGHIJKLMN',
 requestKey:'23456789-1234-4234-8234-123456789abc',subscriptionId:null,
 providerStatus:null,providerCreateClaimedAt:null,closedAt:null,
 state:'pending',createdAt:'2026-10-21T12:00:00Z',
 providerOrigin:'https://pazo-app-t83r.vercel.app'})
const slots=(rows=[row()],current=intent)=>({
 source:'private_original_live_owner_checkouts',currentIntentId:current,accounts:rows
})
const req=(body={action:'list'},url=base,origin='https://pazo-app-t83r.vercel.app')=>
 new Request(url,{method:'POST',headers:{origin,'content-type':'application/json',
 authorization:'Bearer AAA.BBB.CCC'},body:JSON.stringify(body)})
const build=(overrides={})=>{
 const calls=[]
 const handler=createPazoLiveOwnerAccountRead({released:true,
  resolveAuthenticatedOwner:async()=>{calls.push('owner');return owner},
  readPrivateOwner:async({ownerId})=>{
   assert.equal(ownerId,owner);calls.push('private');return slots()
  },...overrides})
 return {handler,calls}
}
test('default disabled list performs no JWT or service action',async()=>{
 let called=false
 const r=await createPazoLiveOwnerAccountRead({
  readPrivateOwner:async()=>{called=true}})(req())
 assert.equal(r.status,503)
 assert.equal((await r.json()).code,'live_account_read_not_released')
 assert.equal(called,false)
})
test('owner reads exact open slot, redacted of subscription, merchant and request identifiers',async()=>{
 const {handler,calls}=build()
 const r=await handler(req())
 assert.equal(r.status,200)
 const x=await r.json()
 assert.equal(x.ok,true)
 assert.equal(x.code,'live_account_list_verified')
 assert.equal(x.environment,'live')
 assert.equal(x.paidThrough,null)
 assert.equal(x.mayCharge,false)
 assert.deepEqual(x.accounts,[{intentId:intent,state:'pending',canDownloadAcceptance:false,
  needsReconciliation:false}])
 assert.deepEqual(calls,['owner','private'])
 for(const value of ['P-ABCDEFGHIJKLMN','providerOrigin','subscriptionId','requestKey',owner])
  assert.ok(!JSON.stringify(x).includes(value),value)
})
test('claimed request is review-only and closed history is not an active blocker',()=>{
 const claim={...row(),providerCreateClaimedAt:'2026-10-21T12:02:00Z'}
 assert.deepEqual(normalizePazoLiveOwnerSlots(slots([claim])),
  [{intentId:intent,state:'pending',canDownloadAcceptance:false,
   needsReconciliation:true}])
 assert.deepEqual(normalizePazoLiveOwnerSlots(slots([{
  ...row(),state:'abandoned',closedAt:'2026-10-21T12:10:00Z'}],null)),[])
})
test('ambiguous, duplicate, wrong-owner scoped or malformed database responses fail closed',async()=>{
 const cases=[
  null,{...slots(),source:'unknown'},slots([row(),row()]),
  slots([row()],null),slots([],intent),slots([{...row(),intentId:'invalid'}]),
  slots([{...row(),subscriptionId:{id:'I-UNTRUSTED'}}]),
  slots([{...row(),providerStatus:'HTML_PAYLOAD<script>'}]),
  slots([{...row(),merchantGeneration:0}])
 ]
 for(const item of cases){
  const {handler}=build({readPrivateOwner:async()=>item})
  const r=await handler(req())
  assert.equal(r.status,503)
  assert.equal((await r.json()).code,'live_account_list_unavailable')
 }
})
test('no authenticated owner, forged origin, extra actions or malformed body can query private rows',async()=>{
 const badOwner=build({resolveAuthenticatedOwner:async()=>null})
 assert.equal((await badOwner.handler(req())).status,401)
 assert.deepEqual(badOwner.calls,[])
 const f=build()
 const requests=[
  req({action:'cancel',intentId:intent}),
  req({action:'list',ownerId:owner}),
  req({action:'list'},base+'?ownerId='+owner),
  req({action:'list'},base,'https://pazo-app-t83r.vercel.app.evil.invalid')
 ]
 const statuses=[400,400,400,403]
 for(let i=0;i<requests.length;i++)
  assert.equal((await f.handler(requests[i])).status,statuses[i])
 assert.deepEqual(f.calls,[])
})
test('preflight exposes no personal data or subscription creation permission',async()=>{
 const {handler,calls}=build()
 const res=await handler(new Request(base,{method:'OPTIONS',headers:{
  origin:'https://pazo-app-t83r.vercel.app',
  'access-control-request-method':'POST'}}))
 assert.equal(res.status,204)
 assert.equal(res.headers.get('access-control-allow-origin'),
  'https://pazo-app-t83r.vercel.app')
 assert.equal(await res.text(),'')
 assert.deepEqual(calls,[])
})
test('Edge uses GoTrue and service-only SQL; browser routes to Live list without cancel actions',()=>{
 const index=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-account/index.ts',import.meta.url),'utf8')
 const view=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../../supporter/components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 assert.match(index,/createPazoLiveGoTrueOwnerResolver/)
 assert.match(index,/pazo_f16_live_service_owner_checkouts_read/)
 assert.match(index,/const READONLY_RELEASED=true/)
 assert.doesNotMatch(index,/PAYPAL_CLIENT_SECRET|createSubscription|cancelSubscription/)
 assert.match(account,/pazo-paypal-live-account/)
 assert.match(account,/accounts\?\.length===0/)
 assert.match(account,/!\['list','status'\]\.includes/)
 assert.match(account,/onClick=\{\(\) => void checkStatus\(account\.intentId\)\}/)
 assert.match(view,/LIVE_VAULT_SETUP_RELEASED=true/)
})

test('bound Live owner may read provider status but never paid coverage or provider IDs',async()=>{
 const bound={...row(),state:'bound',subscriptionId:'I-ORIGINAL123456789',
  providerCreateClaimedAt:'2026-10-21T12:00:30Z'}
 const seen=[]
 const {handler}=build({
  readPrivateOwner:async()=>slots([bound]),
  readProviderStatus:async arg=>{
   seen.push(arg)
   return {id:bound.subscriptionId,plan_id:bound.planId,
    custom_id:bound.intentId,status:'ACTIVE'}
  }
 })
 const result=await handler(req({action:'status',intentId:intent}))
 assert.equal(result.status,200)
 const body=await result.json()
 assert.equal(body.code,'live_provider_status_read')
 assert.equal(body.providerStatus,'ACTIVE')
 assert.equal(body.paidThrough,null)
 assert.equal(body.mayGrantBenefits,false)
 assert.equal(body.mayCharge,false)
 assert.equal(seen.length,1)
 assert.equal(seen[0].merchantGeneration,1)
 assert.equal(seen[0].subscriptionId,bound.subscriptionId)
 for(const secret of [bound.subscriptionId,bound.planId,bound.requestKey,owner])
  assert.ok(!JSON.stringify(body).includes(secret))
})
test('status never consults provider for other owner, pending or wrong subscription',async()=>{
 let reads=0
 const pending=build({readProviderStatus:async()=>{reads++}})
 assert.equal((await pending.handler(req({action:'status',intentId:intent}))).status,409)
 const bound={...row(),state:'bound',subscriptionId:'I-ORIGINAL123456789',
  providerCreateClaimedAt:'2026-10-21T12:00:30Z'}
 const unknown=build({readPrivateOwner:async()=>slots([bound]),
  readProviderStatus:async()=>{reads++;return {id:bound.subscriptionId,
   plan_id:bound.planId,custom_id:'intent-WRONG',status:'ACTIVE'}}})
 const res=await unknown.handler(req({action:'status',intentId:intent}))
 assert.equal(res.status,503)
 assert.equal((await res.json()).code,'live_provider_status_unverified')
 assert.equal(reads,1)
})
test('Live account reader can read original generation including retired status but cannot cancel',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-account/index.ts',import.meta.url),'utf8')
 assert.match(edge,/createPazoLiveVaultGenerationSecretReader/)
 assert.match(edge,/createPaypalLiveSubscriptionProvider/)
 assert.match(edge,/return provider\.readSubscription\(subscriptionId\)/)
 assert.doesNotMatch(edge,/\.cancelSubscription\(|createSubscription\(|REFUND|service_cancel_claim/)
})
