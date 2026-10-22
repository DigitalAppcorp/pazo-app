// F16 — Browser admin draft persistence. No provider calls, secret values,
// privileged impersonation or checkout activation. Caller supplies an actual
// authenticated Supabase client RPC, never a service-role key.
const response=(state,code,settings=null)=>Object.freeze({state,code,settings})
const ORIGIN=/^https:\/\/[a-z0-9][a-z0-9.-]{1,240}(:443)?$/
const PLAN=/^P-[A-Za-z0-9]{10,75}$/
const WH=/^[A-Za-z0-9_-]{8,100}$/
export function normalizePazoDraft({environment,price,planId,origin,webhookId}={}){
 if(!['sandbox','live'].includes(environment))return null
 if(typeof price!=='string'||!/^\d{1,4}(?:[.,]\d{1,2})?$/.test(price.trim()))return null
 const amount=Number(price.trim().replace(',','.'))
 const priceMinor=Math.round(amount*100)
 if(!Number.isSafeInteger(priceMinor)||priceMinor<99||priceMinor>100000)return null
 if([planId,origin,webhookId].some(v=>typeof v!=='string'))return null
 const plan=planId.trim(),webhook=webhookId.trim()
 if(plan&&!PLAN.test(plan))return null
 if(webhook&&!WH.test(webhook))return null
 let normalizedOrigin=origin.trim().toLowerCase()
 if(normalizedOrigin.endsWith('/'))normalizedOrigin=normalizedOrigin.slice(0,-1)
 if(normalizedOrigin && (!ORIGIN.test(normalizedOrigin)||
   normalizedOrigin.includes('..')||normalizedOrigin.includes('.local')||
   normalizedOrigin.includes('httphttp')))return null
 return Object.freeze({
  p_environment:environment,p_plan_id:plan,p_price_minor:priceMinor,
  p_return_origin:normalizedOrigin,p_webhook_id:webhook
 })
}
export async function savePazoAdminDraftWithReadback({draft,write,read}={}){
 if(!draft)return response('rejected','draft_invalid')
 if(typeof write!=='function'||typeof read!=='function')
  return response('rejected','backend_unavailable')
 let mutation
 try{mutation=await write(draft)}catch{return response('rejected','write_unavailable')}
 if(mutation?.error||mutation?.data!==true){
  const code=mutation?.error?.code
  // Only the provider's small status code is exposed, never raw SQL errors.
  return response('rejected',typeof code==='string'&&/^[A-Z0-9]{3,12}$/.test(code)
   ?'write_'+code:'write_rejected')
 }
 let refresh
 try{refresh=await read()}catch{return response('uncertain','readback_unavailable')}
 const configs=refresh?.data?.environments
 if(refresh?.error||!Array.isArray(configs))
  return response('uncertain','readback_unavailable')
 const stored=configs.find(x=>x.environment===draft.p_environment)
 if(!stored||stored.plan_id!==draft.p_plan_id||
    stored.return_origin!==draft.p_return_origin||
    stored.webhook_id!==draft.p_webhook_id||
    stored.price_minor!==draft.p_price_minor)
  return response('uncertain','stored_values_mismatch')
 return response('verified','saved_and_read_back',refresh.data)
}
