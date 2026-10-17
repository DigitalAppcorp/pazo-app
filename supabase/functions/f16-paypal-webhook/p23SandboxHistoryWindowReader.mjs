// PAZO F16-P23 — OFFLINE-SYNTHETIC ONLY merchant transaction history window reader.
// SERVER-ONLY; never imported into Edge, frontend, schedule or financial writer.
// A complete set of *queried windows* is NOT complete financial/reversal history.
// Provider and contract callbacks MUST be trusted by future hosted deployment;
// mock injection in this module cannot attest them.
const HOST='https://api-m.sandbox.paypal.com'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const REF=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const DAY=86400000
const MAX_WINDOWS=14
const MAX_TX=100
const UTC=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/
const isUtc=s=>typeof s==='string'&&UTC.test(s)&&
 Number.isFinite(Date.parse(s))&&
 [new Date(s).toISOString(),new Date(s).toISOString().replace(/\.000Z$/,'Z')].includes(s)
const fail=code=>{throw Error(code)}
const envelope=(phase,reason,extra={})=>Object.freeze({
 step:'f16_p23_subscription_transaction_windows',environment:'sandbox',
 phase,reason,sourceAttestedByThisCode:false,
 fullFinancialHistoryVerified:false,refundsDisputesCoverageComplete:false,
 cycleVerified:false,periodStart:null,periodEnd:null,paidThrough:null,
 mayRecordPayment:false,mayGrantBenefits:false,mayCreatePaidPeriod:false,
 networkPaymentWrites:0,dbWrites:0,...extra,
})
const reject=reason=>envelope('REVIEW_REQUIRED',reason)
const str=x=>typeof x==='string'&&x.length>=8&&x.length<=512&&
 /^[\x21-\x7e]+$/.test(x)
