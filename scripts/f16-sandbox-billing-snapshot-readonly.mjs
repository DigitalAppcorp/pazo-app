// F16-P05 — local operator: ONE merchant Sandbox billing snapshot, READ ONLY.
// OAuth token request + GET subscription + GET plan only. No Supabase calls.
import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {createF16P05SandboxBillingSnapshotReader} from '../supabase/functions/f16-paypal-webhook/p05PaypalSandboxBillingSnapshotReader.mjs'
import {summarizeF16P05ExistingBilling} from '../supabase/functions/f16-paypal-webhook/p05OriginalBillingSummary.mjs'
const BASE={environment:'sandbox',step:'p05_original_billing_read_only',
 networkPaymentWrites:0,dbWrites:0,mayGrantBenefits:false,mayRecordPayment:false,
 cycleVerified:false,paidThrough:null}
async function main(){
 let stage='local_state'
 try{
  const state=JSON.parse(readFileSync(join(homedir(),'AppData','Local',
   'PAZO-F16-E2E','sandbox-state.json'),'utf8'))
  if(state?.environment!=='sandbox'||state?.phase!=='buyer_cancelled'||
   state?.recoveryPhase!=='bound_verified'||!/^I-[A-Za-z0-9_-]{3,70}$/.test(state?.subscriptionId||'')||
   state.plan!=='P-14V25407JP6850922NLHMDKI'||!state.intentId)
   throw Error('blocked')
  stage='sandbox_configuration'
  const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  if(!id||!secret)throw Error('blocked')
  stage='merchant_billing_get'
  const reader=createF16P05SandboxBillingSnapshotReader({clientId:id,clientSecret:secret})
  const snapshot=await reader.read(state.subscriptionId)
  stage='evidence_projection'
  const projection=summarizeF16P05ExistingBilling({state,snapshot})
  console.log(JSON.stringify(projection,null,2))
  if(projection.phase==='BLOCKED')process.exitCode=2
 }catch{
  console.log(JSON.stringify({...BASE,phase:'BLOCKED',reason:stage+'_unavailable'},null,2))
  process.exitCode=2
 }
}
await main()
