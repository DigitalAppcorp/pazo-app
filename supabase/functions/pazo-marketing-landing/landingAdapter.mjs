// Server-only RPC adapter for synthetic tests and a future Edge deployment.
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
