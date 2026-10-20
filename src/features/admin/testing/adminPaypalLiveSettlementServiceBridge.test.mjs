import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveServiceRpc}
 from '../../../../supabase/functions/pazo-paypal-live-checkout/liveSqlServiceAdapters.mjs'
import {createPazoLiveVerifiedSettlementWriter}
 from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVerifiedSettlementWriter.mjs'

const hosted='https://mrybvqdebbgcayuvgkkr.supabase.co'
const serviceKey='TEST_SERVICE_ROLE_NEVER_REAL_1234567890'
const ownerId='12345678-1234-4234-8234-123456789abc'
const intentId='intent-23456789-1234-4234-8234-123456789abc'
const subscriptionId='I-SUBSCRIPTION123456'
const binding={provider:'paypal',sourceEnvironment:'live',ownerVerified:true,
 merchantGenerationVerified:true,ownerId,intentId,subscriptionId,merchantGeneration:7}
const sale={provider:'paypal',sourceEnvironment:'live',merchantVerified:true,
 signatureVerified:true,subscriptionVerified:true,subscriptionId,
 merchantGeneration:7,saleId:'SALE-123456789',eventId:'WH-123456789',
 eventType:'PAYMENT.SALE.COMPLETED',state:'COMPLETED',currency:'USD',amountMinor:299}
const period={cycleKey:'CYCLE-2026-11',providerPeriodVerified:true,
 serviceStart:'2026-11-01T00:00:00.000Z',
 serviceEnd:'2026-12-01T00:00:00.000Z'}
const expectedBase={
 p_owner:ownerId,p_intent:intentId,p_subscription:subscriptionId,
 p_generation:7,p_event_id:sale.eventId,p_sale_id:sale.saleId
}
function setup(next=()=> 'recorded'){
 const calls=[]
 const rpc=createPazoLiveServiceRpc({
  projectUrl:hosted,serviceRoleKey:serviceKey,
  fetchImpl:async (url,init)=>{
   calls.push({url,init,payload:JSON.parse(init.body)})
   const status=next(calls.length)
   return new Response(JSON.stringify(status),{status:200,
    headers:{'content-type':'application/json'}})
  }
 })
 return {calls,writer:createPazoLiveVerifiedSettlementWriter({rpc})}
}
test('verified Live sale crosses service-only REST bridge with exact public SQL argument names',async()=>{
 const {calls,writer}=setup()
 const decision=await writer.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(decision.state,'RECORDED')
 assert.equal(decision.entitlementGranted,false)
 assert.equal(calls.length,1)
 const q=calls[0]
 assert.equal(q.url,hosted+'/rest/v1/rpc/pazo_f16_live_service_verified_sale_record')
 assert.equal(q.init.headers.Authorization,'Bearer '+serviceKey)
 assert.equal(q.init.method,'POST')
 assert.deepEqual(q.payload,{
  ...expectedBase,p_cycle_key:period.cycleKey,p_amount_minor:299,
  p_currency:'USD',p_start:period.serviceStart,p_end:period.serviceEnd
 })
 assert.equal(Object.hasOwn(q.payload,'p_service_start'),false)
 assert.equal(Object.hasOwn(q.payload,'p_service_end'),false)
})
test('verified full reversal uses exact hold enum and never invokes an entitlement writer',async()=>{
 const {calls,writer}=setup()
 const receipt={...sale,eventType:'PAYMENT.SALE.REFUNDED',
  holdId:'HOLD-12345678',originalSaleVerified:true,
  providerReversalVerified:true,refundKind:'refunded'}
 const r=await writer.recordVerifiedReversal({binding,receipt})
 assert.equal(r.state,'RECORDED')
 assert.equal(r.entitlementGranted,false)
 assert.equal(r.paymentRecorded,false)
 assert.equal(calls.length,1)
 assert.equal(calls[0].url,hosted+'/rest/v1/rpc/pazo_f16_live_service_verified_refund_record')
 assert.deepEqual(calls[0].payload,{
  ...expectedBase,p_hold_id:receipt.holdId,p_kind:'refunded'
 })
})
test('conflicting or duplicate SQL results are not new sales, and partial events never hit RPC',async()=>{
 const already=setup(()=> 'already_recorded')
 const d=await already.writer.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(d.state,'ALREADY_RECORDED')
 assert.equal(d.paymentRecorded,false)
 assert.equal(already.calls.length,1)
 const clash=setup(()=> 'sale_id_conflict')
 const c=await clash.writer.recordVerifiedSale({binding,receipt:sale,period})
 assert.equal(c.state,'REVIEW_REQUIRED')
 assert.equal(c.paymentRecorded,false)
 const blocked=setup()
 const b=await blocked.writer.recordVerifiedReversal({binding,receipt:{
  ...sale,eventType:'PAYMENT.SALE.REFUNDED',
  holdId:'HOLD-12345678',originalSaleVerified:true,
  providerReversalVerified:true,refundKind:'partially_refunded'
 }})
 assert.equal(b.state,'REVIEW_REQUIRED')
 assert.equal(blocked.calls.length,0)
})
test('public bridge parameters coincide exactly with the private financial function',()=>{
 const sql=readFileSync(new URL('../../../../supabase/migrations/20261020134900_pazo_f16_live_service_role_rpc_bridges.sql',import.meta.url),'utf8')
 const saleFunction=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_sale_record('))
 assert.ok(saleFunction.includes('p_start timestamptz, p_end timestamptz'))
 assert.ok(saleFunction.includes('p_currency,p_start,p_end);'))
 const refundFunction=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.pazo_f16_live_service_verified_refund_record('))
 assert.ok(refundFunction.includes('p_hold_id text, p_kind text'))
 assert.ok(refundFunction.includes('p_sale_id,p_event_id,p_hold_id,p_kind);'))
})
