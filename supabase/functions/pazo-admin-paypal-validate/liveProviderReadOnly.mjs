// PAZO F16 — read-only PayPal LIVE resource preflight, NOT a checkout.
 // Import only from a verified-admin Edge Function. Never use in browser.
 // This module cannot create plans, subscriptions, captures or payments.
 const HOST='https://api-m.paypal.com'
 const EXPECTED_WEBHOOK='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-paypal-live-webhook'
 const REQUIRED_EVENTS=Object.freeze([
  'PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED',
  'BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
 ])
 const ascii=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
 const invalid=(code)=>Object.freeze({ok:false,code,mayCharge:false,mayActivate:false})
 const ok=()=>Object.freeze({
  ok:true,code:'live_resources_read_verified',environment:'live',
  planReadVerified:true,webhookReadVerified:true,
  merchantIdentityVerified:false,webhookDeliveryVerified:false,
  mayCharge:false,mayActivate:false
 })
 async function asJson(fetchImpl,path,options){
  const response=await fetchImpl(HOST+path,{
   ...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)
  })
  if(!response?.ok)return null
  try{
   const json=await response.json()
   return json&&typeof json==='object'&&!Array.isArray(json)?json:null
  }catch{return null}
 }
 export async function inspectLivePaypalResources({
  environment,clientId,clientSecret,planId,webhookId,
  expectedWebhookUrl=EXPECTED_WEBHOOK,fetchImpl=fetch
 }={}){
  // There is no merchant fallback to Sandbox, and no operator-configurable host.
  if(environment!=='live'||!ascii(clientId)||clientId.includes(':')||
   !ascii(clientSecret)||!/^P-[A-Za-z0-9]{10,75}$/.test(planId||'')||
   !/^[A-Za-z0-9_-]{8,100}$/.test(webhookId||'')||
   expectedWebhookUrl!==EXPECTED_WEBHOOK||typeof fetchImpl!=='function')
   return invalid('live_config_incomplete')
  try{
   const auth=await asJson(fetchImpl,'/v1/oauth2/token',{
    method:'POST',headers:{
     Authorization:'Basic '+btoa(clientId+':'+clientSecret),
     Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'
    },body:'grant_type=client_credentials'
   })
   if(auth?.token_type?.toLowerCase()!=='bearer'||!ascii(auth?.access_token))
    return invalid('live_oauth_unverified')
   const headers={Authorization:'Bearer '+auth.access_token,Accept:'application/json'}
   const plan=await asJson(fetchImpl,'/v1/billing/plans/'+encodeURIComponent(planId),{
    method:'GET',headers
   })
   if(!plan||plan.id!==planId||plan.status!=='ACTIVE')
    return invalid('live_plan_unverified')
   if(!Array.isArray(plan.billing_cycles)||plan.billing_cycles.length!==1)
    return invalid('live_plan_terms_unverified')
   const cycle=plan.billing_cycles[0]
   const recurring=cycle?.tenure_type==='REGULAR'&&
    cycle?.sequence===1&&
    cycle?.frequency?.interval_unit==='MONTH'&&
    cycle?.frequency?.interval_count===1&&
    cycle?.total_cycles===0&&
    cycle?.pricing_scheme?.fixed_price?.currency_code==='USD'&&
    cycle?.pricing_scheme?.fixed_price?.value==='2.99'&&
    cycle?.pricing_scheme?.tiers===undefined
   const preferences=plan?.payment_preferences
   const setup=preferences?.setup_fee
   const noSetup=!setup||(setup.currency_code==='USD'&&
    setup.value==='0.00')
   const noTax=plan.tax_percentage===undefined&&
    (plan.taxes===undefined||
      (Number(plan.taxes.percentage||0)===0&&plan.taxes.inclusive!==true))
   if(!recurring||!preferences||!noSetup||
    preferences.auto_bill_outstanding===true||!noTax||
    plan.quantity_supported===true)
    return invalid('live_plan_terms_unverified')
   const webhook=await asJson(fetchImpl,'/v1/notifications/webhooks/'+encodeURIComponent(webhookId),{
    method:'GET',headers
   })
   if(!webhook||webhook.id!==webhookId||webhook.url!==EXPECTED_WEBHOOK||
    !Array.isArray(webhook.event_types))
    return invalid('live_webhook_unverified')
   const types=new Set(webhook.event_types.map(e=>typeof e==='string'?e:e?.name))
   if(REQUIRED_EVENTS.some(e=>!types.has(e)))return invalid('live_webhook_events_missing')
   // GET confirms config only; it does NOT prove real webhook delivery/signature.
   return ok()
  }catch{return invalid('live_provider_unavailable')}
 }
 export {EXPECTED_WEBHOOK,REQUIRED_EVENTS}
