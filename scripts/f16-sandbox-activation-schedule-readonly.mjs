// F16-P05 local read-only investigation of the ORIGINAL activation event.
// OAuth POST authenticates only; one GET reads historic event. No financial writes.
import {readFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {assessF16P05HistoricalActivation} from '../supabase/functions/f16-paypal-webhook/f16P05HistoricalActivationEvidence.mjs'

const HOST='https://api-m.sandbox.paypal.com'
const safe=(phase,reason,stage)=>({
 environment:'sandbox',step:'f16_p05_activation_schedule_probe',
 phase,reason,stage,networkPaymentWrites:0,dbWrites:0,
 mayGrantBenefits:false,mayRecordPayment:false,mayCreatePaidPeriod:false,
 cycleVerified:false,periodStart:null,periodEnd:null,paidThrough:null,
 globalFinancialCoverage:false,
})
async function main(){
 let stage='state'
 try{
  const state=JSON.parse(readFileSync(join(homedir(),'AppData','Local',
   'PAZO-F16-E2E','sandbox-state.json'),'utf8'))
  if(state?.environment!=='sandbox'||state.phase!=='buyer_cancelled'||
    state.recoveryPhase!=='bound_verified'||!/^I-[A-Za-z0-9_-]{3,70}$/.test(state.subscriptionId||'')||
    state.plan!=='P-14V25407JP6850922NLHMDKI'||!state.intentId)
   throw Error('invalid_state')
  stage='configuration'
  const id=process.env.PAYPAL_SANDBOX_CLIENT_ID
  const secret=process.env.PAYPAL_SANDBOX_CLIENT_SECRET
  const eventId=process.env.PAZO_F16_ACTIVATION_WEBHOOK_EVENT_ID
  if(!id||!secret||!/^WH-[A-Za-z0-9_-]{3,70}$/.test(eventId||''))
   throw Error('invalid_configuration')
  stage='oauth'
  const oauth=await fetch(HOST+'/v1/oauth2/token',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
   headers:{Authorization:'Basic '+btoa(id+':'+secret),
    'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},
   body:'grant_type=client_credentials',
  })
  if(!oauth.ok)throw Error('oauth_failed')
  const auth=await oauth.json()
  if(auth?.token_type?.toLowerCase()!=='bearer'||
    typeof auth.access_token!=='string'||auth.access_token.length<8)
   throw Error('oauth_invalid')
  stage='activation_event_get'
  const response=await fetch(HOST+'/v1/notifications/webhooks-events/'+
   encodeURIComponent(eventId),{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{Authorization:'Bearer '+auth.access_token,Accept:'application/json'},
   })
  if(!response.ok)throw Error('event_get_failed')
  const event=await response.json()
  stage='activation_evidence_classification'
  const result=assessF16P05HistoricalActivation({state,event,eventId})
  console.log(JSON.stringify({...result,stage,networkPaymentWrites:0,dbWrites:0},null,2))
  if(['MISMATCH','BLOCKED'].includes(result.phase))process.exitCode=2
 }catch{
  console.log(JSON.stringify(safe('BLOCKED',stage+'_unavailable',stage),null,2))
  process.exitCode=2
 }
}
await main()
