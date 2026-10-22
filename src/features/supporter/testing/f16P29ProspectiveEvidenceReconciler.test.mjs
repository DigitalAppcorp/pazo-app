import test from 'node:test'
import assert from 'node:assert/strict'
import {createP29ProspectiveEvidenceReconciler as create} from '../../../../supabase/functions/f16-paypal-webhook/p29ProspectiveEvidenceReconciler.mjs'
const claim={eventId:'WH-P29-RECONCILE',claimToken:'11111111-1111-4111-8111-111111111111'}
const event={id:claim.eventId,event_type:'PAYMENT.SALE.COMPLETED',resource:{id:'SALE-P29-RECONCILE',billing_agreement_id:'I-P29-RECONCILE',amount:{currency:'USD',total:'2.99'}}}
const sale={id:'SALE-P29-RECONCILE',billing_agreement_id:'I-P29-RECONCILE',state:'completed',amount:{currency:'USD',total:'2.99'}}
const base={readClaimedMerchantEvent:async()=>event,readMerchantSale:async()=>sale}
test('a matching sale and empty refund/dispute snapshots still cannot credit payment',async()=>{
 const x=await create({...base,readRefundEvidence:async()=>({originalSale:{id:sale.id,grossMinor:299,currency:'USD',completedAt:'2026-10-15T18:00:00Z'},signedEvents:[],merchantRefunds:[]}),
 readDisputeSnapshot:async()=>({disputesCleared:false,mayRecordPayment:false})})(claim)
 assert.equal(x.saleReason,'sale_identity_matches_review_only')
 assert.equal(x.refundPhase,'NO_REFUND_REFS_REVIEW_ONLY')
 assert.equal(x.mayRecordPayment,false);assert.equal(x.mayGrantBenefits,false)
 assert.equal(x.providerHistoryComplete,false);assert.equal(x.paidThrough,null)
})
test('mismatched merchant sale blocks reversal lookups',async()=>{
 let called=0
 const x=await create({...base,readMerchantSale:async()=>({...sale,id:'OTHER'}),
 readRefundEvidence:async()=>{called++},readDisputeSnapshot:async()=>{called++}})(claim)
 assert.equal(x.reason,'sale_not_merchant_correlated');assert.equal(called,0)
})
test('missing and untrusted dispute evidence fail closed',async()=>{
 const x=await create({...base,readRefundEvidence:async()=>({}),readDisputeSnapshot:async()=>({disputesCleared:true,mayRecordPayment:true})})(claim)
 assert.equal(x.reason,'dispute_snapshot_untrusted');assert.equal(x.mayCreatePaidPeriod,false)
})
