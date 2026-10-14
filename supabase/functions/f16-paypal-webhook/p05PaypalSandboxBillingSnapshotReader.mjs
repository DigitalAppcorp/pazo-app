// F16-P05 READ ONLY / SANDBOX MERCHANT: offline-testable adapter.
// This is NOT an Edge entrypoint or a scheduler and never grants coverage.
// Two fixed-origin GETs after OAuth: actual subscription + referenced plan.
// No payment mutation; no subscriber, payer, approval URL, or raw body returned.
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const ASCII=/^[\x21-\x7e]{8,512}$/
const AMOUNT=/^\d{1,9}\.\d{2}$/
const utc=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/
const date=s=>typeof s==='string'&&utc.test(s)&&
 Number.isFinite(Date.parse(s))&&
 new Date(Date.parse(s)).toISOString().replace(/\.000Z$/,'Z')===s?s:null
function money(v){
 if(!v||v.currency_code!=='USD'||typeof v.value!=='string'||
  !AMOUNT.test(v.value))return null
 return Object.freeze({currency_code:'USD',value:v.value})
}
async function read(fetchImpl,path,options){
 let response,data
 try{
  response=await fetchImpl(HOST+path,{...options,redirect:'error',
   signal:AbortSignal.timeout(12000)})
  if(!response?.ok)throw Error('provider_failure')
  data=await response.json()
 }catch{throw Error('f16_billing_snapshot_api_unavailable')}
 if(!data||typeof data!=='object'||Array.isArray(data))
  throw Error('f16_billing_snapshot_shape_invalid')
 return data
}
function cycle(c){
 if(!c||typeof c!=='object')return null
 return Object.freeze({
  tenure_type:c.tenure_type,
  sequence:c.sequence,
  frequency:Object.freeze({
   interval_unit:c.frequency?.interval_unit,
   interval_count:c.frequency?.interval_count,
  }),
  pricing_scheme:Object.freeze({
   fixed_price:money(c.pricing_scheme?.fixed_price),
  }),
 })
}
export function createF16P05SandboxBillingSnapshotReader({
 clientId,clientSecret,fetchImpl=fetch,
}={}){
 if(typeof clientId!=='string'||!ASCII.test(clientId)||clientId.includes(':')||
  typeof clientSecret!=='string'||!ASCII.test(clientSecret)||
  typeof fetchImpl!=='function')
  throw Error('f16_billing_snapshot_reader_not_configured')
 return Object.freeze({
  async read(subscriptionId){
   if(typeof subscriptionId!=='string'||!SUB.test(subscriptionId))
    throw Error('f16_invalid_billing_subscription_id')
   const auth=await read(fetchImpl,'/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
    body:'grant_type=client_credentials',
   })
   if(auth.token_type!=='Bearer'||typeof auth.access_token!=='string'||
    auth.access_token.length<8||auth.access_token.length>4096)
    throw Error('f16_billing_snapshot_oauth_invalid')
   const h={Authorization:'Bearer '+auth.access_token,Accept:'application/json'}
   // No fields= override: optional billing metadata remains unknown if missing.
   const raw=await read(fetchImpl,
    '/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),
    {method:'GET',headers:h})
   if(raw.id!==subscriptionId||raw.plan_id!==PLAN)
    throw Error('f16_billing_snapshot_subscription_mismatch')
   const rawPlan=await read(fetchImpl,
    '/v1/billing/plans/'+encodeURIComponent(PLAN),{method:'GET',headers:h})
   if(rawPlan.id!==PLAN)throw Error('f16_billing_snapshot_plan_mismatch')
   if(!Array.isArray(rawPlan.billing_cycles)||rawPlan.billing_cycles.length>12)
    throw Error('f16_billing_snapshot_plan_cycle_invalid')
   if(raw.billing_info!==undefined&&
     (!raw.billing_info||typeof raw.billing_info!=='object'||
      Array.isArray(raw.billing_info)))
    throw Error('f16_billing_snapshot_information_invalid')
   const bi=raw.billing_info
   if(bi?.cycle_executions!==undefined&&
     (!Array.isArray(bi.cycle_executions)||bi.cycle_executions.length>3))
    throw Error('f16_billing_snapshot_execution_invalid')
   // Actual PayPal nesting: next_payment_retry_time is INSIDE
   // billing_info.last_failed_payment, not billing_info itself.
   const fail=bi?.last_failed_payment
   const details=Object.freeze({
    outstanding_balance:money(bi?.outstanding_balance),
    failed_payments_count:bi?.failed_payments_count,
    last_payment:bi?.last_payment?Object.freeze({
     time:date(bi.last_payment.time),amount:money(bi.last_payment.amount),
    }):undefined,
    next_billing_time:date(bi?.next_billing_time),
    last_failed_payment:fail?Object.freeze({
     time:date(fail.time),amount:money(fail.amount),
     next_payment_retry_time:date(fail.next_payment_retry_time),
    }):undefined,
    cycle_executions:bi?.cycle_executions?.map(x=>Object.freeze({
     tenure_type:x.tenure_type,sequence:x.sequence,
     cycles_completed:x.cycles_completed,
    })),
   })
   const plan=Object.freeze({
    id:rawPlan.id,status:rawPlan.status,
    billing_cycles:Object.freeze(rawPlan.billing_cycles.map(cycle)),
    payment_preferences:Object.freeze({
     auto_bill_outstanding:rawPlan.payment_preferences?.auto_bill_outstanding,
     setup_fee:money(rawPlan.payment_preferences?.setup_fee),
    }),
   })
   const subscription=Object.freeze({
    id:raw.id,plan_id:raw.plan_id,custom_id:raw.custom_id,
    status:raw.status,plan_overridden:raw.plan_overridden,
    quantity:raw.quantity,
    start_time:date(raw.start_time),billing_info:details,
   })
   return Object.freeze({
    merchantScopedByPayPalApi:true,planScopedByPayPalApi:true,
    lookupSubscriptionId:subscriptionId,subscription,plan,
   })
  },
 })
}
