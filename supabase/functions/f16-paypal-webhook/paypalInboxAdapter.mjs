// F16 draft durable inbox adapter. NOT deployed: required RPC migration is NOT applied.
// The private table must be accessed only by a restrictive service-role-only RPC.
// No credit, no membership, no is_founder or profile writes.
const EXPECTED_BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const RPC=EXPECTED_BASE+'/rest/v1/rpc/f16_paypal_record_verified_event'
export function createPaypalVerifiedEventInbox({projectUrl,serviceRoleKey,fetchImpl=fetch}={}) {
  if(projectUrl!==EXPECTED_BASE || typeof serviceRoleKey!=='string' ||
      serviceRoleKey.length<24 || /\s/.test(serviceRoleKey) ||
      typeof fetchImpl!=='function') throw Error('paypal_inbox_not_configured')
  return {
    async insertIfAbsent(item) {
      if(item?.provider!=='paypal' ||
          typeof item.eventId!=='string' || !/^[A-Za-z0-9._-]{1,128}$/.test(item.eventId) ||
          typeof item.eventType!=='string' || !/^[A-Z0-9._]{1,128}$/.test(item.eventType))
        throw Error('invalid_verified_event_reference')
      // Static URL: never send server API keys to a host from a webhook or client.
      const response=await fetchImpl(RPC,{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
        headers:{
          'Content-Type':'application/json',
          Accept:'application/json',
          apikey:serviceRoleKey,
          Authorization:'Bearer '+serviceRoleKey,
        },
        body:JSON.stringify({
          p_provider_event_id:item.eventId,
          p_event_type:item.eventType,
        }),
      })
      if(!response?.ok) throw Error('durable_event_inbox_unavailable')
      const data=await response.json()
      if(data!==true && data!==false) throw Error('invalid_inbox_rpc_result')
      return data
    },
  }
}
