import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxV2AccountStore}
 from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2AccountStore.mjs'
import {createPazoSandboxSupporterAccountHandler}
 from '../../../../supabase/functions/f16-paypal-webhook/p14SandboxSupporterAccountHandler.mjs'

const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const OWNER='11111111-1111-4111-8111-111111111111'
const FOREIGN='22222222-2222-4222-8222-222222222222'
const V1='intent-33333333-3333-4333-8333-333333333333'
const V2='intent-44444444-4444-4444-8444-444444444444'
const SUB='I-SANDBOX-V2-ABC1'
const SECRET='only-a-synthetic-service-test-key'
const origin='https://pazo-qa.example'
const payload={ownerId:OWNER,intentId:V2,provider:'paypal',
 planId:'P-14V25407JP6850922NLHMDKI',state:'bound',
 externalSubscriptionId:SUB,locale:'es',
 termsVersion:'pazo-supporter-sandbox.benefits-v2',
 termsDigest:'a'.repeat(64),exactCopy:'Prueba sandbox cuatro beneficios. '.repeat(10),
 consentedAt:'2026-10-17T12:00:00Z',priceMinor:299,currency:'USD',
 cadence:'MONTH_1',providerCreateClaimed:true}
const make=({authOwner=OWNER,providerBehavior='ACTIVE'}={})=>{
 let rpcCalls=[],providerCalls=[]
 const fetchImpl=async(url,opts)=>{
  assert.equal(url,BASE+'/rest/v1/rpc/f16_qa_v2_read_owner_account')
  assert.equal(opts.method,'POST')
  const args=JSON.parse(opts.body)
  rpcCalls.push(args)
  const result=args.p_owner_id===OWNER &&
      (args.p_intent_id===null || args.p_intent_id===V2)?payload:null
  return {ok:true,json:async()=>result}
 }
 const store=createPazoSandboxV2AccountStore({
  projectUrl:BASE,serviceRoleKey:SECRET,fetchImpl,
 })
 const provider={
  read:async data=>{providerCalls.push({action:'status',...data});return {status:providerBehavior}},
  cancel:async data=>{providerCalls.push({action:'cancel',...data});return {status:'CANCELLED'}},
 }
 const manage=createPazoSandboxSupporterAccountHandler({
  resolveAuthenticatedOwner:async()=>authOwner,
  privateIntentStore:store,consentStore:store,provider,admit:async()=>true,
  trustedOrigins:[origin],
 })
 const send=(body)=>manage(new Request(origin+'/api',{
  method:'POST',headers:{origin,'content-type':'application/json'},
  body:JSON.stringify(body)
 }))
 return {store,send,rpcCalls,providerCalls}
}
test('F16 v2 only: lookups require the real owner and reject the V1 intent',async()=>{
 const x=make()
 assert.equal((await x.store.readForOwner({ownerId:OWNER})).intentId,V2)
 assert.equal(await x.store.load(V1,OWNER),null)
 assert.equal(await x.store.load(V2,FOREIGN),null)
 assert.equal((await x.store.load(V2,OWNER)).externalSubscriptionId,SUB)
 await assert.rejects(()=>x.store.load(V2),/qa_v2_private_owner_account_unavailable/)
 assert.deepEqual(x.rpcCalls[1],{p_owner_id:OWNER,p_intent_id:V1})
})
test('F16 v2: status reads only V2, not the old subscriber or another owner',async()=>{
 const x=make()
 const bad=await x.send({action:'status',intentId:V1})
 assert.equal(bad.status,404)
 assert.equal(x.providerCalls.length,0)
 const ok=await x.send({action:'status',intentId:V2})
 assert.equal(ok.status,200)
 const body=await ok.json()
 assert.equal(body.providerStatus,'ACTIVE')
 assert.equal(body.paidThrough,null)
 assert.equal(body.mayGrantBenefits,false)
 assert.deepEqual(x.providerCalls,[{action:'status',intentId:V2,subscriptionId:SUB}])
 const other=make({authOwner:FOREIGN})
 assert.equal((await other.send({action:'status',intentId:V2})).status,404)
 assert.equal(other.providerCalls.length,0)
})
test('F16 v2: cancellation cannot affect V1 and requires explicit owner confirmation',async()=>{
 const x=make()
 assert.equal((await x.send({action:'cancel',intentId:V1,confirmCancellation:true})).status,404)
 assert.equal((await x.send({action:'cancel',intentId:V2})).status,400)
 assert.equal((await x.send({action:'cancel',intentId:V2,confirmCancellation:false})).status,400)
 assert.equal(x.providerCalls.length,0)
 const ok=await x.send({action:'cancel',intentId:V2,confirmCancellation:true})
 assert.equal(ok.status,200)
 const body=await ok.json()
 assert.equal(body.cancelled,true)
 assert.equal(body.paidThrough,null)
 assert.deepEqual(x.providerCalls,[{action:'cancel',intentId:V2,subscriptionId:SUB}])
})
test('F16 v2: owner can download only new accepted benefit terms, not historical terms',async()=>{
 const x=make()
 const wrong=await x.send({action:'acknowledgement',intentId:V1})
 assert.equal(wrong.status,404)
 const ok=await x.send({action:'acknowledgement',intentId:V2})
 assert.equal(ok.status,200)
 const body=await ok.text()
 assert.match(body,/pazo-supporter-sandbox\.benefits-v2/)
 assert.match(body,/Prueba sandbox cuatro beneficios/)
 assert.doesNotMatch(body,/qa20261016-v1/)
 assert.equal(x.providerCalls.length,0)
})
test('F16 v2: no verified owner, wrong origin and fake auth reject before merchant mutation',async()=>{
 const wrong=make({authOwner:null})
 assert.equal((await wrong.send({action:'cancel',intentId:V2,confirmCancellation:true})).status,401)
 assert.equal(wrong.providerCalls.length,0)
 const x=make()
 const res=await x.send({action:'cancel',intentId:V1,confirmCancellation:true})
 assert.equal(res.status,404)
 assert.equal(x.providerCalls.length,0)
})
