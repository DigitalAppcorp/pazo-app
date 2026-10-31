// #169: isolated server-only CAPI outbox repository, NOT deployed/imported.
// Privileged database RPCs exist ONLY in the disposable PG17 candidate.
// No browser input, matching field, secret or user identifier is logged.
// A matching-field reader is deliberately NOT provided: an approved privacy
// inventory and separate server-only implementation are mandatory.
const URL='https://mrybvqdebbgcayuvgkkr.supabase.co'
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HASH=/^[0-9a-f]{64}$/
const USER_AGENT=/^[\x20-\x7E]{20,512}$/
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
  const currentClaim=async(eventId,leaseId)=>{
    if(!UUID4.test(eventId)||!UUID4.test(leaseId))return null
    let rows
    try{rows=await rpc('pazo_meta_check_claim_candidate',{
      p_event:eventId,p_lease:leaseId,
    })}catch{return null}
    if(!Array.isArray(rows)||rows.length!==1)return null
    const p=rows[0],decidedAt=iso(p?.decided_at)
    if(!UUID.test(p?.owner_id)||p?.eligible!==true
      ||p?.purpose!=='meta_conversions_v1'
      ||p?.version!=='pazo-meta-conversions-v1'
      ||p?.decision!=='granted'||!decidedAt||p?.withdrawn_at!==null
      ||p?.gpc!==false||p?.sharing_opt_out!==false
      ||!secs(p?.event_time)||Date.parse(decidedAt)>Date.now())return null
    return {...p,decidedAt}
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
      // No matching field is touched during leasing. The coordinator
      // validates current privacy before requesting approved match data.
      return {kind:'retry',claimWasInserted:true,
        eventId:row.event_id,leaseId:row.lease_id,
        eventTime:secs(row.event_time)}
    },
    checkPrivacy:async(eventId,leaseId)=>{
      const p=await currentClaim(eventId,leaseId)
      if(!p)return null
      return {record:{
        purpose:p.purpose,version:p.version,decision:p.decision,
        decidedAt:p.decidedAt,withdrawnAt:null,revokedAt:null,
      },trusted:true,gpc:false,sharingOptOut:false,
      accountExcluded:false,qaOrAdmin:false,verifiedRegistration:true}
    },
    readApprovedMatchField:async(eventId,leaseId)=>{
      // Revalidate the same current lease AND consent before accessing any
      // matching data; a stale lease or opt-out cannot even trigger a read.
      const p=await currentClaim(eventId,leaseId)
      if(!p)return null
      let value=null
      try{value=await readApprovedMatchField(p.owner_id)}
      catch{return null}
      // The source of both identifiers requires separate review before release.
      // Never synthesize a UA from this server's own HTTP client.
      return value && typeof value==='object' && !Array.isArray(value)
        && typeof value.em==='string' && HASH.test(value.em)
        && typeof value.clientUserAgent==='string'
        && USER_AGENT.test(value.clientUserAgent)
        ?{em:value.em,clientUserAgent:value.clientUserAgent}:null
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
