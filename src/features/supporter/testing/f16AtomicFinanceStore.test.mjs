import test from 'node:test'
import assert from 'node:assert/strict'
import {createAtomicFinanceStore} from '../../../../supabase/functions/f16-paypal-webhook/atomicFinanceStoreAdapter.mjs'
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const KEY='mock-server-secret-not-a-real-service-role-key'
const candidate={provider:'paypal',externalPaymentId:'PAY-SANDBOX-123',
 externalSubscriptionId:'I-SANDBOX-AAAA',
 ownerId:'63e812b0-a7e5-49f6-b2dd-c11d2c72af57',
 grossMinorUnits:299,currency:'USD',completedAt:'2026-10-13T19:00:00Z'}
function setup({result='inserted_uncredited',ok=true}={}){
 const calls=[]
 const fetchImpl=async(uri,opts)=>{calls.push({uri,opts});return{ok,json:async()=>result}}
 return {store:createAtomicFinanceStore({projectUrl:URL,serviceRoleKey:KEY,fetchImpl}),calls}
}
test('sale candidate commits through ONE restricted atomic RPC with no private payload',async()=>{
 const x=setup()
 const r=await x.store.commitVerifiedSale({eventId:'WH-SANDBOX-001',candidate,environment:'sandbox'})
 assert.equal(r.entitlement,false)
 assert.equal(r.result,'inserted_uncredited')
 assert.equal(x.calls[0].uri,URL+'/rest/v1/rpc/f16_paypal_commit_verified_sale')
 assert.equal(x.calls[0].opts.redirect,'error')
 const body=JSON.parse(x.calls[0].opts.body)
 assert.deepEqual(body,{
  p_event_id:'WH-SANDBOX-001',p_payment_id:candidate.externalPaymentId,
  p_subscription_id:candidate.externalSubscriptionId,p_owner_id:candidate.ownerId,
  p_plan_id:'P-14V25407JP6850922NLHMDKI',p_minor:299,
  p_currency:'USD',p_completed_at:candidate.completedAt,
 })
 assert.equal(JSON.stringify(body).includes(KEY),false)
})
test('reversal commits separately and can arrive before original payment',async()=>{
 const x=setup({result:'reversal_recorded'})
 const r=await x.store.commitVerifiedReversal({
  eventId:'WH-REFUND-01',externalPaymentId:candidate.externalPaymentId,
  kind:'refunded',verifiedAt:candidate.completedAt,environment:'sandbox',
 })
 assert.deepEqual(r,{result:'reversal_recorded',entitlement:false})
 assert.equal(x.calls[0].uri,URL+'/rest/v1/rpc/f16_paypal_commit_verified_reversal')
})
test('live, wrong owner, wrong amount, invalid time and unverified event IDs fail before network',async()=>{
 const x=setup()
 for(const patch of [
  {environment:'live'}, {eventId:'bad/event'},
  {candidate:{...candidate,ownerId:'other'}},
  {candidate:{...candidate,grossMinorUnits:300}},
  {candidate:{...candidate,currency:'EUR'}},
  {candidate:{...candidate,completedAt:'2026-02-30T19:00:00Z'}},
 ]){
  await assert.rejects(x.store.commitVerifiedSale({
   eventId:'WH-SANDBOX-001',candidate,environment:'sandbox',...patch}),/sale_proof_incomplete/)
 }
 assert.equal(x.calls.length,0)
})
test('refund requires Sandbox evidence and a known type',async()=>{
 const x=setup({result:'reversal_recorded'})
 await assert.rejects(x.store.commitVerifiedReversal({
  eventId:'WH-01',externalPaymentId:'PAY-01',kind:'refund_guessed',
  verifiedAt:'2026-10-13T19:00:00Z',environment:'sandbox',
 }),/reversal_proof_incomplete/)
 await assert.rejects(x.store.commitVerifiedReversal({
  eventId:'WH-01',externalPaymentId:'PAY-01',kind:'refunded',
  verifiedAt:'2026-10-13T19:00:00Z',environment:'live',
 }),/reversal_proof_incomplete/)
 assert.equal(x.calls.length,0)
})
test('missing RPC or unexpected result cannot be interpreted as paid access',async()=>{
 const x=setup({ok:false})
 await assert.rejects(x.store.commitVerifiedSale({
  eventId:'WH-SANDBOX-001',candidate,environment:'sandbox',
 }),/atomic_finance_rpc_unavailable/)
 const y=setup({result:'ACTIVE'})
 await assert.rejects(y.store.commitVerifiedSale({
  eventId:'WH-SANDBOX-001',candidate,environment:'sandbox',
 }),/unexpected_financial_commit_result/)
})
test('privileged key cannot be sent to another Supabase host',()=>{
 for(const projectUrl of [URL+'/', 'https://evil.example',
   'http://mrybvqdebbgcayuvgkkr.supabase.co']){
  assert.throws(()=>createAtomicFinanceStore({projectUrl,serviceRoleKey:KEY}),/not_configured/)
 }
})
