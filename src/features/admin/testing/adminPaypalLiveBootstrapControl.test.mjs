import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveMerchantBootstrapControl}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveMerchantBootstrapControl.mjs'
import {createPazoAdminLiveDraftReader}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveAdminDraftReader.mjs'
import {liveWebhookUrlForGeneration}
 from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const origin='https://mrybvqdebbgcayuvgkkr.supabase.co'
const url=origin+'/functions/v1/pazo-admin-paypal-bootstrap'
const actor='12345678-1234-4234-8234-123456789abc'
const planId='P-9BR88240215654528NLL3I4I'
const bearer='Bearer e30.e30.signature'
const makeRequest=(data={action:'reserve_generation',
 confirmation:'RESERVAR GENERACION LIVE'})=>new Request(url,{
 method:'POST',headers:{authorization:bearer,'content-type':'application/json'},
 body:JSON.stringify(data)
})
const settings=()=>({
 active_environment:'sandbox',live_checkout_enabled:false,
 environments:[
  {environment:'sandbox'},
  {environment:'live',plan_id:planId,return_origin:'https://pazo-app.vercel.app',
   price_minor:299,currency:'USD',interval_unit:'MONTH',webhook_id:''}
 ]
})
test('disabled bootstrap cannot read secrets, authenticate, or write reservations',async()=>{
 let count=0
 const handler=createPazoLiveMerchantBootstrapControl({
  authenticateAdmin:()=>{count++;throw Error('should not authenticate')},
  readAdminSettings:()=>{count++;throw Error('should not read')},
  reserveGeneration:()=>{count++;throw Error('should not reserve')}
 })
 const result=await handler(makeRequest())
 assert.equal(result.status,503)
 assert.equal((await result.json()).code,'merchant_bootstrap_not_released')
 assert.equal(count,0)
})
test('JWT/MFA verified owner receives only DB generation and public webhook URL',async()=>{
 const calls=[]
 const handler=createPazoLiveMerchantBootstrapControl({
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readAdminSettings:async x=>{calls.push(['read',x.actorId]);return settings()},
  reserveGeneration:async x=>{
   calls.push(['reserve',x.actorId,x.planId])
   return {generation:17,planId,environment:'live',mayCharge:false}
  }
 })
 const res=await handler(makeRequest())
 const data=await res.json()
 assert.equal(res.status,202)
 assert.equal(data.generation,17)
 assert.equal(data.webhookUrl,liveWebhookUrlForGeneration(17))
 assert.equal(data.credentialsProvisioned,false)
 assert.equal(data.liveActivated,false)
 assert.equal(data.mayCharge,false)
 assert.deepEqual(calls,[['read',actor],['reserve',actor,planId]])
 assert.equal(JSON.stringify(data).includes('SECRET'),false)
})
test('tampering with browser plan, insufficient MFA, or live switch prevents reservation',async()=>{
 let writes=0
 const handler=createPazoLiveMerchantBootstrapControl({
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readAdminSettings:async()=>settings(),reserveGeneration:async()=>{
   writes++;throw Error('not authorized')
  }
 })
 const bad=await handler(makeRequest({action:'reserve_generation',
  confirmation:'RESERVAR GENERACION LIVE',planId:'P-ATTACKER123456789'}))
 assert.equal(bad.status,400)
 assert.equal(writes,0)
 const unverified=createPazoLiveMerchantBootstrapControl({
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:false}),
  readAdminSettings:async()=>{throw Error('admin unverified read')},
  reserveGeneration:async()=>{throw Error('admin unverified reserve')}
 })
 assert.equal((await unverified(makeRequest())).status,403)
 const active=createPazoLiveMerchantBootstrapControl({
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readAdminSettings:async()=>({...settings(),live_checkout_enabled:true}),
  reserveGeneration:async()=>{writes++}
 })
 assert.equal((await active(makeRequest())).status,409)
 assert.equal(writes,0)
})
test('unknown reservation outcome never invents a number or silently retries',async()=>{
 let calls=0
 const handler=createPazoLiveMerchantBootstrapControl({
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readAdminSettings:async()=>settings(),reserveGeneration:async()=>{
   calls++;throw Error('TRANSIENT_SENSITIVE_BACKEND_EXCEPTION')
  }
 })
 const res=await handler(makeRequest())
 assert.equal(res.status,503)
 const body=await res.text()
 assert.match(body,/generation_outcome_needs_review/)
 assert.doesNotMatch(body,/SENSITIVE|generation":\d+/)
 assert.equal(calls,1)
})
test('authenticated settings reader sends only same bearer and drops secret fields',async()=>{
 const calls=[]
 const reader=createPazoAdminLiveDraftReader({
  supabaseUrl:origin,publishableKey:'PUBLIC_KEY_TEST_ONLY_VALID_123456',
  fetchImpl:async(dest,options)=>{
   calls.push({dest,options})
   return new Response(JSON.stringify({...settings(),
    client_secret:'DO_NOT_RETURN_PRIVATE_SECRET',
    environments:settings().environments.map(x=>({
     ...x,client_secret:'DO_NOT_RETURN_PRIVATE_SECRET'
    }))
   }),{status:200,headers:{'content-type':'application/json'}})
  }
 })
 const result=await reader({request:makeRequest()})
 assert.equal(result.environments[1].plan_id,planId)
 assert.ok(!JSON.stringify(result).includes('DO_NOT_RETURN'))
 assert.equal(calls[0].dest,origin+'/rest/v1/rpc/pazo_admin_paypal_settings')
 assert.equal(calls[0].options.headers.Authorization,bearer)
 assert.equal(calls[0].options.method,'POST')
})
test('only merchant reserve has release flag on; PayPal credential provisioning remains OFF',()=>{
 const staged=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-bootstrap/index.ts',import.meta.url),'utf8')
 const active=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-provision/index.ts',import.meta.url),'utf8')
 assert.match(staged,/const RELEASE_APPROVED=true/)
 assert.match(active,/const RELEASE_APPROVED=false/)
 assert.doesNotMatch(staged,/createPaypalLiveMerchantBootstrap\(/)
})

test('exact-origin CORS admits the local admin preview but not unapproved sites',async()=>{
 const handler=createPazoLiveMerchantBootstrapControl({
  released:true,
  authenticateAdmin:async()=>null,
  readAdminSettings:async()=>{throw Error('not reachable')},
  reserveGeneration:async()=>{throw Error('not reachable')}
 })
 const options=origin=>new Request(url,{method:'OPTIONS',headers:{
  origin,'access-control-request-method':'POST'
 }})
 const ok=await handler(options('http://localhost:5173'))
 assert.equal(ok.status,204)
 assert.equal(ok.headers.get('access-control-allow-origin'),'http://localhost:5173')
 assert.match(ok.headers.get('access-control-allow-headers'),/authorization/)
 const invalid=await handler(options('https://evil.invalid'))
 assert.equal(invalid.status,403)
 assert.equal(invalid.headers.get('access-control-allow-origin'),null)
 const blocked=await createPazoLiveMerchantBootstrapControl()(options('http://localhost:5173'))
 assert.equal(blocked.status,503)
})

test('PO-operated UI shown only when merchant reservation endpoint is approved',()=>{
 const view=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
 const component=readFileSync(new URL('../components/AdminPaypalMerchantBootstrap.tsx',import.meta.url),'utf8')
 assert.match(view,/const LIVE_MERCHANT_BOOTSTRAP_RELEASED=true/)
 assert.match(view,/<AdminPaypalMerchantBootstrap/)
 assert.match(view,/setRecentAdminMfa\(true\)/)
 assert.match(component,/mfaRecentlyVerified/)
 assert.match(component,/const \[state,setState\]=useState/)
 assert.match(component,/supabase.functions.invoke\('pazo-admin-paypal-bootstrap'/)
 assert.match(component,/const urlPrefix=/)
 assert.match(component,/webhook!==urlPrefix\+g/)
 assert.match(component,/No vuelvas a pulsar el botón/)
 assert.doesNotMatch(component,/clientSecret|service_role|navigator.clipboard/)
})

test('Supabase routed URLs pass CORS preflight without bypassing administrator verification',async()=>{
 let reads=0
 const handler=createPazoLiveMerchantBootstrapControl({
  released:true,
  authenticateAdmin:async()=>{reads++;return {isAdmin:false}},
  readAdminSettings:async()=>{throw Error('read must not run')},
  reserveGeneration:async()=>{throw Error('write must not run')}
 })
 const preflight=(endpoint,requestedMethod='POST')=>new Request(endpoint,{
  method:'OPTIONS',headers:{origin:'http://localhost:5173',
   'access-control-request-method':requestedMethod,
   'access-control-request-headers':'authorization,apikey,content-type,x-client-info,x-supabase-client-runtime'}
 })
 for(const endpoint of [
  'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-bootstrap',
  'http://edge-runtime.internal/pazo-admin-paypal-bootstrap'
 ]){
  const res=await handler(preflight(endpoint))
  assert.equal(res.status,204)
  assert.equal(res.headers.get('access-control-allow-origin'),'http://localhost:5173')
  assert.match(res.headers.get('access-control-allow-headers'),/x-supabase-client-runtime/)
 }
 assert.equal(reads,0)
 const routed=await handler(new Request('http://edge-runtime.internal/pazo-admin-paypal-bootstrap',{
  method:'POST',headers:{origin:'http://localhost:5173',
   authorization:bearer,'content-type':'application/json'},
  body:JSON.stringify({action:'reserve_generation',confirmation:'RESERVAR GENERACION LIVE'})
 }))
 assert.equal(routed.status,403)
 assert.equal(reads,1)
 const differentSlug=await handler(preflight('http://edge-runtime.internal/not-this-endpoint'))
 assert.equal(differentSlug.status,400)
 const invalidMethod=await handler(preflight(url,'DELETE'))
 assert.equal(invalidMethod.status,405)
})

test('failed live generation request displays only predefined safe diagnostic codes',()=>{
 const view=readFileSync(new URL('../components/AdminPaypalMerchantBootstrap.tsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-provision/liveMerchantBootstrapControl.mjs',import.meta.url),'utf8')
 assert.match(view,/const SAFE_BOOTSTRAP_CODES=new Set/)
 assert.match(view,/SAFE_BOOTSTRAP_CODES\.has\(observed\)/)
 assert.match(view,/context\.clone\(\)\.json\(\)/)
 assert.match(view,/data-pazo-bootstrap-diagnostic/)
 assert.doesNotMatch(view,/console\.log|sessionStorage|localStorage/)
 assert.match(server,/PAZO_F16_BOOTSTRAP_STAGE/)
 assert.match(server,/TRACE_CODES\.has\(code\)/)
})

test('MFA-authenticated configuration probe is read-only and never invokes generation SQL',async()=>{
 let readCount=0,reserveCount=0
 const handler=createPazoLiveMerchantBootstrapControl({
  released:true,
  authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readAdminSettings:async()=>{readCount++;return settings()},
  reserveGeneration:async()=>{reserveCount++;throw Error('not allowed on probe')}
 })
 const request=makeRequest({action:'check_readiness',
  confirmation:'VERIFICAR CONFIGURACION LIVE'})
 const res=await handler(request)
 const d=await res.json()
 assert.equal(res.status,200)
 assert.deepEqual(d,{
  ok:true,code:'live_configuration_readonly_verified',environment:'live',
  mayCharge:false,liveActivated:false,generationReserved:false,
  webhookConfigured:false
 })
 assert.equal(readCount,1)
 assert.equal(reserveCount,0)
 const unverified=createPazoLiveMerchantBootstrapControl({
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:false}),
  readAdminSettings:async()=>{throw Error('should not read')},
  reserveGeneration:async()=>{throw Error('should not write')}
 })
 assert.equal((await unverified(makeRequest({action:'check_readiness',
  confirmation:'VERIFICAR CONFIGURACION LIVE'}))).status,403)
})
test('bootstrap UI requires read-only readiness success before allowing a write',()=>{
 const ui=readFileSync(new URL('../components/AdminPaypalMerchantBootstrap.tsx',import.meta.url),'utf8')
 assert.match(ui,/action:'check_readiness'/)
 assert.match(ui,/confirmation:'VERIFICAR CONFIGURACION LIVE'/)
 assert.match(ui,/readiness!=='verified'/)
 assert.match(ui,/data-pazo-readiness-diagnostic/)
 assert.match(ui,/Comprobar configuración \(sin reservar\)/)
 assert.match(ui,/setReadinessCode\(await safeBootstrapFailure/)
})
