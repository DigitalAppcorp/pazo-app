// PAZO F16-P05 — INACTIVE, SERVER-ONLY PayPal Sandbox evidence reader.
// Not deployed, not imported by checkout/webhook/entitlement code. No DB writes.
// An authorized future worker (not an end-user session) must provide
// readTrustedBoundIntent and readTrustedInboxRefs as privileged private reads.
// Mock callbacks are NOT actual authorization or evidence attestation.
const HOST='https://api-m.sandbox.paypal.com'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const REF=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const utc=s=>typeof s==='string'&&UTC.test(s)&&Number.isFinite(Date.parse(s))&&
 (new Date(s).toISOString()===s||new Date(s).toISOString().replace(/\.000Z$/,'Z')===s)
const credential=s=>typeof s==='string'&&/^[\x21-\x7e]{8,512}$/.test(s)&&!s.includes(':')
const secret=s=>typeof s==='string'&&/^[\x21-\x7e]{8,512}$/.test(s)
const validEventTypes=new Set([
 'BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.PAYMENT.FAILED',
 'BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.RE-ACTIVATED',
 'BILLING.SUBSCRIPTION.CANCELLED','PAYMENT.SALE.COMPLETED',
 'PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED',
 'CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED',
])
const invalid=reason=>{throw Error(reason)}
async function readJson(fetchImpl,url,opts){
 let response
 try{
  response=await fetchImpl(url,{
   ...opts,redirect:'error',signal:AbortSignal.timeout(12000),
  })
 }catch{
  invalid('paypal_read_only_transport_unavailable')
 }
 if(!response?.ok)invalid('paypal_read_only_http_unavailable')
 let json
 try{json=await response.json()}
 catch{invalid('paypal_read_only_json_invalid')}
 if(!json||typeof json!=='object'||Array.isArray(json))
  invalid('paypal_read_only_json_invalid')
 return json
}
const projectEvent=e=>({
 id:e.id,event_type:e.event_type,create_time:e.create_time,
 resource:e.event_type==='PAYMENT.SALE.COMPLETED'?
  {id:e.resource?.id,billing_agreement_id:e.resource?.billing_agreement_id,
   state:e.resource?.state,
   amount:{currency:e.resource?.amount?.currency,
    total:e.resource?.amount?.total}}:undefined,
})
export function createP05SandboxMerchantEvidenceReader({
 clientId,clientSecret,windowStart,windowEnd,readTrustedBoundIntent,
 readTrustedInboxRefs,fetchImpl=fetch,
}={}){
 if(!credential(clientId)||!secret(clientSecret)||typeof fetchImpl!=='function'||
  typeof readTrustedInboxRefs!=='function'||typeof readTrustedBoundIntent!=='function')
  invalid('sandbox_read_only_reader_not_configured')
 if(!utc(windowStart)||!utc(windowEnd)||
  Date.parse(windowStart)>=Date.parse(windowEnd)||
  Date.parse(windowEnd)-Date.parse(windowStart)>31*86400000)
  invalid('sandbox_read_only_window_invalid')
 async function auth(){
  const o=await readJson(fetchImpl,HOST+'/v1/oauth2/token',{
   method:'POST',headers:{Authorization:'Basic '+btoa(clientId+':'+clientSecret),
    'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials',
  })
  if(o.token_type?.toLowerCase()!=='bearer'||typeof o.access_token!=='string'||
   o.access_token.length<8)invalid('sandbox_read_only_auth_invalid')
  return {Authorization:'Bearer '+o.access_token,Accept:'application/json'}
 }
 async function eventGet(headers,eventId){
  const e=await readJson(fetchImpl,
   HOST+'/v1/notifications/webhooks-events/'+encodeURIComponent(eventId),
   {method:'GET',headers})
  if(e.id!==eventId||!validEventTypes.has(e.event_type)||!utc(e.create_time))
   invalid('sandbox_event_reference_or_type_mismatch')
  return projectEvent(e)
 }
 return Object.freeze({
  async inspect({intentId,saleEventId}={}){
   if(!REF.test(intentId||'')||!REF.test(saleEventId||''))
    invalid('server_scoped_refs_invalid')
   // Resolve all merchant identifiers from the private internal worker scope.
   // A browser-controlled subscriptionId never chooses the PayPal account.
   let intent
   try{intent=await readTrustedBoundIntent({intentId})}
   catch{invalid('private_bound_intent_read_unavailable')}
   if(!intent||intent.id!==intentId||intent.state!=='bound'||
    intent.provider!=='paypal'||!UUID.test(intent.ownerId||'')||
    !SUB.test(intent.subscriptionId||'')||!REF.test(intent.planId||''))
    invalid('private_bound_intent_scope_invalid')
   const subscriptionId=intent.subscriptionId
   // Only an internal authenticated service-owned inbox reader supplies refs.
   // Browser-supplied signature flags are never accepted.
   let inboxEventRefs
   try{inboxEventRefs=await readTrustedInboxRefs({intentId,subscriptionId,saleEventId})}
   catch{invalid('private_signed_inbox_read_unavailable')}
   if(!Array.isArray(inboxEventRefs)||inboxEventRefs.length>20||
    inboxEventRefs.some(x=>!x||!REF.test(x.id||'')||
      !validEventTypes.has(x.type)||!utc(x.verifiedAt)||
      !['processing','processed'].includes(x.processingState))||
    new Set(inboxEventRefs.map(x=>x.id)).size!==inboxEventRefs.length)
    invalid('server_scoped_refs_invalid')
   // Event refs MUST come from trusted private signed-inbox read, not caller.
   if(!inboxEventRefs.some(x=>x.id===saleEventId&&
    x.type==='PAYMENT.SALE.COMPLETED'))
    invalid('signed_sale_inbox_reference_missing')
   const headers=await auth()
   const endpoint=HOST+'/v1/billing/subscriptions/'+encodeURIComponent(subscriptionId)
   const params=new URLSearchParams({start_time:windowStart,end_time:windowEnd})
   const [sub,list,events]=await Promise.all([
    readJson(fetchImpl,endpoint,{method:'GET',headers}),
    readJson(fetchImpl,endpoint+'/transactions?'+params,{method:'GET',headers}),
    Promise.all(inboxEventRefs.map(x=>eventGet(headers,x.id))),
   ])
   if(sub.id!==subscriptionId||sub.plan_id!==intent.planId||
    sub.custom_id!==intentId||!['ACTIVE','CANCELLED'].includes(sub.status))
    invalid('merchant_subscription_binding_mismatch')
   if(!Array.isArray(list.transactions)||list.transactions.length>500)
    invalid('merchant_transaction_list_invalid')
   // "complete" here is at most the response's requested date window,
   // never a proof of the entire merchant or refund/dispute history.
   const metaComplete=Number.isInteger(list.total_items)&&
    Number.isInteger(list.total_pages)&&list.total_pages===1&&
    list.total_items===list.transactions.length&&
    Array.isArray(list.links)&&!list.links.some(x=>x?.rel==='next')
   const ids=list.transactions.map(x=>x?.id)
   if(ids.some(x=>!REF.test(x||''))||new Set(ids).size!==ids.length)
    invalid('merchant_transaction_ids_ambiguous')
   const eventById=new Map(events.map(e=>[e.id,e]))
   if(inboxEventRefs.some(x=>eventById.get(x.id)?.event_type!==x.type))
    invalid('merchant_event_type_inbox_mismatch')
   const sale=eventById.get(saleEventId)
   if(!sale||sale.event_type!=='PAYMENT.SALE.COMPLETED'||
    !REF.test(sale.resource?.id||'')||
    sale.resource?.billing_agreement_id!==subscriptionId)
    invalid('sale_event_not_linked_to_subscription')
   const matching=list.transactions.filter(x=>x.id===sale.resource.id)
   if(matching.length!==1)invalid('sale_missing_from_transaction_window')
   const transaction=matching[0]
   if(transaction.status!=='COMPLETED'||
    transaction.amount_with_breakdown?.gross_amount?.currency_code!=='USD'||
    transaction.amount_with_breakdown?.gross_amount?.value!=='2.99'||
    sale.resource?.amount?.currency!=='USD'||
    sale.resource?.amount?.total!=='2.99'||
    !['completed','COMPLETED'].includes(sale.resource?.state)||
    !utc(transaction.time))
    invalid('completed_sale_amount_or_status_invalid')
   return Object.freeze({
    environment:'sandbox',step:'p05_server_only_merchant_evidence_read',
    subscription:{id:sub.id,plan_id:sub.plan_id,custom_id:sub.custom_id,
     status:sub.status},
    event:sale,
    transaction:{id:transaction.id,status:transaction.status,
     time:transaction.time,
     amount_with_breakdown:{gross_amount:{
      currency_code:transaction.amount_with_breakdown.gross_amount.currency_code,
      value:transaction.amount_with_breakdown.gross_amount.value}}},
    lifecycleEventTypes:events.map(e=>e.event_type),
    merchantWindowMetadataComplete:metaComplete,
    webhookJournalComplete:false,financialHistoryComplete:false,
    refundsDisputesCoverageComplete:false,
    cycleVerified:false,paidThrough:null,
    mayRecordPayment:false,mayGrantBenefits:false,
    dbWrites:0,networkPaymentWrites:0,
   })
  },
 })
}
