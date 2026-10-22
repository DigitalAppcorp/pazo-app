import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxV2MultiAccountStore} from '../../../../supabase/functions/f16-paypal-webhook/pazoSandboxV2MultiAccountStore.mjs'
const owner='11111111-1111-4111-8111-111111111111'
const old='intent-22222222-2222-4222-8222-222222222222'
const current='intent-33333333-3333-4333-8333-333333333333'
const row=(intentId,externalSubscriptionId)=>({
 ownerId:owner,intentId,provider:'paypal',planId:'P-14V25407JP6850922NLHMDKI',
 state:'bound',externalSubscriptionId,locale:'es',
 termsVersion:'pazo-supporter-sandbox.benefits-v2',termsDigest:'a'.repeat(64),
 exactCopy:'T'.repeat(140),consentedAt:'2026-10-18T12:00:00Z',
 priceMinor:299,currency:'USD',cadence:'MONTH_1',providerCreateClaimed:true
})
const records=[row(current,'I-NEW-ATTEMPT'),row(old,'I-OLD-ATTEMPT')]
const make=(rows=records)=>{const calls=[];return {
 calls,store:createPazoSandboxV2MultiAccountStore({
 projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
 serviceRoleKey:'a'.repeat(30),
 fetchImpl:async(url,opts)=>{
  calls.push({url,method:opts.method,body:JSON.parse(opts.body)})
  return {ok:true,json:async()=>rows}
 }
 })}}
test('latest owner record does not erase previous binding',async()=>{
 const {store,calls}=make()
 assert.equal((await store.readForOwner({ownerId:owner})).intentId,current)
 assert.equal((await store.readForOwner({ownerId:owner,intentId:old})).externalSubscriptionId,'I-OLD-ATTEMPT')
 assert.equal((await store.listForOwner({ownerId:owner})).length,2)
 assert.equal((await store.load(old,owner)).externalSubscriptionId,'I-OLD-ATTEMPT')
 assert.equal((await store.load(current,owner)).externalSubscriptionId,'I-NEW-ATTEMPT')
 assert.equal((await store.readAcknowledgementForOwner({ownerId:owner,intentId:old})).exactCopy.length,140)
 assert.ok(calls.every(x=>x.url.endsWith('/f16_qa_v2_multi_list_owner_accounts')&&
  x.method==='POST'&&x.body.p_owner_id===owner))
})
test('wrong owner, forged binding or duplicate intent fails closed',async()=>{
 const {store}=make()
 await assert.rejects(()=>store.listForOwner({ownerId:'not-uuid'}))
 await assert.rejects(()=>store.load(old,'11111111-1111-4111-8111-111111111112'))
 const {store:bad}=make([...records,{...records[0]}])
 await assert.rejects(()=>bad.listForOwner({ownerId:owner}))
 const {store:crossOwner}=make([{...records[0],ownerId:'11111111-1111-4111-8111-111111111112'}])
 await assert.rejects(()=>crossOwner.readForOwner({ownerId:owner}))
})
test('unknown exact intent cannot cancel or download a different subscription',async()=>{
 const {store}=make()
 const missing='intent-44444444-4444-4444-8444-444444444444'
 assert.equal(await store.load(missing,owner),null)
 assert.equal(await store.readAcknowledgementForOwner({ownerId:owner,intentId:missing}),null)
})
