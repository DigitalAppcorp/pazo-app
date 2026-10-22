// PAZO F16: PRIVATE intent persistence RPC adapter. Not deployable by itself:
// the required server-only SQL RPCs have NOT been installed in hosted Supabase.
// Does not accept caller-provided URLs or secrets from the browser.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const PLAN='P-14V25407JP6850922NLHMDKI'
const INTENT=/^intent-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
export function createF16IntentStore({
  projectUrl,serviceRoleKey,fetchImpl=fetch,uuid=()=>crypto.randomUUID(),
}={}) {
  if(projectUrl!==BASE||typeof serviceRoleKey!=='string'||
     serviceRoleKey.length<24||/\s/.test(serviceRoleKey)||
     typeof fetchImpl!=='function'||typeof uuid!=='function')
    throw Error('f16_intent_store_not_configured')
  async function rpc(name,payload){
    const response=await fetchImpl(BASE+'/rest/v1/rpc/'+name,{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
      headers:{'Content-Type':'application/json',Accept:'application/json',
        apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey},
      body:JSON.stringify(payload),
    })
    if(!response?.ok)throw Error('f16_private_rpc_unavailable')
    return response.json()
  }
  return {
    async createForVerifiedOwner(ownerId) {
      if(!UUID.test(ownerId||''))throw Error('invalid_verified_owner')
      const intentId='intent-'+uuid()
      if(!INTENT.test(intentId))throw Error('intent_rng_invalid')
      const created=await rpc('f16_paypal_create_private_intent',{
        p_owner_id:ownerId,p_intent_id:intentId,
      })
      if(created!==true)throw Error('private_intent_not_durable')
      return Object.freeze({id:intentId,ownerId,provider:'paypal',planId:PLAN,
        state:'pending',verifiedOwnerBinding:true})
    },
    async load(intentId) {
      if(!INTENT.test(intentId||''))throw Error('invalid_intent_id')
      const data=await rpc('f16_paypal_read_private_intent',{p_intent_id:intentId})
      if(!data)return null
      if(!INTENT.test(data.id||'')||data.id!==intentId||
         !UUID.test(data.owner_id||'')||data.plan_id!==PLAN||
         !['pending','bound'].includes(data.state)||
         (data.state==='bound'&&!SUB.test(data.external_subscription_id||'')))
        throw Error('untrusted_private_rpc_result')
      return Object.freeze({
        id:data.id,ownerId:data.owner_id,provider:'paypal',planId:PLAN,
        state:data.state,externalSubscriptionId:data.external_subscription_id??null,
      })
    },
    async bindVerified(binding){
      if(!binding||!UUID.test(binding.ownerId||'')||
         !INTENT.test(binding.intentId||'')||!SUB.test(binding.externalSubscriptionId||'')||
         binding.provider!=='paypal'||binding.planId!==PLAN)
        throw Error('invalid_verified_binding')
      const result=await rpc('f16_paypal_bind_private_intent',{
        p_intent_id:binding.intentId,p_owner_id:binding.ownerId,
        p_subscription_id:binding.externalSubscriptionId,p_plan_id:PLAN,
      })
      if(result!=='new_binding'&&result!=='already_bound')
        throw Error('private_binding_not_committed')
      return Object.freeze({state:'bound',result,entitlement:false})
    },
  }
}
