// PAZO F16-P05 — OFFLINE server-adapter preflight, NO capture/storage/entitlements.
// Adapters are injected mocks in tests; this is NOT a deployed RPC, webhook,
// PostgREST endpoint, purchase-flow integration, or proof of original signature.
// Never treat source tags or adapter-returned booleans as cryptographic proof.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const PLAN=/^P-[A-Za-z0-9_-]{5,70}$/
const DIGEST=/^[a-f0-9]{64}$/
const UTC=/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/
const time=s=>typeof s==='string'&&UTC.test(s)&&Number.isFinite(Date.parse(s))&&
 (new Date(Date.parse(s)).toISOString()===s||
  new Date(Date.parse(s)).toISOString().replace(/\.000Z$/,'Z')===s)
const exact=(item,fields)=>item!==null&&typeof item==='object'&&!Array.isArray(item)&&
 Object.keys(item).sort().join('|')===fields.slice().sort().join('|')
const BASE=Object.freeze({
 environment:'sandbox',step:'f16_p05_offline_acceptance_merchant_capture_preflight',
 needsManualReview:true,privateSnapshotStored:false,termsAcceptanceStored:false,
 providerSignatureVerifiedByThisCode:false,ownerVerifiedByThisCode:false,
 cycleVerified:false,saleCycleAllocationVerified:false,
 mayCreatePaidPeriod:false,mayRecordPayment:false,mayGrantBenefits:false,
 mayCountCommemorativeMonth:false,paidThrough:null,periodStart:null,periodEnd:null,
 dbWrites:0,networkPaymentWrites:0,
})
const deny=reason=>Object.freeze({...BASE,phase:'REVIEW_REQUIRED',reason})
const OFFER=['version','sha256','planId','monthlyPriceMinor','currency','cadence',
 'cancelDisclosureVersion','privacyNoticeVersion','publishedAt','product']
const ACK=['ownerId','intentId','offerVersion','offerSha256','cancelDisclosureVersion',
 'privacyNoticeVersion','explicitlyAcknowledged','acceptedAt']
const INTENT=['ownerId','id','state','provider','planId','subscriptionId']
const MERCHANT=['id','planId','customId','status','planOverridden','quantity',
 'createdAt','startAt','nextBillingAt','planStatus','planCurrency','planPriceMinor',
 'planCadence','setupFeeMinor']
const EVENT=['id','eventType','subscriptionId','planId','customId',
 'eventAt','inboxVerifiedAt','nextBillingAt','source']

