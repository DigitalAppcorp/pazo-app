// #169: PRE-RELEASE third-party sharing withdrawal contract.
// Intentionally not wired into PAZO or deployed. Granting consent is NOT
// implemented here: requires separate legal/UX approval and a verified
// first-registration flow. First-party analytics consent is never reused.
import {readMarketingBody} from '../pazo-marketing-attribution/requestBody.mjs'
const USERID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOOP=Object.freeze({status:'disabled'})
const DENIED=Object.freeze({status:'not_available'})
const response=(body,status,origin=null)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, private','vary':'Origin',
    ...(origin?{'access-control-allow-origin':origin}:{})}
})
export function createMetaWithdrawalHandler({
  released=false,authenticate=null,withdraw=null,
  origin='https://pazo-app.vercel.app',
}={}) {
  return async function handle(request) {
    if(released!==true||typeof authenticate!=='function'||typeof withdraw!=='function')
      return response(NOOP,503)
    if(request.headers.get('origin')!==origin) return response(DENIED,403)
    if(request.method==='OPTIONS')return new Response(null,{
      status:204,headers:{'access-control-allow-origin':origin,'vary':'Origin',
        'access-control-allow-methods':'POST, OPTIONS',
        'access-control-allow-headers':'authorization,content-type,apikey',
        'access-control-max-age':'300','cache-control':'no-store'}
    })
    if(request.method!=='POST')return response(DENIED,405,origin)
    const type=(request.headers.get('content-type')||'').toLowerCase().trim()
    if(type!=='application/json'&&type!=='application/json; charset=utf-8')
      return response(DENIED,415,origin)
    const bearer=request.headers.get('authorization')||''
    if(!/^Bearer [A-Za-z0-9._~+=-]{12,4096}$/.test(bearer))
      return response(DENIED,401,origin)
    let raw
    try{raw=await readMarketingBody(request,48,3000)}
    catch{return response(DENIED,400,origin)}
    // Accept only the exact opt-out action, without owner IDs or opt-in.
    // A JSON wrapper like {"action":"grant"} cannot change any preference.
    if(raw!=='{"action":"withdraw"}')return response(DENIED,400,origin)
    let user
    try{user=await authenticate(bearer.slice(7))}
    catch{return response(DENIED,401,origin)}
    if(!user||typeof user.id!=='string'||!USERID.test(user.id)
      ||user.is_anonymous===true)return response(DENIED,401,origin)
    // Server binds withdrawal to the Auth-verified user, not a client ID.
    // No GPC or analytics opt-in gate may prevent a withdrawal.
    let saved=false
    try{saved=await withdraw(user.id)===true}catch{}
    return saved?response({status:'withdrawn'},200,origin):response(DENIED,503,origin)
  }
}
