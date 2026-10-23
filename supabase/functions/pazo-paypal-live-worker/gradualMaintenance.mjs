// Invoked only after the existing private worker's authenticated lease completion.
// SQL owns durable event recovery and notification leases; no provider CREATE.
export function createGradualMaintenance({rpc,readWebhookReady}={}){
 return async({outcome})=>{
  let ready=false
  try{ready=await readWebhookReady()===true}catch{/* Fail closed only for new checkouts. */}
  await rpc('gradualTick',{p_webhook_ready:ready,p_financial_review:['review','unknown'].includes(outcome)})
  for(let index=0;index<10;index++){
   const notice=await rpc('gradualNoticeClaim',{})
   if(!notice)return
   if(typeof notice!=='object'||!notice.lease||!notice.owner||!notice.campaign||!['invitation','verified'].includes(notice.kind)||!Number.isSafeInteger(notice.version))throw Error('gradual_claim_unavailable')
   await rpc('gradualNoticeDeliver',{p_campaign:notice.campaign,p_owner:notice.owner,p_kind:notice.kind,p_version:notice.version,p_lease:notice.lease})
  }
 }
}
