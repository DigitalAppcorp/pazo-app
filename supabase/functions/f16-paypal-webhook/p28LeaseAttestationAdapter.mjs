// PAZO P28: service-only read adapter for the P21 fenced claim RPC.
// Pure dependency injection: NO client/browser access, no PayPal calls.
// Hosted implementation is not enabled or deployed by this module.
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/
export function createP28LeaseAttestationAdapter({callServiceRpc}={}){
 if(typeof callServiceRpc!=='function')throw Error('service_rpc_required')
 return async({eventId,claimToken}={})=>{
  if(typeof eventId!=='string'||!EVENT.test(eventId)||
     typeof claimToken!=='string'||!UUID.test(claimToken))return null
  let proof
  try{proof=await callServiceRpc('f16_p05_draft_read_claimed_event',{
   p_event_id:eventId,p_claim_token:claimToken})}
  catch{return null}
  // The P21 RPC itself enforces worker gate, cutoff, token, processing
  // state and expiry. A non-null result is not a payment confirmation.
  if(!proof||typeof proof!=='object'||Array.isArray(proof)||
     proof.id!==eventId||proof.type!=='PAYMENT.SALE.COMPLETED'||
     proof.processingState!=='processing'||
     typeof proof.verifiedAt!=='string'||!ISO.test(proof.verifiedAt)||
     !Number.isFinite(Date.parse(proof.verifiedAt)))return null
  return Object.freeze({id:eventId,type:proof.type,
   processingState:'processing',verifiedAt:proof.verifiedAt,
   liveLease:true,prospective:true})
 }
}
