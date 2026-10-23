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
 assert.deepEqual(x.accounts,[{intentId:intent,state:'pending',canDownloadAcceptance:true,
  needsReconciliation:false}])
 assert.deepEqual(calls,['owner','private'])
 for(const value of ['P-ABCDEFGHIJKLMN','providerOrigin','subscriptionId','requestKey',owner])
  assert.ok(!JSON.stringify(x).includes(value),value)
})
test('claimed request is review-only and closed history is not an active blocker',()=>{
 const claim={...row(),providerCreateClaimedAt:'2026-10-21T12:02:00Z'}
 assert.deepEqual(normalizePazoLiveOwnerSlots(slots([claim])),
  [{intentId:intent,state:'pending',canDownloadAcceptance:true,
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
test('canonical beta domain preflight is allowed, lookalikes remain forbidden',async()=>{
 const {handler,calls}=build()
 const req=(origin)=>new Request(base,{method:'OPTIONS',headers:{
  origin,'access-control-request-method':'POST'}})
 const canonical=await handler(req('https://pazo-app.vercel.app'))
 assert.equal(canonical.status,204)
 assert.equal(canonical.headers.get('access-control-allow-origin'),'https://pazo-app.vercel.app')
 assert.equal(canonical.headers.get('access-control-allow-credentials'),null)
 const lookalike=await handler(req('https://pazo-app.vercel.app.evil.example'))
 assert.equal(lookalike.status,403)
 assert.equal(lookalike.headers.get('access-control-allow-origin'),null)
 assert.deepEqual(calls,[])
})
test('Edge uses GoTrue and service-only SQL; browser selects only Live owner actions',()=>{
 const index=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-account/index.ts',import.meta.url),'utf8')
 const view=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../../supporter/components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 assert.match(index,/createPazoLiveGoTrueOwnerResolver/)
 assert.match(index,/pazo_f16_live_service_owner_checkouts_read/)
 assert.match(index,/const ACCOUNT_MANAGEMENT_RELEASED=true/)
 assert.doesNotMatch(index,/PAYPAL_CLIENT_SECRET|createSubscription/)
 assert.match(account,/pazo-paypal-live-account/)
 assert.match(account,/accounts\?\.length===0/)
 assert.match(account,/!\['list','status','cancel','resume','reconcile','abandon','abandon_pending','acknowledgement'\]\.includes/)
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
test('Live account reader can read and cancel through original generation without checkout creation',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-account/index.ts',import.meta.url),'utf8')
 assert.match(edge,/createPazoLiveVaultGenerationSecretReader/)
 assert.match(edge,/createPaypalLiveSubscriptionProvider/)
 assert.match(edge,/\.readSubscription\(subscriptionId\)/)
 assert.match(edge,/\.cancelSubscription\(subscriptionId\)/)
 assert.doesNotMatch(edge,/createSubscription\(|REFUND/)
})

test('Live abandoned PayPal login can close a verified pending approval and safely reopen the offer',async()=>{
 const bound={...row(),state:'bound',cancelState:null,subscriptionId:'I-ORIGINAL123456789',
  providerCreateClaimedAt:'2026-10-21T12:00:30Z'}
 let reads=0,claims=0,posts=0,finishes=0,retirements=0
 const {handler}=build({
  readPrivateOwner:async()=>slots([bound]),
  readProviderStatus:async()=>({
   id:bound.subscriptionId,plan_id:bound.planId,custom_id:bound.intentId,
   status:++reads===1?'APPROVAL_PENDING':'CANCELLED'
  }),
  claimCancel:async()=>{claims++;return true},
  postCancel:async()=>{posts++;return {postAccepted:true}},
  finishCancel:async()=>{finishes++;return true},
  retireTerminal:async({intentId,providerStatus})=>{
   assert.equal(intentId,intent)
   assert.equal(providerStatus,'CANCELLED')
   retirements++;return true
  }
 })
 const denied=await handler(req({action:'abandon_pending',intentId:intent}))
 assert.equal(denied.status,400,'A click without the dedicated consent is rejected')
 const approved=await handler(req({action:'abandon_pending',intentId:intent,confirmAbandon:true}))
 assert.equal(approved.status,200)
 const response=await approved.json()
 assert.equal(response.code,'live_checkout_slot_released')
 assert.equal(response.paidThrough,null)
 assert.equal(response.mayCharge,false)
 assert.equal(response.mayGrantBenefits,false)
 assert.deepEqual({reads,claims,posts,finishes,retirements},
  {reads:2,claims:1,posts:1,finishes:1,retirements:1})
 assert.ok(!JSON.stringify(response).includes(bound.subscriptionId))
})
test('Live retry never cancels an ACTIVE, APPROVED, wrong-owner or mismatched checkout',async()=>{
 const bound={...row(),state:'bound',cancelState:null,subscriptionId:'I-ORIGINAL123456789',
  providerCreateClaimedAt:'2026-10-21T12:00:30Z'}
 for(const status of ['ACTIVE','APPROVED','SUSPENDED','EXPIRED']){
  let posts=0,claims=0
  const {handler}=build({
   readPrivateOwner:async()=>slots([bound]),
   readProviderStatus:async()=>({id:bound.subscriptionId,plan_id:bound.planId,
    custom_id:bound.intentId,status}),
   claimCancel:async()=>{claims++;return true},
   postCancel:async()=>{posts++;return {postAccepted:true}},
   finishCancel:async()=>true
  })
  const res=await handler(req({action:'abandon_pending',intentId:intent,confirmAbandon:true}))
  assert.equal(res.status,409,status)
  assert.equal((await res.json()).code,'live_cancel_not_available')
  assert.equal(claims,0)
  assert.equal(posts,0)
 }
 let claimed=false
 const {handler}=build({readPrivateOwner:async()=>slots([bound]),
  readProviderStatus:async()=>({id:bound.subscriptionId,plan_id:bound.planId,
   custom_id:'intent-23456789-1234-4234-8234-000000000000',status:'APPROVAL_PENDING'}),
  claimCancel:async()=>{claimed=true;return true},
  postCancel:async()=>true,finishCancel:async()=>true})
 const mismatch=await handler(req({action:'abandon_pending',intentId:intent,confirmAbandon:true}))
 assert.equal(mismatch.status,409)
 assert.equal(claimed,false)
})
test('PayPal cancellation timeout fails closed; same intent can finish only after independent GET',async()=>{
 const bound={...row(),state:'bound',cancelState:null,subscriptionId:'I-ORIGINAL123456789',
  providerCreateClaimedAt:'2026-10-21T12:00:30Z'}
 let posted=0,release=0,claimed=0
 const first=build({readPrivateOwner:async()=>slots([bound]),
  readProviderStatus:async()=>({id:bound.subscriptionId,plan_id:bound.planId,
   custom_id:bound.intentId,status:'APPROVAL_PENDING'}),
  claimCancel:async()=>{claimed++;return true},
  postCancel:async()=>{posted++;throw Error('network_timeout')},
  finishCancel:async()=>true,
  retireTerminal:async()=>{release++;return true}
 })
 const blocked=await first.handler(req({action:'abandon_pending',intentId:intent,confirmAbandon:true}))
 assert.equal(blocked.status,409)
 assert.equal(posted,1)
 assert.equal(release,0)
 assert.equal(claimed,1)
 // After the durable claim, a later owner action only GETs the original
 // subscription; there must be no second cancellation POST.
 const claimedBound={...bound,cancelState:'review_required'}
 const second=build({readPrivateOwner:async()=>slots([claimedBound]),
  readProviderStatus:async()=>({id:bound.subscriptionId,plan_id:bound.planId,
   custom_id:bound.intentId,status:'CANCELLED'}),
  claimCancel:async()=>{throw Error('duplicate claim')},
  postCancel:async()=>{throw Error('duplicate cancellation')},
  finishCancel:async()=>true,
  retireTerminal:async()=>{release++;return true}
 })
 const reconciled=await second.handler(req({action:'abandon_pending',intentId:intent,confirmAbandon:true}))
 assert.equal(reconciled.status,200)
 assert.equal((await reconciled.json()).code,'live_checkout_slot_released')
 assert.equal(release,1)
})
test('Live cancelled pending approval remains blocked when financial and event reconciliation is not complete',async()=>{
 const bound={...row(),state:'bound',subscriptionId:'I-ORIGINAL123456789',
  providerCreateClaimedAt:'2026-10-21T12:00:30Z',cancelState:'confirmed'}
 const {handler}=build({readPrivateOwner:async()=>slots([bound]),
  readProviderStatus:async()=>({id:bound.subscriptionId,plan_id:bound.planId,
   custom_id:bound.intentId,status:'CANCELLED'}),
  claimCancel:async()=>{throw Error('should not be called')},
  postCancel:async()=>{throw Error('should not be called')},
  finishCancel:async()=>{throw Error('should not be called')},
  retireTerminal:async()=>false
 })
 const r=await handler(req({action:'abandon_pending',intentId:intent,confirmAbandon:true}))
 assert.equal(r.status,409)
 const response=await r.json()
 assert.equal(response.code,'live_coverage_or_events_pending')
 assert.equal(response.mayCharge,false)
})