function pages(start,end){
 const a=Date.parse(start),b=Date.parse(end)
 if(!isUtc(start)||!isUtc(end)||b<=a||b-a>MAX_WINDOWS*30*DAY)
  fail('unbounded_or_untrusted_contract_period')
 const chunks=[]
 for(let p=a;p<b;){
  const next=Math.min(p+30*DAY,b)
  chunks.push([new Date(p).toISOString().replace(/\.000Z$/,'Z'),
   new Date(next).toISOString().replace(/\.000Z$/,'Z')])
  p=next
 }
 if(chunks.length===0||chunks.length>MAX_WINDOWS)
  fail('unbounded_or_untrusted_contract_period')
 return chunks
}
async function getJson(fetchImpl,url,opts){
 let response
 try{response=await fetchImpl(url,{...opts,
  redirect:'error',signal:AbortSignal.timeout(12000)})}
 catch{fail('merchant_get_transport_unavailable')}
 if(!response?.ok)fail('merchant_get_http_unavailable')
 let data
 try{data=await response.json()}
 catch{fail('merchant_get_invalid_json')}
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('merchant_get_invalid_json')
 return data
}
export function createP23SandboxHistoryWindowReader({
 clientId,clientSecret,getClaimedMerchantEvent,
 getClaimedMerchantSubscription,readTrustedContractWindow,
 fetchImpl=fetch,scope='DISABLED',
}={}){
 // No merchant side effects unless the internal synthetic mode is explicit.
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return Object.freeze({inspect:async()=>reject('reader_disabled')})
 if(!str(clientId)||clientId.includes(':')||!str(clientSecret)||
  typeof fetchImpl!=='function'||
  [getClaimedMerchantEvent,getClaimedMerchantSubscription,
   readTrustedContractWindow].some(x=>typeof x!=='function'))
  fail('p23_synthetic_reader_not_configured')
 return Object.freeze({
  async inspect({eventId,claimToken}={}){
   if(!REF.test(eventId||'')||!UUID.test(claimToken||''))
    return reject('invalid_claim_scope')
   let event,sub,contract
   try{
    event=await getClaimedMerchantEvent({eventId,claimToken})
    if(event?.id!==eventId||event?.event_type!=='PAYMENT.SALE.COMPLETED'||
     !REF.test(event?.resource?.id||'')||
     !SUB.test(event?.resource?.billing_agreement_id||'')||
     event?.resource?.amount?.currency!=='USD'||
     event?.resource?.amount?.total!=='2.99'||
     !['COMPLETED','completed'].includes(event?.resource?.state))
     return reject('claimed_sale_event_unverified')
    sub=await getClaimedMerchantSubscription({
     subscriptionId:event.resource.billing_agreement_id,eventId,claimToken})
    if(sub?.id!==event.resource.billing_agreement_id||
     sub?.plan_id!==PLAN||!INTENT.test(sub?.custom_id||'')||
     !['ACTIVE','CANCELLED'].includes(sub?.status))
     return reject('merchant_subscription_binding_unverified')
    contract=await readTrustedContractWindow({eventId,claimToken,
     subscriptionId:sub.id,intentId:sub.custom_id})
   }catch{return reject('trusted_claim_or_contract_unavailable')}
   // Future trusted callback MUST derive start from original P06 consent
   // and end from server-owned observation. Input caller cannot supply dates.
   if(!contract||contract.intentId!==sub.custom_id||
    contract.subscriptionId!==sub.id||
    !isUtc(contract.acceptedAt)||!isUtc(contract.startAt)||
    !isUtc(contract.endAt)||
    Date.parse(contract.acceptedAt)>Date.parse(contract.startAt))
    return reject('prospective_consent_or_time_scope_unverified')
   let chunks
   try{chunks=pages(contract.startAt,contract.endAt)}
   catch{return reject('unbounded_or_untrusted_contract_period')}
   let auth
   try{
    const t=await getJson(fetchImpl,HOST+'/v1/oauth2/token',{
     method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
      'Content-Type':'application/x-www-form-urlencoded',
      Accept:'application/json'},
     body:'grant_type=client_credentials',
    })
    if(t.token_type?.toLowerCase()!=='bearer'||
       typeof t.access_token!=='string'||t.access_token.length<8)
      return reject('paypal_oauth_unavailable')
    auth={Authorization:'Bearer '+t.access_token,Accept:'application/json'}
   }catch{return reject('paypal_oauth_unavailable')}
   const seen=new Set()
   let matching=0,other=0,windowCount=0,uncertain=false
   for(const [start,end] of chunks){
    const p=new URLSearchParams({start_time:start,end_time:end})
    let page
    try{
     page=await getJson(fetchImpl,
      HOST+'/v1/billing/subscriptions/'+encodeURIComponent(sub.id)+
      '/transactions?'+p.toString(),{method:'GET',headers:auth})
    }catch{return reject('merchant_transaction_window_unavailable')}
    if(!Array.isArray(page.transactions)||page.transactions.length>MAX_TX||
       !Number.isInteger(page.total_items)||
       !Number.isInteger(page.total_pages)||
       page.total_items!==page.transactions.length||
       page.total_pages!==(page.transactions.length?1:0)||
       !Array.isArray(page.links)||
       page.links.some(link=>link?.rel==='next'))
      return reject('transaction_pagination_or_window_incomplete')
    for(const tx of page.transactions){
     if(!REF.test(tx?.id||'')||!isUtc(tx?.time)||
        Date.parse(tx.time)<Date.parse(start)||
        Date.parse(tx.time)>Date.parse(end)||
        seen.has(tx.id))
      return reject('transaction_duplicate_or_time_untrusted')
     seen.add(tx.id)
     if(tx.status!=='COMPLETED'||tx.amount_with_breakdown?.
        gross_amount?.currency_code!=='USD'||
        tx.amount_with_breakdown?.gross_amount?.value!=='2.99')
      uncertain=true
     if(tx.id===event.resource.id)matching++
     else other++
    }
    windowCount++
   }
   if(matching!==1)return reject('signed_sale_not_unique_in_complete_windows')
   if(uncertain)return reject('non_regular_or_reversed_transaction_in_window')
   // Later or prior transactions are not assigned to a period by this module.
   // Refunded/reversed/disputed transactions may change after this GET.
   return envelope('WINDOWS_CHECKED_REVIEW_ONLY',
    'financial_reversal_and_contractual_period_not_proven',
    {windowCount,transactionCount:seen.size,otherTransactionCount:other,
     merchantWindowMetadataChecked:true})
  },
 })
}
