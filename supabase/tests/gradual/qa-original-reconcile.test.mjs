import test from 'node:test'
import assert from 'node:assert/strict'
import {createOriginalQaReconcile} from '../../functions/pazo-paypal-live-worker/qaOriginalReconcile.mjs'
const base={complete:true,bindingVerified:true,planVerified:true,originalGenerationVerified:true,signedEventMatches:true,transactionsComplete:true,transactionCount:0,completedPayments:0,lastPaymentPresent:false,status:'EXPIRED',statusUpdatedAt:'2026-10-23T23:00:00.000Z',observedAt:'2026-10-23T23:00:01.000Z'}
const scope={source:'original_prebeta_qa_scope_v1',ownerId:'owner-private',intentId:'intent-private',subscriptionId:'subscription-private',planId:'plan-private',merchantGeneration:1,event:{eventId:'event-private'}}
test('404, ACTIVE, money, incomplete transactions, missing timestamp or uncorroborated signature cannot requeue',async()=>{
 for(const change of [{complete:false,providerHttpStatus:404},{status:'ACTIVE'},{transactionCount:1},{completedPayments:1},{lastPaymentPresent:true},{transactionsComplete:false},{signedEventMatches:false},{statusUpdatedAt:null}]){
  const result=await createOriginalQaReconcile({auditOriginal:async()=>({...base,...change}),rpc:()=>assert.fail('No SQL after failed provider proof'),lifecycle:()=>assert.fail('No lifecycle after failed provider proof')})()
  assert.equal(result.reconciliationCode,'qa_provider_review_required');assert.equal(result.mayCancel,false)
 }
})
test('terminal original recheck uses audited retry, signed lifecycle and fresh terminal GET before original closer',async()=>{
 const effects=[];const result=await createOriginalQaReconcile({auditOriginal:async()=>base,rpc:async(n,p)=>{effects.push(n);if(n==='qaOriginalScope')return scope;if(n==='qaOriginalRetry'){assert.match(p.p_evidence_sha256,/^[a-f0-9]{64}$/);assert.equal(p.p_status,'EXPIRED');return 'queued'}if(n==='terminalClose'){assert.equal(p.p_subscription,scope.subscriptionId);return true}assert.fail()},
 lifecycle:async()=>{effects.push('originalSignedLifecycle');return {state:'RECORDED',leaseReleased:true}},historical:{readerForGeneration:async()=>({readVerifiedSubscription:async()=>{effects.push('freshOriginalGet');return {id:scope.subscriptionId,plan_id:scope.planId,custom_id:scope.intentId,merchantGeneration:1,sourceEnvironment:'live',status:'EXPIRED',statusUpdatedAt:base.statusUpdatedAt}}})}})()
 assert.equal(result.reconciliationCode,'qa_original_terminal_closed');assert.deepEqual(effects,['qaOriginalScope','qaOriginalRetry','originalSignedLifecycle','freshOriginalGet','terminalClose'])
 for(const s of Object.values(scope).filter(x=>typeof x==='string'))assert.equal(JSON.stringify(result).includes(s),false)
})
test('approval pending may reconcile lifecycle but never closes contract or calls provider cancel',async()=>{
 const effects=[];const result=await createOriginalQaReconcile({auditOriginal:async()=>({...base,status:'APPROVAL_PENDING'}),rpc:async n=>{effects.push(n);return n==='qaOriginalScope'?scope:'queued'},lifecycle:async()=>({state:'RECORDED',leaseReleased:true}),historical:{readerForGeneration:()=>assert.fail()}})()
 assert.equal(result.reconciliationCode,'qa_event_reconciled_contract_not_terminal');assert.deepEqual(effects,['qaOriginalScope','qaOriginalRetry'])
})
test('unknown lifecycle completion cannot invent terminal closure or erase the held event',async()=>{
 const effects=[];const result=await createOriginalQaReconcile({auditOriginal:async()=>base,rpc:async n=>{effects.push(n);return n==='qaOriginalScope'?scope:'queued'},lifecycle:async()=>({outcomeUnknown:true}),historical:{readerForGeneration:()=>assert.fail()}})()
 assert.equal(result.reconciliationCode,'qa_lifecycle_outcome_unknown');assert.ok(!effects.includes('terminalClose'))
})

test('an already processed signed event is not reclaimed; fresh terminal GET still controls closing',async()=>{
 const effects=[];const result=await createOriginalQaReconcile({auditOriginal:async()=>base,rpc:async n=>{effects.push(n);return n==='qaOriginalScope'?scope:n==='qaOriginalRetry'?'already_processed':true},lifecycle:()=>assert.fail('No reclaim of processed event'),historical:{readerForGeneration:async()=>({readVerifiedSubscription:async()=>({id:scope.subscriptionId,plan_id:scope.planId,custom_id:scope.intentId,merchantGeneration:1,sourceEnvironment:'live',status:'EXPIRED',statusUpdatedAt:base.statusUpdatedAt})})}})()
 assert.equal(result.reconciliationCode,'qa_original_terminal_closed');assert.equal(effects.at(-1),'terminalClose')
})
