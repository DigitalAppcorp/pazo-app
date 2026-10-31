import {readMarketingBody} from '../pazo-marketing-attribution/requestBody.mjs'
import {persistAuthenticatedMetaGpc} from '../_shared/metaGpcOverride.mjs'
// #169: SERVER-ATTESTED BROWSER RECEIPT CANDIDATE — NOT DEPLOYED.
// This service never talks to Meta and must not be activated before full
// privacy review, server-only lookup and separate production GO.
// No browser-provided consent, user_id, event_id or UTM is accepted.
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATASET=/^[1-9][0-9]{5,24}$/
const USERID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OFF=Object.freeze({status:'disabled'})
const DENIED=Object.freeze({status:'not_available'})
const reply=(body,status,origin=null)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, private','vary':'Origin',
    ...(origin?{'access-control-allow-origin':origin}:{})}
})
export function createMetaReceiptHandler({
  released=false,privacyReviewed=false,authenticate=null,
  lookupReceipt=null,persistGpc=null,now=()=>Date.now(),
  origin='https://pazo-app.vercel.app',
}={}) {
  return async function handle(request) {
    // Disabled by default BEFORE reading or parsing incoming credentials.
    if(released!==true||privacyReviewed!==true
      ||typeof authenticate!=='function'||typeof lookupReceipt!=='function')
      return reply(OFF,503)
    if(request.headers.get('origin')!==origin) return reply(DENIED,403)
    if(request.method==='OPTIONS')return new Response(null,{
      status:204,headers:{'access-control-allow-origin':origin,'vary':'Origin',
      'access-control-allow-methods':'POST, OPTIONS',
      'access-control-allow-headers':'authorization,content-type,apikey,x-client-info',
      'access-control-max-age':'300','cache-control':'no-store'}
    })
    if(request.method!=='POST')return reply(DENIED,405,origin)
    const type=(request.headers.get('content-type')||'').toLowerCase().trim()
    if(type!=='application/json'&&type!=='application/json; charset=utf-8')
      return reply(DENIED,415,origin)
    if(Number(request.headers.get('content-length')||0)>2)return reply(DENIED,413,origin)
    const token=request.headers.get('authorization')||''
    if(!/^Bearer [A-Za-z0-9._~+=-]{12,4096}$/.test(token))return reply(DENIED,401,origin)
    if(request.headers.get('sec-gpc')==='1'){
      // Atomic server-side suppression must precede any receipt lookup.
      if(typeof persistGpc!=='function')return reply(DENIED,403,origin)
      const result=await persistAuthenticatedMetaGpc({
        request,authenticate,withdraw:persistGpc,
      })
      return reply(DENIED,result==='persisted'?403:
        result==='unauthorized'?401:503,origin)
    }
    let raw
    try {raw=await readMarketingBody(request,2,3000)}
    catch {return reply(DENIED,400,origin)}
    if(raw!=='{}')return reply(DENIED,400,origin)
    let owner
    try{owner=await authenticate(token.slice(7))}catch{return reply(DENIED,401,origin)}
    if(!owner||!USERID.test(owner.id)||owner.is_anonymous===true
      ||typeof owner.email_confirmed_at!=='string'
      ||!Number.isFinite(Date.parse(owner.email_confirmed_at)))
      return reply(DENIED,403,origin)
    // Trusted server lookup MUST join durable outbox, purpose consent, live QA
    // exclusion and ownership, verifying the session user as the only owner.
    let result
    try{result=await lookupReceipt(owner.id)}catch{return reply(DENIED,503,origin)}
    const stamp=now()
    if(!result||result.authorized!==true||result.ownerId!==owner.id
      ||result.verifiedRegistration!==true||result.excluded!==false
      ||result.gpc!==false||result.sharingOptOut!==false
      ||result.withdrawn!==false||result.metaReleaseEnabled!==true
      ||typeof result.eventId!=='string'||!UUID4.test(result.eventId)
      ||typeof result.datasetId!=='string'||!DATASET.test(result.datasetId)
      ||!Number.isSafeInteger(stamp)||!Number.isSafeInteger(result.eventTime)
      ||stamp/1000-result.eventTime>7*24*3600||result.eventTime*1000>stamp+300000)
      return reply(DENIED,404,origin)
    return reply({status:'verified',eventName:'CompleteRegistration',
      eventId:result.eventId,datasetId:result.datasetId},200,origin)
  }
}
