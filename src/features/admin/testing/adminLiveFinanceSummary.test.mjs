import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePazoLiveFinanceSummary} from '../liveFinanceSummary.mjs'
const row=()=>({source:'pazo_verified_live_ledger',environment:'live',currency:'USD',
 asOf:'2026-10-21T20:00:00Z',providerStatement:false,paidThrough:null,
 activePaidAccounts:1,payments:{verifiedPayments:2,grossVerifiedMinor:598,heldPayments:1,heldGrossMinor:299},
 subscriptions:{openRequests:1,unboundRequests:0,closedUnsentRequests:1,confirmedCancellations:1}})
test('only exact verified Live aggregate source may populate administrative money cards',()=>{
 assert.deepEqual(parsePazoLiveFinanceSummary(row()),row())
 const empty=row();empty.activePaidAccounts=0
 for(const k in empty.payments)empty.payments[k]=0
 for(const k in empty.subscriptions)empty.subscriptions[k]=0
 assert.deepEqual(parsePazoLiveFinanceSummary(empty),empty)
})
test('unknown/missing source and provider-balance claims do not become fictional zeros',()=>{
 for(const patch of [{source:'sandbox'},{environment:'sandbox'},{providerStatement:true},
  {currency:'EUR'},{paidThrough:'2027-01-01'},{asOf:'invalid'},
  {activePaidAccounts:-1},{activePaidAccounts:Number.MAX_SAFE_INTEGER+1},
  {customerEmail:'forbidden'}, {payments:null}]){
  assert.equal(parsePazoLiveFinanceSummary({...row(),...patch}),null)
 }
 for(const data of [null,{},[],false])assert.equal(parsePazoLiveFinanceSummary(data),null)
})
test('malformed or inconsistent counts, overflows and row-level fields are rejected',()=>{
 for(const patch of [{heldPayments:3},{heldGrossMinor:599},{grossVerifiedMinor:'598'},
  {verifiedPayments:-1},{grossVerifiedMinor:Infinity},{grossVerifiedMinor:2.99},
  {subscriptionId:'I-PRIVATE'}]){
  assert.equal(parsePazoLiveFinanceSummary({...row(),payments:{...row().payments,...patch}}),null)
 }
 assert.equal(parsePazoLiveFinanceSummary({...row(),subscriptions:{...row().subscriptions,unboundRequests:2}}),null)
})
