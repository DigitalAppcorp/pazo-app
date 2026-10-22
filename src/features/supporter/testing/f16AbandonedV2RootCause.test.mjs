import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoSandboxVerifiedCheckout}
 from '../../../../supabase/functions/f16-paypal-webhook/p06SandboxVerifiedCheckout.mjs'

// Synthetic reproduction of the hosted f16_qa_v2_begin_checkout owner lifetime
// guard. This is NOT a merchant simulation claiming why PayPal later returned 404.
const OWNER='11111111-1111-4111-8111-111111111111'
const PLAN='P-14V25407JP6850922NLHMDKI'
const TERMS='pazo-supporter-sandbox.benefits-v2'
const DIGEST='f'.repeat(64)
const first='22222222-2222-4222-8222-222222222222'
const second='44444444-4444-4444-8444-444444444444'
const INTENT='intent-33333333-3333-4333-8333-333333333333'
const SUB='I-SYNTHETIC-UNAPPROVED001'
const url='https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-SYNTHETIC'
const request=new Request('https://pazo.example.invalid/qa',{method:'POST'})
const consent=requestKey=>({
 requestKey,locale:'es',termsVersion:TERMS,termsDigest:DIGEST,
 affirmativeConsent:true
})
test('abandoning approval preserves an unpaid bound intent, but legacy begin blocks new key',async()=>{
 let ownerAttempts=0,providerPosts=0,binds=0,claimCount=0
 const checkout=createPazoSandboxVerifiedCheckout({
  resolveAuthenticatedOwner:async()=>OWNER,admit:async()=>true,
  consentStore:{
   beginForOwner:async({requestKey})=>{
    if(ownerAttempts>0&&requestKey!==first)
     throw Error('One v2 attempt per owner')
    ownerAttempts++
    return {ownerId:OWNER,requestKey,intentId:INTENT,planId:PLAN,
     termsVersion:TERMS,termsDigest:DIGEST,locale:'es',
     state:ownerAttempts===1?'pending':'bound',
     createdAt:'2026-10-18T00:00:00Z'}
   },
   claimProviderCreate:async()=>{claimCount++;return true}
  },
  subscriptionCreator:{create:async()=>{
   providerPosts++
   return {subscriptionId:SUB,status:'APPROVAL_PENDING',
    approvalUrl:url,entitlement:false}
  }},
  subscriptionReader:{readSubscription:async()=>({
   id:SUB,plan_id:PLAN,custom_id:INTENT,status:'APPROVAL_PENDING'
  })},
  intentStore:{bindVerified:async()=>{
   binds++
   return {state:'bound',result:'new_binding',entitlement:false}
  }},
  now:()=>Date.parse('2026-10-18T00:00:01Z')
 })
 const opened=await checkout.begin({request,consent:consent(first)})
 assert.equal(opened.phase,'APPROVAL_PENDING')
 assert.equal(opened.paidThrough,null)
 assert.equal(opened.entitlement,false)
 assert.equal(opened.mayGrantBenefits,false)
 assert.equal(binds,1)
 // Buyer navigates away; no approval, sale or callback is invoked.
 const blocked=await checkout.begin({request,consent:consent(second)})
 assert.equal(blocked.phase,'BLOCKED')
 assert.equal(blocked.reason,'durable_consent_or_idempotency_unavailable')
 assert.equal(blocked.paidThrough,null)
 assert.equal(blocked.mayGrantBenefits,false)
 assert.equal(providerPosts,1,'second click must not create a PayPal subscription')
 assert.equal(claimCount,1)
})
test('a repeated original requestKey cannot create another PayPal subscription',async()=>{
 let posts=0,claims=0
 const checkout=createPazoSandboxVerifiedCheckout({
  resolveAuthenticatedOwner:async()=>OWNER,admit:async()=>true,
  consentStore:{
   beginForOwner:async()=>({ownerId:OWNER,requestKey:first,intentId:INTENT,
    planId:PLAN,termsVersion:TERMS,termsDigest:DIGEST,locale:'es',
    state:'bound',createdAt:'2026-10-18T00:00:00Z'}),
   claimProviderCreate:async()=>{claims++;return true}
  },
  subscriptionCreator:{create:async()=>{posts++;throw Error('must_not_post')}},
  subscriptionReader:{readSubscription:async()=>{throw Error('must_not_get')}},
  intentStore:{bindVerified:async()=>{throw Error('must_not_bind')}},
  now:()=>Date.parse('2026-10-18T00:00:01Z')
 })
 const r=await checkout.begin({request,consent:consent(first)})
 assert.equal(r.phase,'ALREADY_LINKED_NOT_PAYMENT_VERIFIED')
 assert.equal(r.entitlement,false)
 assert.equal(r.paidThrough,null)
 assert.equal(posts,0)
 assert.equal(claims,0)
})
