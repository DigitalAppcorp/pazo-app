// PAZO F16-P18 — fail-closed exact-origin policy.
// Respond to OPTIONS before provider/payment runtime checks. Never authenticates
// a user or grants access. All POSTs still require server getUser verification.
const originOk=(raw)=>{
 if(typeof raw!=='string'||raw.length>253||raw.includes('*'))return false
 try{
  const p=new URL(raw)
  return p.protocol==='https:'&&p.origin===raw&&p.port===''&&
   p.username===''&&p.password===''&&p.pathname==='/'&&
   p.search===''&&p.hash===''&&
   /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(p.hostname)
 }catch{return false}
}
const deny=(status,code)=>new Response(JSON.stringify({
 ok:false,code,environment:'sandbox',
 paidThrough:null,mayGrantBenefits:false,mayCreateSubscription:false,
}),{status,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}})

export function resolvePazoAccountOriginGate(request,configuredOrigin){
 if(!(request instanceof Request))return{response:deny(400,'invalid_request')}
 if(!originOk(configuredOrigin))
  return{response:deny(503,'account_origin_not_configured')}
 if(request.headers.get('origin')!==configuredOrigin)
  return{response:deny(403,'origin_not_allowed')}
 const cors={'access-control-allow-origin':configuredOrigin,'vary':'Origin',
  'cache-control':'no-store','x-content-type-options':'nosniff'}
 if(request.method==='OPTIONS'){
  const requested=(request.headers.get('access-control-request-headers')||'')
   .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)
  if(request.headers.get('access-control-request-method')!=='POST'||
     requested.some(x=>!['authorization','content-type','apikey'].includes(x)))
   return{response:withCors(deny(403,'preflight_not_allowed'),cors)}
  return{response:new Response(null,{status:204,headers:{...cors,
   'access-control-allow-methods':'POST',
   'access-control-allow-headers':'authorization, content-type, apikey',
   'access-control-max-age':'600'}})}
 }
 return{cors}
}
export function withCors(response,cors){
 return new Response(response.body,{status:response.status,
  statusText:response.statusText,
  headers:{...Object.fromEntries(response.headers),...cors}})
}
