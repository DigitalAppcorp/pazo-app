import test from 'node:test'
import assert from 'node:assert/strict'
import {createPaypalSandboxSubscriptionReader} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs'
import {assessPaypalSandboxPayment} from '../../../../supabase/functions/f16-paypal-webhook/paymentReconciliation.mjs'
const ID='offline-test-client-id'
const SECRET='offline-test-client-secret'
const SUB='I-PAZO12345'
const START='2026-10-01T00:00:00Z'
const END='2026-10-31T00:00:00Z'
const PLAN='P-14V25407JP6850922NLHMDKI'
const OWNER='63e812b0-a7e5-49f6-b2dd-c11d2c72af57'
function build({oauthOk=true,subOk=true,listOk=true,totalPages=1,totalItems=1,
 txStatus='COMPLETED',repeatPaymentId=false,omitTotals=false}={}){
 const calls=[]
 const fetchImpl=async(url,options)=>{
   calls.push({url,options})
   if(url==='https://api-m.sandbox.paypal.com/v1/oauth2/token')return {
     ok:oauthOk,json:async()=>({token_type:'Bearer',access_token:'mock-paypal-secret-token'})}
   if(url==='https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+SUB)return {
     ok:subOk,json:async()=>({id:SUB,plan_id:PLAN,custom_id:'intent-correlation-123',
       status:'ACTIVE',subscriber:{email_address:'private@example.com'}})}
   if(url.startsWith('https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+SUB+'/transactions?'))return {
     ok:listOk,json:async()=>({transactions:[
       {id:'CAPTURE1234',status:txStatus,time:'2026-10-13T19:00:00Z',
       payer_email:'secretpayer@example.com',amount_with_breakdown:{
         gross_amount:{currency_code:'USD',value:'2.99'}}},
       ...(repeatPaymentId?[{id:'CAPTURE1234',status:'REFUNDED',time:'2026-10-13T19:00:00Z',
         amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}}]:[])
      ],...(omitTotals?{}:{total_pages:totalPages,total_items:totalItems})})}
   throw Error('non_allowlisted_destination')
 }
 return {reader:createPaypalSandboxSubscriptionReader({clientId:ID,clientSecret:SECRET,fetchImpl}),calls}
}
test('authenticates and reads subscription and transactions from fixed Sandbox endpoints',async()=>{
 const x=build()
 const s=await x.reader.read({subscriptionId:SUB,startTime:START,endTime:END})
 assert.equal(x.calls.length,3)
 assert.deepEqual(x.calls.map(x=>new URL(x.url).pathname),[
  '/v1/oauth2/token',
  '/v1/billing/subscriptions/'+SUB,
  '/v1/billing/subscriptions/'+SUB+'/transactions',
 ])
 assert.equal(x.calls[0].options.headers.Authorization,'Basic '+btoa(ID+':'+SECRET))
 assert.equal(new URL(x.calls[2].url).searchParams.get('start_time'),START)
 assert.equal(new URL(x.calls[2].url).searchParams.get('end_time'),END)
 assert.equal(x.calls.every(x=>x.options.redirect==='error'),true)
 assert.equal(x.calls[2].options.headers.Authorization,'Bearer mock-paypal-secret-token')
 assert.equal(s.lookupSubscriptionId,SUB)
 assert.equal(s.transactions[0].status,'COMPLETED')
 assert.equal(JSON.stringify(s).includes('private@example.com'),false)
 assert.equal(JSON.stringify(s).includes('secretpayer@example.com'),false)
 assert.equal(JSON.stringify(s).includes('mock-paypal-secret-token'),false)
})
test('read-only provider data feeds candidate-only decision, not membership',async()=>{
 const x=build()
 const s=await x.reader.read({subscriptionId:SUB,startTime:START,endTime:END})
 const result=assessPaypalSandboxPayment({
  environment:'sandbox',
  intent:{id:'intent-correlation-123',provider:'paypal',ownerId:OWNER,
    externalSubscriptionId:SUB,planId:PLAN,state:'bound',verifiedOwnerBinding:true},
  subscription:s.subscription,transaction:s.transactions[0],
  transactionLookupSubscriptionId:s.lookupSubscriptionId,
  merchantScopedByPayPalApi:s.merchantScopedByPayPalApi,knownReversalIds:[],
 })
 assert.equal(result.acceptedForLedger,true)
 assert.equal(result.entitlement,false)
})
test('untrusted subscription IDs and transaction ranges fail before API request',async()=>{
 const x=build()
 for(const subscriptionId of ['I-A?admin=true','https://bad.example','../etc/passwd','']) {
  await assert.rejects(x.reader.read({subscriptionId,startTime:START,endTime:END}),/invalid_subscription_id/)
 }
 for(const pair of [
  ['2026-10-31T00:00:00Z','2026-10-01T00:00:00Z'],
  ['2026-01-01T00:00:00Z','2026-10-01T00:00:00Z'],
  ['not-time',END],['2026-02-30T00:00:00Z',END],
 ]) {
  await assert.rejects(x.reader.read({subscriptionId:SUB,startTime:pair[0],endTime:pair[1]}),/invalid_transaction_window/)
 }
 assert.equal(x.calls.length,0)
})
test('partial pages never qualify as exhaustive refund evidence',async()=>{
 const x=build({totalPages:2})
 await assert.rejects(x.reader.read({subscriptionId:SUB,startTime:START,endTime:END}),/incomplete_transaction_history/)
})
test('OAuth or PayPal errors fail closed, no raw response disclosure',async()=>{
 for(const params of [{oauthOk:false},{subOk:false},{listOk:false}]){
  const x=build(params)
  await assert.rejects(x.reader.read({subscriptionId:SUB,startTime:START,endTime:END}))
 }
})
test('PENDING transaction can be read but never gives ledger candidate or coverage',async()=>{
 const x=build({txStatus:'PENDING'})
 const s=await x.reader.read({subscriptionId:SUB,startTime:START,endTime:END})
 const verdict=assessPaypalSandboxPayment({
  environment:'sandbox',
  intent:{id:'intent-correlation-123',provider:'paypal',ownerId:OWNER,
    externalSubscriptionId:SUB,verifiedOwnerBinding:true},
  subscription:s.subscription,transaction:s.transactions[0],
  transactionLookupSubscriptionId:s.lookupSubscriptionId,
  merchantScopedByPayPalApi:s.merchantScopedByPayPalApi,knownReversalIds:[],
 })
 assert.equal(verdict.acceptedForLedger,false)
 assert.equal(verdict.entitlement,false)
})

