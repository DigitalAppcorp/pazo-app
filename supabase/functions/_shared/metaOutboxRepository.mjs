// #169: isolated server-only CAPI outbox repository, NOT deployed/imported.
// Privileged database RPCs exist ONLY in the disposable PG17 candidate.
// No browser input, matching field, secret or user identifier is logged.
// A matching-field reader is deliberately NOT provided: an approved privacy
// inventory and separate server-only implementation are mandatory.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HASH=/^[0-9a-f]{64}$/
const STATUSES=new Set(['sent','retryable','suppressed'])
const iso=value=>{
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return null
  return new Date(value).toISOString()
}
const secs=value=>{
  const date=iso(value)
  return date?Math.floor(Date.parse(date)/1000):null
}

export function createMetaOutboxRepository({
  enabled=false,privacyApproved=false,matchFieldsApproved=false,
  url=null,serviceKey=null,readApprovedMatchField=null,fetchImpl=fetch,
}={}) {
  if(enabled!==true||privacyApproved!==true||matchFieldsApproved!==true)
    return null
  if(url!==URL||typeof serviceKey!=='string'||serviceKey.length<24
    ||typeof readApprovedMatchField!=='function'||typeof fetchImpl!=='function')
    return null
  const rpc=async(name,body)=>{
    const response=await fetchImpl(URL+'/rest/v1/rpc/'+name,{
      method:'POST',redirect:'error',cache:'no-store',
      signal:AbortSignal.timeout(6000),
      headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,
        'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(body),
    })
    if(response?.status!==200)throw Error('meta_rpc_unavailable')
    return response.json()
  }
  return Object.freeze({
    leaseOne:async()=>{
      let rows
      try{rows=await rpc('pazo_meta_lease_candidate',{})}
      catch{return null}
      if(!Array.isArray(rows)||rows.length!==1)return null
      const row=rows[0]
      if(!UUID.test(row?.owner_id)||!UUID4.test(row?.event_id)
         ||!UUID4.test(row?.lease_id)||!secs(row?.event_time))return null
      let hashedEmail=null
      try{hashedEmail=await readApprovedMatchField(row.owner_id)}
      catch{/* omit match field, fail closed; worker returns retryable */}
      if(typeof hashedEmail!=='string'||!HASH.test(hashedEmail))
        hashedEmail=null
      return {kind:'retry',claimWasInserted:true,
        eventId:row.event_id,leaseId:row.lease_id,
        eventTime:secs(row.event_time),hashedEmail}
    },
    checkPrivacy:async(eventId,leaseId)=>{
      if(!UUID4.test(eventId)||!UUID4.test(leaseId))return null
      let rows
      try{rows=await rpc('pazo_meta_check_claim_candidate',{
        p_event:eventId,p_lease:leaseId,
      })}catch{return null}
      if(!Array.isArray(rows)||rows.length!==1)return null
      const p=rows[0]
      const decidedAt=iso(p?.decided_at)
      const withdrawnAt=p?.withdrawn_at===null?null:iso(p?.withdrawn_at)
      if(!UUID.test(p?.owner_id)||p?.eligible!==true
        ||p?.purpose!=='meta_conversions_v1'
        ||p?.version!=='pazo-meta-conversions-v1'
        ||p?.decision!=='granted'||!decidedAt||p?.withdrawn_at!==null
        ||p?.gpc!==false||p?.sharing_opt_out!==false
        ||!secs(p?.event_time))return null
      return {record:{
        purpose:p.purpose,version:p.version,decision:p.decision,
        decidedAt,withdrawnAt,revokedAt:null,
      },trusted:true,gpc:false,sharingOptOut:false,
      accountExcluded:false,qaOrAdmin:false,verifiedRegistration:true}
    },
    settle:async(eventId,leaseId,status)=>{
      if(!UUID4.test(eventId)||!UUID4.test(leaseId)
        ||!STATUSES.has(status))return false
      try{return await rpc('pazo_meta_settle_candidate',{
        p_event:eventId,p_lease:leaseId,p_status:status,
      })===true}catch{return false}
    },
  })
}
