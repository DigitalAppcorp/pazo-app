// F16 — QA-only PayPal SANDBOX verified first monthly cycle.
// No browser-provided sale, price, subscription, dates, or owner are accepted.
// All ids come from an owner-authenticated V2 private account and merchant GET.
// PayPal transaction list is scoped to that bound subscription; the Sale GET
// must independently confirm COMPLETED and USD 2.99, or no reward is credited.
const HOST='https://api-m.sandbox.paypal.com'
const PLAN='P-14V25407JP6850922NLHMDKI'
const ID=/^[A-Za-z0-9._-]{6,110}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/
const ms=v=>typeof v==='string'&&UTC.test(v)&&Number.isFinite(Date.parse(v))?Date.parse(v):NaN
const fail=(reason)=>{throw Error('qa_v2_merchant_'+reason)}
const goodSecret=s=>typeof s==='string'&&s.length>=8&&s.length<=512&&/^[\x21-\x7e]+$/.test(s)
const confirmSaleAmount=x=>x?.currency_code==='USD'&&x?.value==='2.99'
export function createPazoSandboxV2MerchantVerifier({
 clientId,clientSecret,fetchImpl=fetch,
 commitVerified,markReversal,now=Date.now,
}={}){
 if(!goodSecret(clientId)||clientId.includes(':')||
    !goodSecret(clientSecret)||typeof fetchImpl!=='function'||
    typeof commitVerified!=='function'||typeof markReversal!=='function'||
    typeof now!=='function')fail('not_configured')
 async function read(url,opts){
  let res
  try{res=await fetchImpl(url,{redirect:'error',
    signal:AbortSignal.timeout(12000),...opts})}
  catch{fail('network_unavailable')}
  if(!res?.ok)fail('provider_get_unavailable')
  try{
   const x=await res.json()
   if(!x||typeof x!=='object'||Array.isArray(x))fail('invalid_provider_reply')
   return x
  }catch{fail('invalid_provider_reply')}
 }
 async function getAccessToken(){
  const res=await read(HOST+'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials'})
  if(res.token_type?.toLowerCase()!=='bearer'||
     !goodSecret(res.access_token))fail('oauth_invalid')
  return res.access_token
 }
 return Object.freeze({
  async verifyFirstPaidCycle({ownerId,intentId,subscriptionId,termsVersion}={}){
   if(!INTENT.test(intentId||'')||!SUB.test(subscriptionId||'')||
      termsVersion!=='pazo-supporter-sandbox.benefits-v2'||
      typeof ownerId!=='string')fail('v2_binding_invalid')
   const at=now()
   if(!Number.isFinite(at))fail('clock_invalid')
   const headers={Authorization:'Bearer '+await getAccessToken(),Accept:'application/json'}
   const sub=await read(HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId),
    {method:'GET',headers})
   if(sub.id!==subscriptionId||sub.plan_id!==PLAN||
      sub.custom_id!==intentId||
      !['ACTIVE','CANCELLED'].includes(sub.status))
    fail('subscription_owner_or_status_invalid')
   // Both dates are obtained from PayPal, not the browser, local clock,
   // or a fabricated 30-day interval.
   const from=ms(sub.start_time),end=ms(sub.billing_info?.next_billing_time)
   if(!Number.isFinite(from)||!Number.isFinite(end)||
      from>at||end<=at||from<at-14*864e5||
      end-from<27*864e5||end-from>32*864e5)
    fail('merchant_period_dates_missing')
   const startISO=new Date(Math.max(0,from-15*60000)).toISOString()
   const endISO=new Date(at).toISOString()
   const url=HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)+
     '/transactions?'+new URLSearchParams({start_time:startISO,end_time:endISO})
   const ledger=await read(url,{method:'GET',headers})
   // PayPal marks total_pages, total_items and links as OPTIONAL.
   // Missing totals do not prove global coverage; verify the single bounded
   // subscription-scoped sale independently below, never infer a paid period
   // from pagination metadata or an ACTIVE subscription alone.
   const linksOk=ledger.links===undefined||
     (Array.isArray(ledger.links)&&ledger.links.length<=10&&
      ledger.links.every(link=>link&&typeof link==='object'&&
       typeof link.rel==='string')&&
      !ledger.links.some(link=>link.rel.toLowerCase()==='next'))
   if(!Array.isArray(ledger.transactions)||
      ledger.transactions.length===0||ledger.transactions.length>5||
      (ledger.total_pages!==undefined&&ledger.total_pages!==1)||
      (ledger.total_items!==undefined&&
       ledger.total_items!==ledger.transactions.length)||
      !linksOk)
    fail('incomplete_subscription_transactions')
   const ids=ledger.transactions.map(tx=>tx?.id)
   if(ids.some(id=>typeof id!=='string'||!ID.test(id))||
      new Set(ids).size!==ids.length)
    fail('invalid_merchant_transaction_ids')
   const reversals=ledger.transactions.filter(tx=>
    ['PARTIALLY_REFUNDED','REFUNDED'].includes(tx.status))
   // The provider's subscription-scoped list is authoritative for this
   // sale's association; independently GET it before placing the hold.
   if(reversals.length===1&&ledger.transactions.length===1&&
      confirmSaleAmount(reversals[0].amount_with_breakdown?.gross_amount)){
    const tx=reversals[0]
    const sale=await read(HOST+'/v1/payments/sale/'+encodeURIComponent(tx.id),
     {method:'GET',headers})
    if(sale.id!==tx.id||!['refunded','partially_refunded'].includes(sale.state)||
       sale.amount?.currency!=='USD'||sale.amount?.total!=='2.99')
     fail('refund_merchant_get_mismatch')
    const reason=sale.state==='refunded'?'refunded':'partially_refunded'
    if(await markReversal({ownerId,intentId,saleId:tx.id,reason})!==true)
     fail('refund_not_durably_held')
    return Object.freeze({phase:'verified_sandbox_reversal',environment:'sandbox',
     paidThrough:null,cycleVerified:false,mayGrantBenefits:false})
   }
   const good=ledger.transactions.filter(tx=>
    tx.status==='COMPLETED'&&
    confirmSaleAmount(tx.amount_with_breakdown?.gross_amount))
   if(good.length!==1 ||
     ledger.transactions.some(tx=>tx.status!=='COMPLETED'||!confirmSaleAmount(tx.amount_with_breakdown?.gross_amount)))
    fail('regular_paid_sale_not_unique_or_reversed')
   const tx=good[0],txTime=ms(tx.time)
   if(!Number.isFinite(txTime)||txTime<from-12*36e5||
      txTime>from+7*864e5||txTime>at+5*6e4)
    fail('sale_time_not_in_first_cycle')
   const sale=await read(HOST+'/v1/payments/sale/'+encodeURIComponent(tx.id),
    {method:'GET',headers})
   if(sale.id!==tx.id||sale.state!=='completed'||
      sale.amount?.currency!=='USD'||sale.amount?.total!=='2.99'||
      (sale.billing_agreement_id!==undefined &&
       sale.billing_agreement_id!==subscriptionId))
    fail('independent_sale_not_completed')
   const proof={
    ownerId,intentId,saleId:tx.id,saleCompletedAt:new Date(txTime).toISOString(),
    serviceStart:new Date(from).toISOString(),serviceEnd:new Date(end).toISOString(),
   }
   const result=await commitVerified(proof)
   if(!result||!['verified_first_sandbox_cycle','already_verified'].includes(result.phase)||
      result.cycleVerified!==true||
      !Number.isFinite(Date.parse(result.periodEnd||''))||
      Date.parse(result.periodEnd)!==end)
    fail('durable_period_not_confirmed')
   return Object.freeze({phase:'verified_first_sandbox_cycle',
    environment:'sandbox',paidThrough:new Date(end).toISOString(),
    cycleVerified:true,mayGrantBenefits:true})
  },
 })
}
