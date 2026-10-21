// PAZO F16 — Global admission via a service-role-only PostgreSQL RPC.
// The RPC/its private counters are NOT installed on hosted PAZO (lab draft).
// Refuse all remote PayPal checks if this preflight is absent or unavailable.
const BASE='https://mrybvqdebbgcayuvgkkr.supabase.co'
const URL=BASE+'/rest/v1/rpc/f16_paypal_try_admit_global'
export function createF16GlobalAdmission({projectUrl,serviceRoleKey,fetchImpl=fetch}={}) {
 if(projectUrl!==BASE || typeof serviceRoleKey!=='string' ||
   serviceRoleKey.length<24 || /\s/.test(serviceRoleKey) ||
   typeof fetchImpl!=='function') throw Error('f16_global_admission_unconfigured')
 return Object.freeze({
  async tryAdmit() {
    const response=await fetchImpl(URL,{
      method:'POST',redirect:'error',signal:AbortSignal.timeout(3500),
      headers:{
        'content-type':'application/json',Accept:'application/json',
        apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey,
      },
      body:'{}',
    })
    if(response?.ok!==true)throw Error('f16_global_admission_unavailable')
    const value=await response.json()
    if(value!==true&&value!==false)throw Error('f16_global_admission_invalid_response')
    return value
  },
 })
}
