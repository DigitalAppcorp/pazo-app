// #169: server Auth and restricted Supabase RPC adapter for withdrawal.
// NOT deployed; only safe for a future Edge endpoint with release/identity
// reviews. This NEVER reads Meta CAPI tokens or calls Meta's Graph API.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const USERID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function createMetaWithdrawalProvider({
  url,anonKey,serviceKey,fetchImpl=fetch,
}={}) {
  if(url!==URL || typeof anonKey!=='string'||anonKey.length<15
    ||typeof serviceKey!=='string'||serviceKey.length<15
    ||typeof fetchImpl!=='function')throw Error('meta_withdraw_config_unavailable')
  return {
    authenticate:async jwt=>{
      if(typeof jwt!=='string'||jwt.length<12||jwt.length>4096)return null
      let res
      try{res=await fetchImpl(URL+'/auth/v1/user',{
        method:'GET',redirect:'error',cache:'no-store',
        signal:AbortSignal.timeout(6000),
        headers:{'apikey':anonKey,'authorization':'Bearer '+jwt,'accept':'application/json'},
      })}catch{return null}
      if(res?.status!==200)return null
      let user
      try{user=await res.json()}catch{return null}
      if(!user||typeof user.id!=='string'||!USERID.test(user.id)
        ||user.is_anonymous===true)return null
      return {id:user.id,is_anonymous:false}
    },
    withdraw:async ownerId=>{
      if(typeof ownerId!=='string'||!USERID.test(ownerId))return false
      let res
      try{res=await fetchImpl(URL+'/rest/v1/rpc/pazo_meta_withdraw_candidate',{
        method:'POST',redirect:'error',cache:'no-store',
        signal:AbortSignal.timeout(6000),
        headers:{'apikey':serviceKey,'authorization':'Bearer '+serviceKey,
          'content-type':'application/json','accept':'application/json'},
        body:JSON.stringify({p_owner:ownerId}),
      })}catch{return false}
      if(res?.status!==200)return false
      try{return await res.json()===true}catch{return false}
    },
  }
}
