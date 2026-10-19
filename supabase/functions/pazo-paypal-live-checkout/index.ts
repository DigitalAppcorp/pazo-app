// PAZO Live subscription checkout — server-only, never enabled in this PR.
// Fully disabled until PRIVATE SQL stores + merchant generation + signature
// verification + period reconciliation have been deployed under PO gates.
import {createPazoLiveVerifiedCheckout} from './liveCheckoutCandidate.mjs'
const LIVE_CHECKOUT_RELEASED=false
Deno.serve(async(request:Request):Promise<Response>=>{
 if(!LIVE_CHECKOUT_RELEASED)return new Response(JSON.stringify({
  code:'live_checkout_not_released'}),{status:503,
  headers:{'content-type':'application/json','cache-control':'no-store'}})
 const checkout=createPazoLiveVerifiedCheckout()
 const result=await checkout.begin({request})
 return new Response(JSON.stringify({code:result.reason}),{status:503,
  headers:{'content-type':'application/json','cache-control':'no-store'}})
})
