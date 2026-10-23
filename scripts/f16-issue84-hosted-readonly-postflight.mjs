import assert from 'node:assert/strict'
const project='https://mrybvqdebbgcayuvgkkr.supabase.co',app='https://pazo-app.vercel.app'
// Supply the existing public browser key locally; never use a service key/session.
const publicKey=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY
assert.ok(publicKey,'Existing public browser key required')
assert.ok(!publicKey.startsWith('sb_secret_'),'Secret keys are forbidden')
if(publicKey.split('.').length===3){
 const claims=JSON.parse(Buffer.from(publicKey.split('.')[1],'base64url').toString())
 assert.equal(claims.role,'anon','Only public anon JWT keys are accepted')
}
const results=[]
async function check(name,url,options,accept){const response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});const text=await response.text();assert.ok(accept(response,text),name+': '+response.status);results.push({name,status:response.status})}
await check('official HTTPS current index',app+'/',{},(r,s)=>r.status===200&&s.includes('<div id="root">'))
await check('webhook existing read-only ready',project+'/functions/v1/pazo-paypal-live-webhook',{headers:{apikey:publicKey}},(r,s)=>{const j=JSON.parse(s);return r.status===200&&j.ready===true&&j.mayGrantBenefits===false})
for(const slug of ['pazo-paypal-live-checkout','pazo-admin-gradual-live']){
 await check(slug+' unauth GET denied',project+'/functions/v1/'+slug+(slug.endsWith('checkout')?'?locale=es':''),{headers:{origin:app,apikey:publicKey}},r=>r.status===(slug.endsWith('checkout')?401:405))
 await check(slug+' unauth empty POST denied',project+'/functions/v1/'+slug,{method:'POST',headers:{origin:app,apikey:publicKey,'content-type':'application/json'},body:'{}'},(r,s)=>[400,401,403].includes(r.status)&&!s.includes('approvalUrl'))
}
await check('private worker GET cannot dispatch',project+'/functions/v1/pazo-paypal-live-worker',{},r=>r.status===405)
await check('private worker invalid capability cannot dispatch',project+'/functions/v1/pazo-paypal-live-worker',{method:'POST',headers:{'content-type':'application/json'},body:'{"action":"health"}'},r=>r.status===403)
await check('anon cannot call service-only rollout RPC',project+'/rest/v1/rpc/pazo_f16_gradual_tick',{method:'POST',headers:{apikey:publicKey,'content-type':'application/json'},body:'{"p_webhook_ready":true}'},r=>[401,403,404].includes(r.status))
await check('anon cannot read owner campaign status',project+'/rest/v1/rpc/pazo_gradual_my_status',{method:'POST',headers:{apikey:publicKey,'content-type':'application/json'},body:'{}'},r=>[401,403,404].includes(r.status))
await check('maintenance remains readable',project+'/rest/v1/rpc/pazo_public_maintenance_status',{method:'POST',headers:{apikey:publicKey,'content-type':'application/json'},body:'{}'},(r,s)=>r.status===200&&JSON.parse(s).enabled===false)
console.log(JSON.stringify({scope:'hosted read-only and unauthenticated denials; zero valid financial requests',results},null,2))
