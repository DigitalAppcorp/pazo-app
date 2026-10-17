import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalSandboxSubscriptionReader} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs'

const id='I-SANDBOXTEST123'
const token={token_type:'Bearer',access_token:'a-valid-sandbox-test-token'}
const subscription={id,plan_id:'P-SANDBOX',custom_id:'intent-test',status:'CANCELLED'}
const transaction={id:'SALE-ONE',status:'COMPLETED',time:'2026-10-14T12:00:00Z',
  amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}
const makeReader=(page)=>createPaypalSandboxSubscriptionReader({
  clientId:'test-client-12345',clientSecret:'test-secret-12345',
  fetchImpl:async url=>({ok:true,json:async()=>url.includes('/oauth2/token')?token:
    url.includes('/transactions?')?page:subscription}),
})
const query={subscriptionId:id,startTime:'2026-10-13T00:00:00Z',endTime:'2026-10-16T00:00:00Z'}

test('accepts optional PayPal totals but never claims financial completeness',async()=>{
  const r=await makeReader({transactions:[transaction],links:[{rel:'self',href:'https://api-m.sandbox.paypal.com/example'}]}).read(query)
  assert.equal(r.transactions.length,1)
  assert.equal(r.paginationMetadataComplete,false)
  assert.equal(r.globalFinancialCoverage,false)
  assert.equal(r.mayGrantBenefits,false)
})
test('accepts matching one-page totals',async()=>{
  const r=await makeReader({transactions:[transaction],total_pages:1,total_items:1,links:[]}).read(query)
  assert.equal(r.paginationMetadataComplete,true)
})
test('blocks a next page despite omitted totals',async()=>{
  await assert.rejects(makeReader({transactions:[transaction],links:[{rel:'next',href:'https://api-m.sandbox.paypal.com/next'}]}).read(query),/incomplete_transaction_history/)
})
test('blocks mismatched totals',async()=>{
  await assert.rejects(makeReader({transactions:[transaction],total_pages:1,total_items:2}).read(query),/incomplete_transaction_history/)
})
test('blocks multiple pages and malformed links',async()=>{
  await assert.rejects(makeReader({transactions:[transaction],total_pages:2}).read(query),/incomplete_transaction_history/)
  await assert.rejects(makeReader({transactions:[transaction],links:{next:'url'}}).read(query),/incomplete_transaction_history/)
})
test('blocks duplicate transaction IDs',async()=>{
  await assert.rejects(makeReader({transactions:[transaction,transaction],links:[]}).read(query),/ambiguous_transaction_history/)
})
