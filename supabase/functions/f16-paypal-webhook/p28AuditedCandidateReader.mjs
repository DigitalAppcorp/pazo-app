// F16-P28 offline historical review coordinator. No hosted deployment.
// A durable *nonfinancial* audit acknowledgment MUST precede the private read.
// Never log raw event IDs, owner IDs, tokens or PayPal payloads.
export function createP28AuditedCandidateReader({recordAudit,readCandidate}={}){
 return async ({eventId,requestId}={})=>{
  if(typeof recordAudit!=='function'||typeof readCandidate!=='function')return null
  if(typeof eventId!=='string'||!/^[A-Za-z0-9._-]{3,128}$/.test(eventId)||
    typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))
   return null
  // Audit must be provided by a separately authorized, durably stored service.
  // Do not confuse console logs or request UUIDs with a persisted audit trail.
  try{
   const audit=await recordAudit(Object.freeze({requestId,action:'historical_candidate_exact_read'}))
   if(audit?.persisted!==true||audit?.requestId!==requestId)return null
   return await readCandidate({eventId,requestId})
  }catch{return null}
 }
}
