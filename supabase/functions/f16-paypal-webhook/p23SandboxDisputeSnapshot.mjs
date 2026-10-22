// PAZO F16-P23 — PayPal Sandbox dispute snapshot scoped by a claimed sale.
// INACTIVE SYNTHETIC ONLY. An empty snapshot cannot prove no future dispute,
// no refund or full historical coverage. Never grant paid time.
const HOST='https://api-m.sandbox.paypal.com'
const REF=/^[A-Za-z0-9._-]{3,128}$/
const TX=/^[0-9A-Z_]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const secret=x=>typeof x==='string'&&x.length>=8&&x.length<=512&&
 /^[\x21-\x7e]+$/.test(x)
const result=(phase,reason)=>Object.freeze({
 environment:'sandbox',step:'f16_p23_dispute_snapshot',
 phase,reason,merchantDisputeSnapshotConsulted:phase!=='REVIEW_REQUIRED',
 disputesCleared:false,refundsCleared:false,financialHistoryComplete:false,
 cycleVerified:false,paidThrough:null,mayRecordPayment:false,
 mayGrantBenefits:false,dbWrites:0,networkPaymentWrites:0,
})
const review=r=>result('REVIEW_REQUIRED',r)
const json=async(fetchImpl,url,opts)=>{
 let response
 try{response=await fetchImpl(url,{...opts,redirect:'error',
  signal:AbortSignal.timeout(12000)})}
 catch{throw Error('merchant_unavailable')}
 if(!response?.ok)throw Error('merchant_unavailable')
 try{
  const body=await response.json()
  if(body&&typeof body==='object'&&!Array.isArray(body))return body
 }catch{}
 throw Error('merchant_unavailable')
}
export function createP23SandboxDisputeSnapshot({
 scope='DISABLED',clientId,clientSecret,getClaimedMerchantEvent,
 fetchImpl=fetch,
}={}){
 if(scope!=='OFFLINE_SYNTHETIC_TEST_ONLY')
  return Object.freeze({inspect:async()=>review('reader_disabled')})
 if(!secret(clientId)||clientId.includes(':')||!secret(clientSecret)||
   typeof getClaimedMerchantEvent!=='function'||typeof fetchImpl!=='function')
  throw Error('p23_dispute_reader_not_configured')
 return Object.freeze({
  async inspect({eventId,claimToken}={}){
   if(!REF.test(eventId||'')||!UUID.test(claimToken||''))
    return review('claim_invalid')
   let sale
   try{sale=await getClaimedMerchantEvent({eventId,claimToken})}
   catch{return review('claim_unavailable')}
   if(sale?.id!==eventId||sale?.event_type!=='PAYMENT.SALE.COMPLETED'||
      !TX.test(sale?.resource?.id||'')||
      !['COMPLETED','completed'].includes(sale?.resource?.state))
    return review('claim_sale_unverified')
   let token
   try{
    const auth=await json(fetchImpl,HOST+'/v1/oauth2/token',{
     method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
      'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
     body:'grant_type=client_credentials',
    })
    if(auth.token_type?.toLowerCase()!=='bearer'||
      typeof auth.access_token!=='string'||auth.access_token.length<8)
      return review('dispute_auth_unavailable')
    token=auth.access_token
   }catch{return review('dispute_auth_unavailable')}
   let page
   try{
    const q=new URLSearchParams({
     disputed_transaction_id:sale.resource.id,page_size:'50',page:'1',
    })
    page=await json(fetchImpl,HOST+'/v1/customer/disputes?'+q,{
     method:'GET',headers:{Authorization:'Bearer '+token,
      Accept:'application/json'},
    })
   }catch{return review('dispute_snapshot_unavailable')}
   if(!Array.isArray(page.items)||page.items.length>=50||
      !Array.isArray(page.links)||
      page.links.some(x=>x?.rel==='next'||x?.rel==='next_page')||
      page.items.some(x=>!x||typeof x.dispute_id!=='string'||
       x.dispute_id.length<3))
    return review('dispute_pagination_or_shape_uncertain')
   if(page.items.length!==0)return review('dispute_requires_independent_review')
   return result('DISPUTE_SNAPSHOT_EMPTY_REVIEW_ONLY',
    'future_disputes_refunds_and_external_coverage_unproven')
  },
 })
}
