import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizePazoLiveBillingSnapshot} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveBillingSnapshot.mjs'
import {createPaypalLiveMerchantEvidenceReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveMerchantEvidence.mjs'
const subscriptionId='I-SNAPSHOT-SUBSCRIPTION',intentId='intent-23456789-1234-4234-8234-123456789abc'
const plan={id:'P-ABCDEFGHIJKLMN',status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',sequence:1,
 total_cycles:0,frequency:{interval_unit:'MONTH',interval_count:1},pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
 payment_preferences:{auto_bill_outstanding:false,setup_fee:{currency_code:'USD',value:'0.0'}}}
const raw={id:subscriptionId,custom_id:intentId,plan_id:plan.id,status:'ACTIVE',start_time:'2026-10-01T00:00:00Z',
 billing_info:{cycle_executions:[{tenure_type:'REGULAR',sequence:1,cycles_completed:1}],failed_payments_count:0,
  outstanding_balance:{currency_code:'USD',value:'0.00'},next_billing_time:'2026-11-01T00:00:00Z',
  last_payment:{time:'2026-10-01T00:00:01Z',amount:{currency_code:'USD',value:'2.99'}}},
 subscriber:{email_address:'PRIVATE'},payer:{name:'PRIVATE'}}
const base={subscription:raw,plan,subscriptionId,intentId,merchantGeneration:7,observedAt:'2026-10-01T00:01:00.000Z'}
test('snapshot preserves observed boundaries/counter; never calculates paidThrough or exports PII',()=>{
 const r=normalizePazoLiveBillingSnapshot(base)
 assert.equal(r.nextBillingAt,'2026-11-01T00:00:00.000Z');assert.equal(r.cyclesCompleted,1)
 assert.equal(r.lastPaymentAt,'2026-10-01T00:00:01.000Z');assert.equal(r.mayGrantBenefits,false)
 assert.equal(r.outstandingBalanceZero,true);assert.ok(!JSON.stringify(r).includes('PRIVATE'))
 assert.equal('paidThrough' in r,false)
})
test('wrong ownership, impossible dates, overrides and added charges cannot become financial snapshots',()=>{
 for(const subscription of [{...raw,custom_id:'other'}, {...raw,plan_overridden:true}, {...raw,quantity:'2'},
  {...raw,start_time:'2026-02-30T00:00:00Z'}, {...raw,billing_info:{...raw.billing_info,cycle_executions:[]}},
  {...raw,billing_info:{...raw.billing_info,last_payment:{...raw.billing_info.last_payment,amount:{currency_code:'USD',value:'5.98'}}}}])
  assert.throws(()=>normalizePazoLiveBillingSnapshot({...base,subscription}),/unavailable/)
 for(const p of [{...plan,payment_preferences:{}}, {...plan,payment_preferences:{auto_bill_outstanding:true}},
  {...plan,taxes:{percentage:'5'}}, {...plan,payment_preferences:{auto_bill_outstanding:false,setup_fee:{currency_code:'USD',value:'0.01'}}}])
  assert.throws(()=>normalizePazoLiveBillingSnapshot({...base,plan:p}),/unavailable/)
})
test('failed or outstanding facts remain explicit and cannot silently normalize to clear',()=>{
 const r=normalizePazoLiveBillingSnapshot({...base,subscription:{...raw,billing_info:{...raw.billing_info,
  failed_payments_count:1,last_failed_payment:{time:'2026-10-01T00:00:00Z'},outstanding_balance:{currency_code:'USD',value:'2.99'}}}})
 assert.equal(r.failedPaymentsCount,1);assert.equal(r.lastFailedPaymentPresent,true);assert.equal(r.outstandingBalanceZero,false)
})
test('original credentials read subscription then plan; no balance, payment mutation or webhook recheck',async()=>{
 const calls=[]
 const reader=createPaypalLiveMerchantEvidenceReader({merchantGeneration:7,planId:plan.id,
  clientId:'CLIENT-SYNTHETIC-123',clientSecret:'SECRET-SYNTHETIC-123',fetchImpl:async(url,o)=>{
   calls.push({url,method:o.method})
   const data=url.endsWith('/oauth2/token')?{token_type:'Bearer',access_token:'SYNTHETIC-TOKEN'}:
    url.includes('/plans/')?plan:raw
   return {ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(data)}
  }})
 const r=await reader.readBillingSnapshot({subscriptionId,intentId,expectedGeneration:7})
 assert.equal(r.planTermsVerified,true);assert.deepEqual(calls.map(c=>c.method),['POST','GET','GET'])
 assert.ok(!calls.some(c=>/balances|webhooks|transactions/.test(c.url)))
})
test('paginated original financial history follows only same-origin scoped GET links',async()=>{
 const startTime='2026-10-01T00:00:00.000Z',endTime='2026-10-02T00:00:00.000Z'
 const path='/v1/billing/subscriptions/'+subscriptionId+'/transactions'
 const next='https://api-m.paypal.com'+path+'?'+new URLSearchParams({start_time:startTime,end_time:endTime,page:'2'})
 const row=id=>({id,status:'COMPLETED',time:'2026-10-01T00:00:01Z',
  amount_with_breakdown:{gross_amount:{currency_code:'USD',value:'2.99'}}})
 const fixture=href=>{
  const calls=[]
  const reader=createPaypalLiveMerchantEvidenceReader({merchantGeneration:7,planId:plan.id,
   clientId:'CLIENT-SYNTHETIC-123',clientSecret:'SECRET-SYNTHETIC-123',fetchImpl:async(url,o)=>{
    calls.push(url)
    const data=url.endsWith('/oauth2/token')?{token_type:'Bearer',access_token:'SYNTHETIC-TOKEN'}:
     url.includes('/transactions?')?{total_pages:2,total_items:2,
      transactions:[row(url===next?'SALE-TARGET':'SALE-OTHER')],
      links:url===next?[]:[{rel:'next',method:'GET',href}]}:raw
    assert.equal(o.redirect,'error')
    return {ok:true,status:200,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(data)}
   }})
  return {reader,calls}
 }
 const args={subscriptionId,intentId,expectedGeneration:7,saleId:'SALE-TARGET',startTime,endTime}
 const good=fixture(next),sale=await good.reader.readCompletedSale(args)
 assert.equal(sale.originVerified,true);assert.equal(sale.originSource,'original_generation_subscription_transactions')
 assert.ok(good.calls.includes(next))
 for(const bad of [next.replace('api-m.paypal.com','evil.example'),next.replace(subscriptionId,'I-OTHER-SUB'),
  next.replace('page=2','page=2&page=3'),next.replace('page=2','page=2&access_token=private'),next+'#secret']){
  const f=fixture(bad);await assert.rejects(()=>f.reader.readCompletedSale(args),/unavailable/)
  assert.ok(!f.calls.includes(bad))
 }
})
