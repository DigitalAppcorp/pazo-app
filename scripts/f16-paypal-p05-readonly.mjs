// PAZO F16-P05: explicitly operator-run read-only Sandbox diagnostic.
// No write calls, subscription creation, retries, checkout, or entitlements.
// No secrets/PII/PayPal IDs in output. Does not certify paid service periods.
// DO NOT execute against real merchant until scoped PO GO.
import {pathToFileURL} from 'node:url'
import {createF16P05SandboxBillingSnapshotReader} from '../supabase/functions/f16-paypal-webhook/p05PaypalSandboxBillingSnapshotReader.mjs'
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const TOKEN=/^[\x21-\x7e]{8,512}$/
const yesNo=value=>typeof value==='boolean'?value:null
export function summarizeF16P05ReadOnlySnapshot(snapshot) {
 const s=snapshot?.subscription,p=snapshot?.plan
 const cycles=p?.billing_cycles
 const regular=Array.isArray(cycles)&&cycles.length===1?cycles[0]:null
 const isKnownPlan=p?.id==='P-14V25407JP6850922NLHMDKI'
 return Object.freeze({
  environment:'sandbox',diagnostic:'p05_read_only',
  merchantReadSucceeded:snapshot?.merchantScopedByPayPalApi===true&&
   snapshot.planScopedByPayPalApi===true,
  currentPlanMatches299Monthly:isKnownPlan&&p.status==='ACTIVE'&&
   regular?.tenure_type==='REGULAR'&&
   regular.frequency?.interval_unit==='MONTH'&&
   regular.frequency?.interval_count===1&&
   regular.pricing_scheme?.fixed_price?.currency_code==='USD'&&
   regular.pricing_scheme?.fixed_price?.value==='2.99',
  subscriptionPlanOverride:yesNo(s?.plan_overridden),
  subscriptionQuantityOne:s?.quantity==='1',
  subscriptionCurrentlyCancelled:s?.status==='CANCELLED',
  observedFailedPaymentCount:Number.isSafeInteger(s?.billing_info?.failed_payments_count)&&
   s.billing_info.failed_payments_count>=0?
   s.billing_info.failed_payments_count:null,
  balanceKnown:s?.billing_info?.outstanding_balance!==undefined&&
   s.billing_info.outstanding_balance!==null,
  nextBillingPresent:typeof s?.billing_info?.next_billing_time==='string',
  lastFailedPaymentPresent:typeof s?.billing_info?.last_failed_payment?.time==='string',
  retryScheduled:typeof s?.billing_info?.last_failed_payment?.next_payment_retry_time==='string',
  billingPeriodProven:false,
  cycleAttributionProven:false,
  financialHistoryComplete:false,
  mayGrantEntitlement:false,
  paidThrough:null,
 })
}
export async function runF16P05ReadOnlyDiagnostic({
 env=process.env,readerFactory=createF16P05SandboxBillingSnapshotReader,
 print=console.log,warn=console.error,
}={}) {
 const id=env.PAYPAL_SANDBOX_CLIENT_ID
 const secret=env.PAYPAL_SANDBOX_CLIENT_SECRET
 const sub=env.PAZO_P05_SANDBOX_SUBSCRIPTION_ID
 if(typeof sub!=='string'||!SUB.test(sub)){
  warn('BLOCKED: PAZO_P05_SANDBOX_SUBSCRIPTION_ID must be a known Sandbox I-... reference. No network attempted.')
  return 2
 }
 if(typeof id!=='string'||!TOKEN.test(id)||id.includes(':')||
  typeof secret!=='string'||!TOKEN.test(secret)){
  warn('BLOCKED: Sandbox merchant credentials must be available only through secure local environment. Never paste them in chat, Git or screenshots.')
  return 2
 }
 try {
  const reader=readerFactory({clientId:id,clientSecret:secret})
  const data=await reader.read(sub)
  const summary=summarizeF16P05ReadOnlySnapshot(data)
  print(JSON.stringify(summary,null,2))
  return summary.merchantReadSucceeded&&summary.currentPlanMatches299Monthly?0:1
 }catch{
  warn('BLOCKED: PayPal Sandbox merchant read failed. No raw response, credentials, buyer data or reference IDs were printed.')
  return 2
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 process.exitCode=await runF16P05ReadOnlyDiagnostic()
