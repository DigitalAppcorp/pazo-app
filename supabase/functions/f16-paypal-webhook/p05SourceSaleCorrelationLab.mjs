// PAZO F16-P05 — PURE READ-ONLY sale/event/subscription source correlation.
// Prospective test harness, NOT a deployable worker, financial attestation,
// cycle attribution, ledger writer, or entitlement authorization.
// All merchant and inbox adapters are injected and can be spoofed in tests;
// production must supply verified HTTPS/OAuth + signed ingress evidence.
const REF=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const date=v=>typeof v==='string'&&DATE.test(v)&&
 Number.isFinite(Date.parse(v))&&
 [new Date(v).toISOString(),new Date(v).toISOString().replace(/\.000Z$/,'Z')].includes(v)
const money=v=>v?.currency_code==='USD'&&v?.value==='2.99'
const saleMoney=v=>v?.currency==='USD'&&v?.total==='2.99'
const no=(reason)=>Object.freeze({
 environment:'sandbox',step:'f16_p05_source_correlation_offline',
 phase:'REVIEW_REQUIRED',reason,
 sourceAttributionVerifiedByThisCode:false,
 providerSignatureVerifiedByThisCode:false,
 originalRegularCycleProven:false,cycleVerified:false,
 paymentRecorded:false,mayRecordPayment:false,mayCreatePaidPeriod:false,
 mayGrantBenefits:false,mayEnableCheckout:false,paidThrough:null,
 periodStart:null,periodEnd:null,financialHistoryComplete:false,
 dbWrites:0,networkPaymentWrites:0,
})
const matched=()=>Object.freeze({...no('merchant_sale_webhook_subscription_match_not_cycle_proof'),
 phase:'SALE_CORRELATION_CANDIDATE_ONLY',
 saleEventTransactionRefsMatched:true,
 originalRegularCycleProven:false,requiresHistoricalCycleEvidence:true,
 requiresRefundDisputeAndHistoryCoverage:true,
 })
export function createF16P05SourceCorrelationInspector(adapters={}){
 const names=['resolveOwnerFromVerifiedSession','readBoundIntent',
  'readSignedInboxEvent','getMerchantSubscription',
  'getMerchantWebhookEvent','listMerchantTransactions']
 if(names.some(n=>typeof adapters[n]!=='function'))
  throw Error('f16_p05_unconfigured_offline_read_adapters')
 return Object.freeze({
  async inspect({requestContext,intentId,saleEventId}={}){
   try{
    // A caller-supplied ownerId/subscriptionId is never an access control.
    const ownerId=await adapters.resolveOwnerFromVerifiedSession(requestContext)
    if(!UUID.test(ownerId||''))return no('verified_session_owner_unavailable')
    if(!REF.test(intentId||'')||!REF.test(saleEventId||''))
     return no('invalid_private_intent_or_event_reference')
    const intent=await adapters.readBoundIntent({ownerId,intentId})
    if(!intent||intent.ownerId!==ownerId||intent.id!==intentId||
      intent.state!=='bound'||intent.provider!=='paypal'||
      !SUB.test(intent.subscriptionId||'')||!REF.test(intent.planId||''))
      return no('private_bound_intent_not_proven')
    const inbox=await adapters.readSignedInboxEvent({
      eventId:saleEventId,eventType:'PAYMENT.SALE.COMPLETED',
    })
    if(!inbox||inbox.id!==saleEventId||
      inbox.type!=='PAYMENT.SALE.COMPLETED'||!date(inbox.verifiedAt)||
      !['pending','processing','processed','quarantined'].includes(inbox.processingState)||
      inbox.processingState==='quarantined')
      return no('signed_inbox_event_not_proven')
    const [event,sub,transactions]=await Promise.all([
      adapters.getMerchantWebhookEvent({eventId:saleEventId}),
      adapters.getMerchantSubscription({subscriptionId:intent.subscriptionId}),
      adapters.listMerchantTransactions({subscriptionId:intent.subscriptionId}),
    ])
    if(!event||event.id!==saleEventId||
      event.event_type!=='PAYMENT.SALE.COMPLETED')
      return no('merchant_webhook_event_id_or_type_mismatch')
    if(!sub||sub.id!==intent.subscriptionId||
      sub.plan_id!==intent.planId||sub.custom_id!==intentId||
      !['ACTIVE','CANCELLED'].includes(sub.status))
      return no('merchant_subscription_binding_mismatch')
    const resource=event.resource
    if(!resource||!REF.test(resource.id||'')||
      resource.billing_agreement_id!==intent.subscriptionId||
      !['completed','COMPLETED'].includes(resource.state)||
      !saleMoney(resource.amount))
      return no('merchant_sale_event_resource_mismatch')
    const txs=Array.isArray(transactions)?transactions:transactions?.transactions
    if(!Array.isArray(txs)||txs.length>1000||txs.length===0)
      return no('merchant_transaction_window_missing_or_unbounded')
    const matches=txs.filter(t=>t?.id===resource.id)
    if(matches.length!==1)return no('sale_missing_or_repeated_in_merchant_transactions')
    const tx=matches[0]
    if(tx.status!=='COMPLETED'||
      !money(tx.amount_with_breakdown?.gross_amount)||!date(tx.time))
      return no('merchant_sale_amount_state_or_time_invalid')
    // Event creation and transaction time can differ: neither defines a cycle.
    if(event.create_time!==undefined&&!date(event.create_time))
      return no('merchant_event_timestamp_invalid')
    return matched()
   }catch{
    // No raw PayPal responses, contact data, secrets or IDs in diagnostics.
    return no('read_only_source_adapter_unavailable')
   }
  },
 })
}
