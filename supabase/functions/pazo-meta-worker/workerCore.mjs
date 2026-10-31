// #169 — service-only worker HTTP boundary. NOT DEPLOYED OR WIRED.
// A browser/user session MUST NOT be able to invoke the Meta CAPI worker.
// Injected run() MUST in turn perform live, lease-bound privacy checks.
const reply=(status,code)=>new Response(JSON.stringify({status}),{
  status:code,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, private',
    'x-content-type-options':'nosniff',
  },
})
export function createMetaWorkerHandler({
  released=false,privacyReviewed=false,matchFieldsApproved=false,
  providerApproved=false,authenticate=null,run=null,
}={}) {
  return async function handle(request) {
    // Hard fail CLOSED before touching HTTP, secrets, DB, or Meta.
    if(released!==true||privacyReviewed!==true
       ||matchFieldsApproved!==true||providerApproved!==true
       ||typeof authenticate!=='function'||typeof run!=='function')
      return reply('disabled',503)
    // No CORS; same-origin browser credentials are never appropriate here.
    // A POST with an Origin or user-provided body is not a worker request.
    if(request.method!=='POST')return reply('not_available',405)
    if(request.headers.has('origin')||request.headers.has('cookie'))
      return reply('not_available',403)
    const length=request.headers.get('content-length')
    if(length!==null&&length!=='0')return reply('not_available',400)
    const token=request.headers.get('authorization')||''
    if(!/^Bearer [A-Za-z0-9_~.\-]{32,256}$/.test(token))
      return reply('not_available',401)
    // Require strictly empty request body; never accept owner/event/consent.
    try {
      const body=await request.text()
      if(body!=='')return reply('not_available',400)
    }catch{return reply('not_available',400)}
    let allowed=false
    try{allowed=await authenticate(token.slice(7))===true}
    catch{return reply('not_available',401)}
    if(!allowed)return reply('not_available',401)
    let result
    try{result=await run()}
    catch{return reply('unavailable',503)}
    // Server responses never contain event IDs, token values, PII, or claims.
    switch(result?.status){
      case 'accepted':return reply('accepted',200)
      case 'disabled':return reply('disabled',503)
      case 'not_eligible':return reply('not_eligible',200)
      case 'not_configured':return reply('not_configured',503)
      case 'suppressed':return reply('suppressed',200)
      default:return reply('unavailable',503)
    }
  }
}
