// Server-only RPC adapter for synthetic tests and a future Edge deployment.
export function createExperienceSubmit({url,serviceKey,fetchImpl=fetch}={}){
 const expected='https://mrybvqdebbgcayuvgkkr.supabase.co'
 if(url!==expected||typeof serviceKey!=='string'||serviceKey.length<15)throw Error('experience_config_unavailable')
 return async signal=>{
  const response=await fetchImpl(expected+'/rest/v1/rpc/pazo_intelligence_experience_v1',{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
   headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},body:JSON.stringify({p_signal:signal}),
  })
  return response.status===200&&(await response.json())===true
 }
}
// Source contains NO credentials. Never instantiate while release gate OFF.
export function createMarketingLandingSubmit({url,serviceKey,fetchImpl=fetch}={}){
  const expected='https://mrybvqdebbgcayuvgkkr.supabase.co'
  if(url!==expected||typeof serviceKey!=='string'||serviceKey.length<15)
    throw Error('marketing_landing_config_unavailable')
  return async(creative)=>{
    const resp=await fetchImpl(expected+'/rest/v1/rpc/pazo_marketing_record_landing_v1',{
      method:'POST',redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(8000),
      headers:{'apikey':serviceKey,'authorization':'Bearer '+serviceKey,
        'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({p_creative:creative}),
    })
    if(resp.status!==200)return false
    return (await resp.json())===true
  }
}

export function createMarketingChallengeClaim({url,serviceKey,fetchImpl=fetch}={}){
 const expected='https://mrybvqdebbgcayuvgkkr.supabase.co'
 if(url!==expected||typeof serviceKey!=='string'||serviceKey.length<15)throw Error('marketing_replay_not_configured')
 return async digest=>{
  if(typeof digest!=='string'||! /^[a-f0-9]{64}$/.test(digest))return false
  try{
   const response=await fetchImpl(expected+'/rest/v1/rpc/pazo_marketing_claim_challenge_v1',{
    method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
    headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({p_digest:digest}),
   })
   return response.status===200&&(await response.json())===true
  }catch{return false}
 }
}

export function createMarketingPreregSubmit({url,serviceKey,fetchImpl=fetch}={}){
 const expected='https://mrybvqdebbgcayuvgkkr.supabase.co'
 if(url!==expected||typeof serviceKey!=='string'||serviceKey.length<15)throw Error('prereg_config_unavailable')
 return async(creative,step)=>{
  const response=await fetchImpl(expected+'/rest/v1/rpc/pazo_marketing_prereg_signal_v1',{
   method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),
   headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,'content-type':'application/json'},
   body:JSON.stringify({p_creative:creative,p_step:step}),
  })
  return response.status===200&&(await response.json())===true
 }
}
