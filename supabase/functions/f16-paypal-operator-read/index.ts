// PAZO F16-P28 — independent, disabled-by-default operator merchant reader.
// NOT deployed by this commit. Does NOT serve checkout, worker or ledger.
import {createP28OperatorMerchantRead} from '../f16-paypal-webhook/p28OperatorMerchantReadGate.mjs'
import {createP28HostedLeaseReader} from '../f16-paypal-webhook/p28HostedLeaseReader.mjs'
import {createP28PrivateBindingReader} from '../f16-paypal-webhook/p28PrivateBindingReader.mjs'
import {createP05SandboxClaimScopedMerchantReaders} from '../f16-paypal-webhook/p05SandboxClaimScopedMerchantReaders.mjs'
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const env=(name:string)=>Deno.env.get(name)
Deno.serve((request:Request)=>{
 // This must require deliberate audited release AND a fresh separate approval.
 // A deployed disabled version must never make a provider or DB request.
 const enabled=false
 if(!enabled)return new Response(JSON.stringify({
  code:'merchant_read_disabled',environment:'sandbox',mayRecordPayment:false,
  mayGrantBenefits:false,paidThrough:null
 }),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}})
 const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY')
 const readLeasedEvent=createP28HostedLeaseReader({
  projectUrl:BASE,serviceRoleKey:serviceKey,scope:'SERVER_ONLY_READ_GATE'
 })
 const merchantReader=createP05SandboxClaimScopedMerchantReaders({
  clientId:env('PAZO_F16_PAYPAL_CLIENT_ID'),
  clientSecret:env('PAZO_F16_PAYPAL_CLIENT_SECRET'),
  readClaimedEvent:readLeasedEvent
 })
 return createP28OperatorMerchantRead({
  enabled,operatorKey:env('PAZO_F16_OPERATOR_READ_KEY'),
  readLeasedEvent,merchantReader,
  resolvePrivateBinding:createP28PrivateBindingReader({
   projectUrl:BASE,serviceRoleKey:serviceKey,scope:'SERVER_ONLY_READ_GATE'
  })
 })(request)
})
