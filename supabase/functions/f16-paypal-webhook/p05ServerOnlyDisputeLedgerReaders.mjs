// PAZO F16-P05 — inactive privileged Supabase dispute-ledger evidence adapter.
// PRIVATE SERVER ONLY. Never imported by frontend, public Edge or deployed worker.
// Calls SQL SELECT-only SECURITY DEFINER RPC drafts; SQL NOT YET INSTALLED.
// A seller sale ID MUST originate from authenticated PayPal merchant GET.
const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const OWNER=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTENT=/^intent-[A-Za-z0-9_-]{12,90}$/
const PLAN='P-14V25407JP6850922NLHMDKI'
const safe=x=>typeof x==='string'&&x.length>=24&&x.length<=4096&&
 /^[\x21-\x7e]+$/.test(x)
const fail=x=>{throw Error(x)}
async function read(fetchImpl,url,key,args){
 let r
 try{
  r=await fetchImpl(url,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
   headers:{apikey:key,Authorization:'Bearer '+key,
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify(args),
  })
 }catch{fail('p05_private_dispute_rpc_unavailable')}
 if(!r?.ok)fail('p05_private_dispute_rpc_unavailable')
 let value
 try{value=await r.json()}
 catch{fail('p05_private_dispute_rpc_invalid_json')}
 if(value===null)return null
 if(!value||typeof value!=='object'||Array.isArray(value))
  fail('p05_private_dispute_rpc_invalid_json')
 return value
}
export function createP05ServerOnlyDisputeLedgerReaders({
 projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}){
 if(projectUrl!==HOST||!safe(serviceRoleKey)||
  typeof fetchImpl!=='function')
  fail('p05_private_dispute_rpc_not_configured')
 return Object.freeze({
  async readPrivatePazoPaymentBySaleId({sellerTransactionId}={}){
   if(typeof sellerTransactionId!=='string'||!SALE.test(sellerTransactionId))
    fail('p05_private_dispute_sale_ref_invalid')
   const p=await read(fetchImpl,HOST+
    '/rest/v1/rpc/f16_p05_draft_read_pazo_payment_by_sale',
    serviceRoleKey,{p_seller_transaction_id:sellerTransactionId})
   if(p===null)return null
   if(p.externalPaymentId!==sellerTransactionId||
    !SUB.test(p.externalSubscriptionId||'')||
    !OWNER.test(p.ownerId||'')||p.planId!==PLAN||
    p.currency!=='USD'||p.grossMinorUnits!==299||
    !['uncredited','blocked_reversal'].includes(p.entryState))
    fail('p05_private_dispute_sale_binding_invalid')
   return Object.freeze({
    externalPaymentId:p.externalPaymentId,
    externalSubscriptionId:p.externalSubscriptionId,
    ownerId:p.ownerId,planId:p.planId,
    currency:p.currency,grossMinorUnits:p.grossMinorUnits,
    entryState:p.entryState,
   })
  },
  async readPrivateBoundIntentBySubscription({subscriptionId,expectedOwnerId}={}){
   if(typeof subscriptionId!=='string'||!SUB.test(subscriptionId)||
    typeof expectedOwnerId!=='string'||!OWNER.test(expectedOwnerId))
    fail('p05_private_dispute_intent_scope_invalid')
   const i=await read(fetchImpl,HOST+
    '/rest/v1/rpc/f16_p05_draft_read_bound_intent_for_sale',
    serviceRoleKey,{p_subscription_id:subscriptionId,
     p_expected_owner_id:expectedOwnerId})
   if(i===null)return null
   if(i.subscriptionId!==subscriptionId||i.ownerId!==expectedOwnerId||
    !INTENT.test(i.intentId||'')||i.planId!==PLAN||
    i.provider!=='paypal'||i.state!=='bound')
    fail('p05_private_dispute_intent_binding_invalid')
   return Object.freeze({
    subscriptionId:i.subscriptionId,ownerId:i.ownerId,
    intentId:i.intentId,planId:i.planId,provider:i.provider,
    state:i.state,
   })
  },
 })
}