function audit({ownerId,intentId,offer,ack,intent,merchant,event}){
 if(!UUID.test(ownerId||''))return deny('verified_owner_unavailable')
 if(!ID.test(intentId||''))return deny('intent_reference_invalid')
 if(!exact(intent,INTENT)||intent.ownerId!==ownerId||intent.id!==intentId||
  intent.state!=='bound'||intent.provider!=='paypal'||!PLAN.test(intent.planId||'')||
  !SUB.test(intent.subscriptionId||''))
  return deny('private_bound_intent_not_verified')
 if(!exact(offer,OFFER)||!ID.test(offer.version||'')||
  !DIGEST.test(offer.sha256||'')||offer.planId!==intent.planId||
  offer.monthlyPriceMinor!==299||offer.currency!=='USD'||
  offer.cadence!=='MONTH_1'||offer.product!=='PAZO_OPTIONAL_SUPPORTER'||
  !ID.test(offer.cancelDisclosureVersion||'')||
  !ID.test(offer.privacyNoticeVersion||'')||!time(offer.publishedAt))
  return deny('published_terms_invalid_or_unversioned')
 if(!exact(ack,ACK)||ack.ownerId!==ownerId||ack.intentId!==intentId||
  ack.offerVersion!==offer.version||ack.offerSha256!==offer.sha256||
  ack.cancelDisclosureVersion!==offer.cancelDisclosureVersion||
  ack.privacyNoticeVersion!==offer.privacyNoticeVersion||
  ack.explicitlyAcknowledged!==true||!time(ack.acceptedAt))
  return deny('server_recorded_purchase_acknowledgement_missing_or_mismatched')
 if(!exact(merchant,MERCHANT)||merchant.id!==intent.subscriptionId||
  merchant.planId!==intent.planId||merchant.customId!==intentId||
  merchant.status!=='ACTIVE'||merchant.planOverridden!==false||
  merchant.quantity!=='1'||merchant.planStatus!=='ACTIVE'||
  merchant.planCurrency!=='USD'||merchant.planPriceMinor!==299||
  merchant.planCadence!=='MONTH_1'||!time(merchant.createdAt)||
  !time(merchant.startAt)||
  (merchant.nextBillingAt!==null&&!time(merchant.nextBillingAt)))
  return deny('merchant_subscription_or_plan_snapshot_unverified')
 // Missing PayPal setup_fee is UNKNOWN, never silently converted to zero.
 if(merchant.setupFeeMinor===null)return deny('provider_setup_fee_unknown')
 if(merchant.setupFeeMinor!==0)return deny('provider_setup_fee_not_zero')
 if(!exact(event,EVENT)||!ID.test(event.id||'')||
  event.eventType!=='BILLING.SUBSCRIPTION.ACTIVATED'||
  event.subscriptionId!==merchant.id||event.planId!==intent.planId||
  event.customId!==intentId||event.source!=='VERIFIED_SIGNED_INBOX'||
  !time(event.eventAt)||!time(event.inboxVerifiedAt)||
  (event.nextBillingAt!==null&&!time(event.nextBillingAt)))
  return deny('verified_activation_source_or_identity_missing')
 const stamp=s=>Date.parse(s)
 // Purchase terms must be explicitly acknowledged before merchant creation.
 // Requires PayPal creation timestamp: absence cannot be replaced by start_time.
 if(stamp(offer.publishedAt)>stamp(ack.acceptedAt)||
  stamp(ack.acceptedAt)>stamp(merchant.createdAt)||
  stamp(merchant.createdAt)>stamp(event.eventAt)||
  stamp(event.eventAt)>stamp(event.inboxVerifiedAt))
  return deny('offer_purchase_merchant_activation_chronology_invalid')
 if(merchant.nextBillingAt===null||event.nextBillingAt===null)
  return deny('provider_schedule_snapshot_missing')
 if(stamp(event.nextBillingAt)<=stamp(event.eventAt)||
  stamp(merchant.nextBillingAt)<=stamp(merchant.createdAt)||
  merchant.nextBillingAt!==event.nextBillingAt)
  return deny('provider_schedule_snapshot_not_correlated')
 // IDs, dates, digest and owner stay inside private adapters, never in output.
 // Even aligned snapshots and an explicit checkbox DO NOT provide the proof
 // of payment-to-cycle allocation, signature, independent settlement or law.
 return Object.freeze({...BASE,phase:'OFFLINE_CAPTURE_CANDIDATE',
  reason:'service_owner_terms_and_schedule_shapes_consistent_not_attested',
  acceptanceVersionAligned:true,scheduleSnapshotsAligned:true,
  requiresTrustedBackendAttestation:true,requiresRetentionDecision:true,
  requiresSaleCycleAllocation:true,
 })
}
export function createF16P05OfflineCaptureInspector({
 resolveOwnerFromVerifiedSession,readBoundIntent,readPublishedOffer,
 readPrivatePurchaseAcknowledgement,readMerchantSubscriptionAndPlan,
 readVerifiedActivationFromPrivateInbox,
}={}){
 const deps=[resolveOwnerFromVerifiedSession,readBoundIntent,readPublishedOffer,
  readPrivatePurchaseAcknowledgement,readMerchantSubscriptionAndPlan,
  readVerifiedActivationFromPrivateInbox]
 if(deps.some(x=>typeof x!=='function'))
  throw Error('f16_p05_offline_capture_adapters_not_configured')
 return Object.freeze({
  async inspect({requestContext,intentId}={}){
   // requestContext only exists in a future trusted server integration.
   // The consumer never supplies ownerId or payment details to this API.
   try{
    const ownerId=await resolveOwnerFromVerifiedSession(requestContext)
    if(!UUID.test(ownerId||''))return deny('verified_owner_unavailable')
    if(!ID.test(intentId||''))return deny('intent_reference_invalid')
    const intent=await readBoundIntent({ownerId,intentId})
    if(!exact(intent,INTENT)||intent.ownerId!==ownerId||intent.id!==intentId||
     intent.state!=='bound'||intent.provider!=='paypal'||
     !PLAN.test(intent.planId||'')||!SUB.test(intent.subscriptionId||''))
     return deny('private_bound_intent_not_verified')
    const offer=await readPublishedOffer({planId:intent.planId})
    const ack=await readPrivatePurchaseAcknowledgement({ownerId,intentId})
    const merchant=await readMerchantSubscriptionAndPlan({subscriptionId:intent.subscriptionId})
    const event=await readVerifiedActivationFromPrivateInbox({subscriptionId:intent.subscriptionId})
    return audit({ownerId,intentId,intent,offer,ack,merchant,event})
   }catch{return deny('trusted_read_only_adapters_unavailable')}
  },
 })
}
