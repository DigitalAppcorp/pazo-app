// #169: prepared, inactive Supabase client transport for explicit Meta consent.
// NOT imported by the PAZO runtime or rendered by the signup flow.
// Deliberate UI opt-in and the independent privacy release must be reviewed.
// Supabase Auth/Edge remains authoritative; browser checks are vetoes only.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EVENT=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATASET='1438916858347709'
const NOTICE='pazo-meta-conversions-v1'
const GRANT='pazo-meta-grant'
const RECEIPT='pazo-meta-receipt'

export function createMetaConsentTransport({
  released=false,privacyApproved=false,supabaseClient=null,
  getSessionSnapshot=()=>null,stillPermitted=()=>false,browser=null,
}={}) {
  // No Supabase or privacy access until the separate release is approved.
  if(released!==true||privacyApproved!==true
     ||typeof supabaseClient?.functions?.invoke!=='function'
     ||typeof getSessionSnapshot!=='function'
     ||typeof stillPermitted!=='function')return null
  const eligible=accessToken=>{
    try{
      const auth=getSessionSnapshot()
      return typeof accessToken==='string'&&accessToken.length>=12
        && typeof auth?.id==='string'&&UUID.test(auth.id)
        && auth.accessToken===accessToken
        && browser?.navigator?.globalPrivacyControl!==true
        && stillPermitted()===true
    }catch{return false}
  }
  const call=async(name,accessToken,body)=>{
    if(!eligible(accessToken))return null
    let result
    try {
      // Explicit JWT pinning: never let a refreshed or switched Supabase
      // client session substitute another account's Authorization token.
      result=await supabaseClient.functions.invoke(name,{
        method:'POST',headers:{Authorization:'Bearer '+accessToken},
        body,
      })
    }catch{return null}
    if(!eligible(accessToken)||result?.error||!result?.data
       ||typeof result.data!=='object')return null
    return result.data
  }
  return Object.freeze({
    requestGrant:async({accessToken,body}={})=>{
      if(body?.action!=='grant'||body?.noticeVersion!==NOTICE
         ||Object.keys(body).length!==2)return {status:'not_available'}
      const data=await call(GRANT,accessToken,{
        action:'grant',noticeVersion:NOTICE,
      })
      return {status:data?.status==='granted'?'granted':'not_available'}
    },
    requestReceipt:async({accessToken,body}={})=>{
      if(!body||Object.keys(body).length!==0)
        return {status:'not_available'}
      const data=await call(RECEIPT,accessToken,{})
      if(data?.status!=='verified'||data.eventName!=='CompleteRegistration'
         ||typeof data.eventId!=='string'||!EVENT.test(data.eventId)
         ||data.datasetId!==DATASET)return {status:'not_available'}
      return Object.freeze({status:'verified',eventName:'CompleteRegistration',
        eventId:data.eventId,datasetId:DATASET})
    },
  })
}
