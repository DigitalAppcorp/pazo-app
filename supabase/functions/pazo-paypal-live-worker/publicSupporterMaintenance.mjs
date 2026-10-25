// Existing authenticated private worker. Delivery and its ACK commit in SQL.
export function createPublicSupporterMaintenance({rpc,readWebhookReady}={}){
 return async({outcome})=>{
  let ready=false
  try{ready=await readWebhookReady()===true}catch{/* Block new CREATE; keep management. */}
  return rpc('publicSupporterTick',{p_webhook_ready:ready,p_financial_review:['review','unknown'].includes(outcome)})
 }
}