test('Auth-owned binding reads actual Sandbox subscription details and strips payer PII',async()=>{
 const x=build()
 const item=await x.reader.readSubscription(SUB)
 assert.deepEqual(item,{id:SUB,plan_id:PLAN,custom_id:'intent-correlation-123',status:'ACTIVE'})
 assert.equal(x.calls.length,2)
 assert.equal(x.calls[0].url,'https://api-m.sandbox.paypal.com/v1/oauth2/token')
 assert.equal(x.calls[1].url,'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+SUB)
 assert.equal(x.calls.every(c=>c.options.redirect==='error'),true)
 assert.equal(JSON.stringify(item).includes('private@example.com'),false)
})
test('subscription-only reader rejects wrong IDs before network',async()=>{
 const x=build()
 for(const id of ['https://evil.example','I-OTHER?x=1','I-a/b','']){
   await assert.rejects(x.reader.readSubscription(id),/invalid_subscription_id/)
 }
 assert.equal(x.calls.length,0)
})

test('provider metadata missing or contradictory is not accepted as exhaustive history',async()=>{
 for(const args of [{totalPages:null},{totalItems:null},{totalPages:2},{totalItems:2},
                    {totalPages:0},{totalItems:-1}]){
  const x=build(args)
  await assert.rejects(x.reader.read({subscriptionId:SUB,startTime:START,endTime:END}),
    /incomplete_transaction_history/)
 }
})
test('duplicate provider payment IDs fail closed, without PII disclosure',async()=>{
 const x=build({repeatPaymentId:true,totalItems:2})
 await assert.rejects(x.reader.read({subscriptionId:SUB,startTime:START,endTime:END}),
  /ambiguous_transaction_history/)
})

// PayPal documents the pagination totals as optional; absence stays REVIEW.
test('optional PayPal totals do not promote a correlated sale to complete coverage',async()=>{
 const x=build({omitTotals:true})
 const result=await x.reader.read({subscriptionId:SUB,startTime:START,endTime:END})
 assert.equal(result.transactions.length,1)
 assert.equal(result.paginationMetadataComplete,false)
 assert.equal(result.paginationEvidence,'provider_totals_absent_review_required')
 assert.equal(result.requiresIndependentHistoryCoverage,true)
 assert.equal(result.globalFinancialCoverage,false)
 assert.equal(result.mayGrantBenefits,false)
})
test('consistent single-page totals prove only the bounded window, never global coverage',async()=>{
 const x=build()
 const result=await x.reader.read({subscriptionId:SUB,startTime:START,endTime:END})
 assert.equal(result.paginationMetadataComplete,true)
 assert.equal(result.paginationEvidence,'single_page_totals_consistent')
 assert.equal(result.requiresIndependentHistoryCoverage,false)
 assert.equal(result.globalFinancialCoverage,false)
 assert.equal(result.mayGrantBenefits,false)
})
