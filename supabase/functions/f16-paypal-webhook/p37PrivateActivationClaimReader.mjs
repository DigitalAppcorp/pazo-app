// F16-P37: private read-only P40 activation under a live P21 claim.
// OFF BY DEFAULT; calls a PG17-only RPC that is NOT installed in Supabase.
// Do not import in browser, active Edge, cron or payment/benefit writer.
// The P40 binding is a DB reference, not independent signature attestation:
// trusted PayPal ingress + P42 signing must be separately deployed/verified.
const HOST='https://mrybvqdebbgcayuvgkkr.supabase.co'
const EVENT=/^[A-Za-z0-9._-]{3,128}$/
const SUB=/^I-[A-Za-z0-9_-]{3,70}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i
const EXPECTED=['id','type','processingState','subscriptionId','source','leaseCurrent']
const valid=o=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===EXPECTED.slice().sort().join('|')&&
 EVENT.test(o.id||'')&&o.type==='BILLING.SUBSCRIPTION.ACTIVATED'&&
 o.processingState==='processing'&&SUB.test(o.subscriptionId||'')&&
 o.source==='p40_inbox_binding_claim'&&o.leaseCurrent===true
export function createP37PrivateActivationClaimReader({
 enabled=false,projectUrl,serviceRoleKey,fetchImpl=fetch,
}={}){
 const ready=enabled===true&&projectUrl===HOST&&
  typeof serviceRoleKey==='string'&&
  serviceRoleKey.length>=24&&serviceRoleKey.length<=4096&&
  !/\s/.test(serviceRoleKey)&&typeof fetchImpl==='function'
 return Object.freeze({
  async readClaimedActivation({eventId,claimToken}={}){
   if(!ready||!EVENT.test(eventId||'')||!UUID.test(claimToken||''))return null
   const controller=new AbortController()
   const timeout=setTimeout(()=>controller.abort(),12000)
   try{
    const response=await fetchImpl(
     HOST+'/rest/v1/rpc/f16_p37_lab_read_claimed_activation',{
      method:'POST',redirect:'error',signal:controller.signal,
      headers:{apikey:serviceRoleKey,
       Authorization:'Bearer '+serviceRoleKey,
       Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify({p_event_id:eventId,p_claim_token:claimToken}),
     })
    if(!response?.ok)return null
    const data=await response.json()
    if(!valid(data)||data.id!==eventId)return null
    return Object.freeze({
     id:data.id,type:data.type,processingState:data.processingState,
     subscriptionId:data.subscriptionId,source:data.source,
     leaseCurrent:true,
    })
   }catch{return null}
   finally{clearTimeout(timeout)}
  },
 })
}
