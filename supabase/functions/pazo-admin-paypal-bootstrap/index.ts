// PAZO F16 — approved HOSTED-INERT merchant bootstrap shell.
// All LIVE merchant generation operations remain blocked until a separate PO GO.
// No secrets read, provider requests, SQL writes, money movement, or benefits.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
const RELEASE_APPROVED=false
Deno.serve((_request:Request)=>{
 // KEEP this endpoint fail-closed, even after JWT gateway validation.
 // The privileged generation factory lives in
 // pazo-admin-paypal-provision/liveMerchantBootstrapControl.mjs (staged).
 if(!RELEASE_APPROVED)return new Response(JSON.stringify({
  ok:false,code:'merchant_bootstrap_not_released',
  environment:'live',mayCharge:false,liveActivated:false
 }),{status:503,headers:{
  'content-type':'application/json','cache-control':'no-store'
 }})
 return new Response(JSON.stringify({
  ok:false,code:'merchant_bootstrap_security_gate_unavailable',
  mayCharge:false,liveActivated:false
 }),{status:503,headers:{
  'content-type':'application/json','cache-control':'no-store'
 }})
})
