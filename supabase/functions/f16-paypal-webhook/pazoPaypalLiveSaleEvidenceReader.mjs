// PAZO F16 MVP — PayPal Live merchant evidence reader (OFF by default).
// This is a READ-ONLY candidate for private reconciliation: it NEVER records
// payment, derives service dates, enables checkout, or grants entitlements.
// Caller must independently enforce verified webhook lease, bound owner,
// preexisting consent and merchant/Live credential custody.
import {validatePazoPaypalLiveMonthlyPlan} from './pazoPaypalLivePlanContract.mjs'
import {reviewPazoLiveSubscriptionTransactions} from './pazoPaypalLiveSubscriptionTransactionsProof.mjs'

const HOST='https://api-m.paypal.com'
const SALE=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const PLAN=/^P-[A-Z0-9]{12,40}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256=/^[a-f0-9]{64}$/
const deny=reason=>Object.freeze({
  phase:'BLOCKED',reason,merchantSaleCandidate:false,
  mayCreatePaidPeriod:false,mayRecordPayment:false,mayGrantBenefits:false,
  mayCheckout:false,paidThrough:null,periodStart:null,periodEnd:null,
})
async function getJson({fetchImpl,token,path}){
  const response=await fetchImpl(HOST+path,{
    method:'GET',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  })
  if(!response?.ok || response.status!==200)return null
  const type=response.headers?.get?.('content-type')||'application/json'
  if(!/^application\/json(?:\s*;|$)/i.test(type))return null
  // Limits error/PII amplification from malformed provider responses.
  const raw=await response.text()
  if(typeof raw!=='string'||raw.length>131072)return null
  const data=JSON.parse(raw)
  return data && typeof data==='object'&&!Array.isArray(data)?data:null
}
export function createPazoPaypalLiveSaleEvidenceReader({
  enabled=false,
  expectedPlanId,
  readClaimedVerifiedEvent,
  getMerchantLiveToken,
  fetchImpl=fetch,
}={}){
  return async({saleId,eventId,leaseToken}={})=>{
    if(!enabled)return deny('private_merchant_reader_disabled')
    if(!PLAN.test(expectedPlanId||'') ||
       !SALE.test(saleId||'') || !EVENT.test(eventId||'') ||
       !UUID.test(leaseToken||'') ||
       typeof readClaimedVerifiedEvent!=='function' ||
       typeof getMerchantLiveToken!=='function' ||
       typeof fetchImpl!=='function')return deny('private_inputs_missing')
    try{
      const record=await readClaimedVerifiedEvent({eventId,leaseToken})
      if(record?.sourceEnvironment!=='live' ||
         record?.webhookSignatureVerified!==true ||
         record?.leaseOwned===undefined || record.leaseOwned!==true ||
         record?.eventId!==eventId ||
         record?.eventType!=='PAYMENT.SALE.COMPLETED' ||
         typeof record.verifiedWebhookTime!=='string' ||
         !/^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d(?:\\.\\d{1,6})?Z$/.test(record.verifiedWebhookTime) ||
         !Number.isFinite(Date.parse(record.verifiedWebhookTime)) ||
         record?.saleId!==saleId ||
         !SUB.test(record.subscriptionId||'') ||
         !UUID.test(record.ownerId||'') ||
         !SHA256.test(record.offerTermsSha256||'') ||
         record.ownerIntentVerified!==true ||
         record.acceptedOfferVerified!==true ||
         record.expectedPlanId!==expectedPlanId)return deny('private_event_owner_consent_unverified')
      const token=await getMerchantLiveToken()
      if(typeof token!=='string'||token.length<8||token.length>4096||
         /[\r\n\x00-\x1f\x7f]/.test(token))return deny('merchant_live_auth_unavailable')
      const sale=await getJson({fetchImpl,token,path:'/v1/payments/sale/'+encodeURIComponent(saleId)})
      if(sale?.id!==saleId ||
         !['completed','COMPLETED'].includes(sale?.state) ||
         sale?.billing_agreement_id!==record.subscriptionId ||
         sale?.amount?.currency!=='USD' || sale?.amount?.total!=='2.99')
        return deny('independent_sale_mismatch')
      const subscription=await getJson({fetchImpl,token,
        path:'/v1/billing/subscriptions/'+encodeURIComponent(record.subscriptionId)})
      if(subscription?.id!==record.subscriptionId ||
         subscription?.plan_id!==expectedPlanId ||
         !['ACTIVE','CANCELLED'].includes(subscription.status) ||
         subscription.plan_overridden===true ||
         (subscription.quantity!==undefined && subscription.quantity!=='1') ||
         (subscription.shipping_amount !== undefined &&
          (subscription.shipping_amount?.currency_code!=='USD' ||
           subscription.shipping_amount?.value!=='0.00')))
        return deny('independent_subscription_or_plan_mismatch')
      const plan=await getJson({fetchImpl,token,
        path:'/v1/billing/plans/'+encodeURIComponent(expectedPlanId)})
      if(validatePazoPaypalLiveMonthlyPlan(plan,expectedPlanId).ready!==true)
        return deny('live_plan_terms_unverified')
      // Cross-check the Subscriptions v1 captured payment ledger too, not
      // solely legacy Sale GET or ACTIVE subscription status. All pages must
      // be present. Time window comes from the VERIFIED merchant webhook.
      const at=Date.parse(record.verifiedWebhookTime)
      const since=new Date(at-48*3600000).toISOString().replace('.000Z','Z')
      const until=new Date(at+48*3600000).toISOString().replace('.000Z','Z')
      const transactionList=await getJson({fetchImpl,token,
        path:'/v1/billing/subscriptions/'+encodeURIComponent(record.subscriptionId)+
          '/transactions?start_time='+encodeURIComponent(since)+
          '&end_time='+encodeURIComponent(until)})
      const transactionProof=reviewPazoLiveSubscriptionTransactions({
        document:transactionList,expectedTransactionId:saleId,
        verifiedWebhookTime:record.verifiedWebhookTime,
      })
      if(transactionProof.transactionVerified!==true)
        return deny('subscription_transaction_not_independently_cleared')
      // No "30 days" or "next_billing_time" inference. Seller identity, real
      // contract cycle and reversal history must be reconciled separately.
      return Object.freeze({
        ...deny('merchant_sale_and_plan_candidate_not_contract_period'),
        phase:'REVIEW_REQUIRED',
        merchantSaleCandidate:true,
        saleId,providerEventId:eventId,ownerId:record.ownerId,
        subscriptionId:record.subscriptionId,offerTermsSha256:record.offerTermsSha256,
        providerStatus:subscription.status,
      })
    }catch{return deny('provider_read_or_private_claim_failed')}
  }
}
