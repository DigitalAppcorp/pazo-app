import test from 'node:test'
import assert from 'node:assert/strict'
import {assessP24RefundLineage as assess}
 from '../../../../supabase/functions/f16-paypal-webhook/p24RefundLineageLab.mjs'
const originalSale={
 id:'SALE-P24-001',grossMinor:299,currency:'USD',
 completedAt:'2026-10-15T01:00:00Z'}
const signed=i=>({id:'WH-REFUND-'+i,type:'PAYMENT.SALE.REFUNDED',
 refundId:'REFUND-P24-'+i,originalSaleId:originalSale.id,
 verifiedAt:'2026-10-15T02:00:00Z'})
const refund=(i,amountMinor=100,state='completed')=>({
 id:'REFUND-P24-'+i,originalSaleId:originalSale.id,state,
 amountMinor,currency:'USD',updatedAt:'2026-10-15T02:00:00Z',
 source:'PAYPAL_SANDBOX_LEGACY_REFUND_GET'})
const run=(events=[],refunds=[],sale=originalSale)=>
 assess({originalSale:sale,signedEvents:events,merchantRefunds:refunds})
const safe=r=>{
 assert.equal(r.mayRecordPayment,false)
 assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.sourceAttestedByThisCode,false)
 assert.equal(r.refundsCoverageComplete,false)
 assert.equal(r.paidThrough,null)
 assert.equal(r.dbWrites,0)
 for(const privateValue of [originalSale.id,'REFUND-P24-01',
  'WH-REFUND-01','payer@example.invalid'])
  assert.ok(!JSON.stringify(r).includes(privateValue))
}
test('P24 no observed refund still cannot certify historical coverage',()=>{
 const r=run();safe(r)
 assert.equal(r.phase,'NO_REFUND_REFS_REVIEW_ONLY')
})
test('P24 partial and complete multi-refund matches stay review-only',()=>{
 for(const amounts of [[100],[99,200]]){
  const r=run(amounts.map((_,i)=>signed(i+1)),
    amounts.map((n,i)=>refund(i+1,n)))
  safe(r);assert.equal(r.phase,'REFUND_LINEAGE_REVIEW_ONLY')
  assert.equal(r.completedRefundMinor,amounts.reduce((a,b)=>a+b,0))
  assert.equal(r.partialRefund,amounts.reduce((a,b)=>a+b,0)<299)
 }
})
test('P24 mismatched sale, missing signed events or duplicate ID refuses',()=>{
 for(const [events,refunds] of [
  [[signed(1)],[{...refund(1),originalSaleId:'SALE-FOREIGN'}]],
  [[signed(1)],[]],
  [[signed(1),signed(1)],[refund(1),refund(2)]],
  [[signed(1)],[{...refund(1),source:'PAYPAL_CAPTURE_V2'}]],
  [[{...signed(1),originalSaleId:'SALE-FOREIGN'}],[refund(1)]],
 ]){
  const r=run(events,refunds);safe(r)
  assert.equal(r.phase,'REVIEW_REQUIRED')
 }
})
test('P24 sum above $2.99, temporal reversal or pending status refuses',()=>{
 const cases=[
  [[signed(1),signed(2)],[refund(1,200),refund(2,200)]],
  [[signed(1)],[{...refund(1),updatedAt:'2026-10-14T00:00:00Z'}]],
  [[signed(1)],[refund(1,100,'pending')]],
  [[signed(1)],[refund(1,100,'failed')]],
 ]
 for(const [events,refunds] of cases){
  const r=run(events,refunds);safe(r)
  assert.equal(r.phase,'REVIEW_REQUIRED')
 }
})
test('P24 without known exact original sale is never accepted',()=>{
 for(const sale of [{...originalSale,grossMinor:100},
  {...originalSale,currency:'EUR'},null]){
  const r=run([signed(1)],[refund(1)],sale);safe(r)
  assert.equal(r.reason,'original_sale_contract_missing')
 }
})
