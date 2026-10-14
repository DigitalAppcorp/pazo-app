import test from 'node:test'
import assert from 'node:assert/strict'
import {runF16P05ReadOnlyDiagnostic,summarizeF16P05ReadOnlySnapshot} from '../../../../scripts/f16-paypal-p05-readonly.mjs'
const ENV={
 PAYPAL_SANDBOX_CLIENT_ID:'private-sandbox-client',
 PAYPAL_SANDBOX_CLIENT_SECRET:'private-sandbox-secret',
 PAZO_P05_SANDBOX_SUBSCRIPTION_ID:'I-PRIVATE-SANDBOX123',
}
const snapshot=(changes={})=>({
 merchantScopedByPayPalApi:true,planScopedByPayPalApi:true,
 lookupSubscriptionId:ENV.PAZO_P05_SANDBOX_SUBSCRIPTION_ID,
 subscription:{
  id:ENV.PAZO_P05_SANDBOX_SUBSCRIPTION_ID,
  plan_overridden:false,quantity:'1',status:'ACTIVE',
  subscriber:{email_address:'private-buyer@example.com'},
  billing_info:{
   failed_payments_count:2,
   outstanding_balance:{currency_code:'USD',value:'2.99'},
   next_billing_time:'2026-11-01T00:00:00Z',
   last_failed_payment:{
    time:'2026-10-09T00:00:00Z',
    next_payment_retry_time:'2026-10-14T00:00:00Z',
   },
  },
  ...changes,
 },
 plan:{
  id:'P-14V25407JP6850922NLHMDKI',status:'ACTIVE',
  billing_cycles:[{tenure_type:'REGULAR',frequency:{interval_unit:'MONTH',interval_count:1},
   pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
 },
})
test('P05 operator gate rejects missing credential or known subscription without network',async()=>{
 for(const env of [
  {...ENV,PAZO_P05_SANDBOX_SUBSCRIPTION_ID:undefined},
  {...ENV,PAZO_P05_SANDBOX_SUBSCRIPTION_ID:'../buyer'},
  {...ENV,PAZO_P05_SANDBOX_SUBSCRIPTION_ID:'https://paypal.com'},
  {...ENV,PAYPAL_SANDBOX_CLIENT_SECRET:undefined},
  {...ENV,PAYPAL_SANDBOX_CLIENT_ID:'merchant:secret'},
 ]){
  let invoked=0,log=''
  const result=await runF16P05ReadOnlyDiagnostic({
   env,
   readerFactory:()=>{invoked++;return {read:async()=>snapshot()}},
   warn:x=>{log+=x},print:x=>{log+=x},
  })
  assert.equal(result,2)
  assert.equal(invoked,0)
  for(const secret of ['private-sandbox-client','private-sandbox-secret',
   'I-PRIVATE-SANDBOX123'])assert.equal(log.includes(secret),false)
 }
})
test('P05 validated merchant read produces sanitized diagnostic only and never grants',async()=>{
 let calls=0,client=''
 const output=[]
 const result=await runF16P05ReadOnlyDiagnostic({
  env:ENV,
  readerFactory:({clientId,clientSecret})=>{
   calls++;client=clientId+clientSecret
   return {read:async id=>{
    assert.equal(id,ENV.PAZO_P05_SANDBOX_SUBSCRIPTION_ID)
    return snapshot()
   }}
  },
  warn:x=>output.push(x),print:x=>output.push(x),
 })
 assert.equal(result,0)
 assert.equal(calls,1)
 assert.ok(client.includes('private-sandbox-secret'))
 const text=output.join('')
 for(const s of ['private-buyer@example.com','private-sandbox-secret',
  'private-sandbox-client','I-PRIVATE-SANDBOX123'])assert.equal(text.includes(s),false)
 const data=JSON.parse(text)
 assert.equal(data.environment,'sandbox')
 assert.equal(data.merchantReadSucceeded,true)
 assert.equal(data.currentPlanMatches299Monthly,true)
 assert.equal(data.observedFailedPaymentCount,2)
 assert.equal(data.retryScheduled,true)
 assert.equal(data.billingPeriodProven,false)
 assert.equal(data.cycleAttributionProven,false)
 assert.equal(data.financialHistoryComplete,false)
 assert.equal(data.mayGrantEntitlement,false)
 assert.equal(data.paidThrough,null)
})
test('P05 merchant mismatch does not fabricate a period or leak a payer',async()=>{
 const lines=[]
 const result=await runF16P05ReadOnlyDiagnostic({
  env:ENV,
  readerFactory:()=>({read:async()=>({
   ...snapshot({plan_overridden:true,quantity:'2',status:'CANCELLED'}),
   plan:{...snapshot().plan,billing_cycles:[]},
  })}),
  print:s=>lines.push(s),warn:s=>lines.push(s),
 })
 assert.equal(result,1)
 const out=JSON.parse(lines.join(''))
 assert.equal(out.currentPlanMatches299Monthly,false)
 assert.equal(out.subscriptionPlanOverride,true)
 assert.equal(out.subscriptionQuantityOne,false)
 assert.equal(out.subscriptionCurrentlyCancelled,true)
 assert.equal(out.mayGrantEntitlement,false)
 assert.equal(out.paidThrough,null)
 assert.equal(lines.join('').includes('private-buyer@example.com'),false)
})
test('P05 API failure can only emit a generic sanitized blocking message',async()=>{
 const logged=[]
 const result=await runF16P05ReadOnlyDiagnostic({
  env:ENV,
  readerFactory:()=>({read:async()=>{throw Error('buyer@example.com private-sandbox-secret TOKEN')}}),
  warn:x=>logged.push(x),print:x=>logged.push(x),
 })
 assert.equal(result,2)
 assert.equal(logged.length,1)
 assert.equal(logged[0].includes('buyer@example.com'),false)
 assert.equal(logged[0].includes('private-sandbox-secret'),false)
 assert.equal(logged[0].includes('TOKEN'),false)
})
test('P05 even missing price, plan or subscription cannot authorize',()=>{
 for(const raw of [
  null,{},{plan:{}},{subscription:{}},
  snapshot({plan_overridden:undefined,quantity:undefined}),
 ]){
  const x=summarizeF16P05ReadOnlySnapshot(raw)
  assert.equal(x.mayGrantEntitlement,false)
  assert.equal(x.paidThrough,null)
  assert.equal(x.billingPeriodProven,false)
  assert.equal(x.cycleAttributionProven,false)
  assert.equal(x.financialHistoryComplete,false)
 }
})
