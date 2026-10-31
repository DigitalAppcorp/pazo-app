// #169: EXPLICIT META GRANT HANDLER — NOT DEPLOYED.
// This is solely a server-backed, first verified-session purpose decision.
// Does not send a Meta event or permit a browser-provided owner/event ID.
import {readMarketingBody} from '../pazo-marketing-attribution/requestBody.mjs'
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOTICE='pazo-meta-conversions-v1'
const OFF=Object.freeze({status:'disabled'}),DENY=Object.freeze({status:'not_available'})
const respond=(body,status,origin=null)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store, private','vary':'Origin',
  ...(origin?{'access-control-allow-origin':origin}:{})}
})
export function createMetaGrantHandler({
 released=false,privacyReviewed=false,authenticate=null,grant=null,
 origin='https://pazo-app.vercel.app',
}={}) {
 return async function handle(request){
  if(released!==true||privacyReviewed!==true
    ||typeof authenticate!=='function'||typeof grant!=='function')
    return respond(OFF,503)
  if(request.headers.get('origin')!==origin)return respond(DENY,403)
  if(request.headers.get('sec-gpc')==='1')return respond(DENY,403,origin)
  if(request.method==='OPTIONS')return new Response(null,{status:204,
    headers:{'access-control-allow-origin':origin,'vary':'Origin',
      'access-control-allow-methods':'POST, OPTIONS',
      'access-control-allow-headers':'authorization,content-type,apikey,x-client-info',
      'access-control-max-age':'300','cache-control':'no-store'}})
  if(request.method!=='POST')return respond(DENY,405,origin)
  const contentType=(request.headers.get('content-type')||'').toLowerCase().trim()
  if(contentType!=='application/json'&&contentType!=='application/json; charset=utf-8')
    return respond(DENY,415,origin)
  const token=request.headers.get('authorization')||''
  if(!/^Bearer [A-Za-z0-9._~+=-]{12,4096}$/.test(token))
    return respond(DENY,401,origin)
  let raw
  try{raw=await readMarketingBody(request,80,3000)}
  catch{return respond(DENY,400,origin)}
  // Only an affirmative, explicit click tied to the exact notice version.
  // This is NOT called on session refresh or first-party analytics consent.
  if(raw!=='{"action":"grant","noticeVersion":"'+NOTICE+'"}')
    return respond(DENY,400,origin)
  let user
  try{user=await authenticate(token.slice(7))}
  catch{return respond(DENY,401,origin)}
  if(!user||typeof user.id!=='string'||!UUID.test(user.id)
     ||user.is_anonymous===true
     ||typeof user.email_confirmed_at!=='string'
     ||!Number.isFinite(Date.parse(user.email_confirmed_at)))
    return respond(DENY,403,origin)
  let saved=false
  try{saved=await grant(user.id,NOTICE,false)===true}
  catch{return respond(DENY,503,origin)}
  return saved?respond({status:'granted'},200,origin):respond(DENY,409,origin)
 }
}
