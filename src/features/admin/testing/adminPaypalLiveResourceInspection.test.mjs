import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createLiveResourceInspection} from '../../../../supabase/functions/pazo-admin-paypal-live-inspect/handler.mjs'
import {createLiveResourceStore} from '../../../../supabase/functions/pazo-admin-paypal-live-inspect/store.mjs'
import {REQUIRED_EVENTS,liveWebhookUrlForGeneration} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const actorId='12345678-1234-4234-8234-123456789abc'
const planId='P-INSPECTIONTEST12345'
const webhookId='WH-INSPECTION-TEST'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-live-inspect'
const credentials={clientId:'SYNTHETIC_CLIENT_1234567890',clientSecret:'SYNTHETIC_SECRET_1234567890'}
const payload=()=>({action:'inspect_resources',confirmation:'COMPROBAR RECURSOS LIVE',webhookId,...credentials})
const request=(body=payload(),extra={})=>new Request(url,{method:'POST',headers:{
 'content-type':'application/json',authorization:'Bearer e30.e30.synthetic',origin:'http://localhost:5173'
},body:JSON.stringify(body),...extra})
const settings=()=>({active_environment:'sandbox',live_checkout_enabled:false,environments:[
 {environment:'sandbox'}, {environment:'live',plan_id:planId,price_minor:299,currency:'USD',
  interval_unit:'MONTH',return_origin:'https://pazo-app.vercel.app',webhook_id:''}
]})
const reservation=()=>({generation:1,planId,webhookId:'',state:'reserved',environment:'live',mayCharge:false})
function fixture(overrides={}){
 const {eventTypes=REQUIRED_EVENTS,...depsOverrides}=overrides
 const calls=[]
 const deps={released:true,
  authenticateAdmin:async()=>({id:actorId,isAdmin:true,freshSession:true}),
  readAdminSettings:async()=>settings(),readReservation:async()=>reservation(),
  recordResources:async value=>{calls.push({record:value});return true},
  fetchImpl:async(dest,options)=>{
   calls.push({dest,method:options.method})
   assert.equal(options.redirect,'error')
   assert.equal(options.cache,'no-store')
   if(dest==='https://api-m.paypal.com/v1/oauth2/token')return {ok:true,json:async()=>({
    token_type:'Bearer',access_token:'SYNTHETIC_OAUTH_TOKEN_12345678'})}
   assert.equal(options.method,'GET')
   if(dest==='https://api-m.paypal.com/v1/billing/plans/'+planId)return {ok:true,json:async()=>({
    id:planId,status:'ACTIVE',billing_cycles:[{tenure_type:'REGULAR',sequence:1,
     frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
     pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],payment_preferences:{auto_bill_outstanding:false}
   })}
   if(dest==='https://api-m.paypal.com/v1/notifications/webhooks/'+webhookId)return {ok:true,json:async()=>({
    id:webhookId,url:liveWebhookUrlForGeneration(1),event_types:eventTypes.map(name=>({name}))
   })}
   throw Error('Forbidden network destination')
  },...depsOverrides}
 return {calls,handler:createLiveResourceInspection(deps)}
}
test('resource inspection reads existing reservation without provider or metadata writes',async()=>{
 const {handler,calls}=fixture()
 const res=await handler(request({action:'read_reservation'}))
 assert.equal(res.status,200)
 assert.equal((await res.json()).generation,1)
 assert.deepEqual(calls,[])
})
test('resource inspection uses three allowed provider requests then records only metadata',async()=>{
 const {handler,calls}=fixture()
 const res=await handler(request())
 assert.equal(res.status,200)
 const body=await res.json()
 assert.equal(body.code,'live_resource_configuration_recorded')
 for(const key of ['mayCharge','liveActivated','credentialsStored','merchantIdentityVerified','webhookDeliveryVerified'])
  assert.equal(body[key],false)
 assert.deepEqual(calls.filter(x=>x.dest).map(x=>x.method),['POST','GET','GET'])
 assert.deepEqual(calls.at(-1).record,{actorId,merchantGeneration:1,planId,webhookId})
 assert.doesNotMatch(JSON.stringify({body,record:calls.at(-1)}),/SYNTHETIC_(CLIENT|SECRET|OAUTH)/)
})
test('release gate and recent admin MFA prevent all provider access',async()=>{
 for(const overrides of [{released:false},{authenticateAdmin:async()=>null},
  {authenticateAdmin:async()=>({id:actorId,isAdmin:true,freshSession:false})},
  {authenticateAdmin:async()=>{throw Error(credentials.clientSecret)}}]){
  const {handler,calls}=fixture(overrides)
  const res=await handler(request())
  assert.ok([403,503].includes(res.status));assert.deepEqual(calls,[])
  assert.ok(!(await res.text()).includes(credentials.clientSecret))
 }
})
test('strict request refuses browser-selected generation, plan, host or merchant proof',async()=>{
 for(const extra of [{merchantGeneration:2},{planId},{host:'https://evil.invalid'},
  {merchantIdentityVerified:true},{clientSecret:'short'},{webhookId:'invalid'}]){
  const {handler,calls}=fixture()
  assert.equal((await handler(request({...payload(),...extra}))).status,400)
  assert.deepEqual(calls,[])
 }
})
test('invalid routes, origins, content types and streamed oversized body fail closed',async()=>{
 const {handler,calls}=fixture()
 for(const req of [new Request(url+'?generation=2',{method:'POST'}),
  request(payload(),{headers:{origin:'https://evil.invalid','content-type':'application/json'}}),
  request(payload(),{headers:{'content-type':'text/plain'}}),request({padding:'x'.repeat(3000)})]){
  assert.ok([400,403].includes((await handler(req)).status))
 }
 assert.deepEqual(calls,[])
 const ok=await handler(new Request('http://edge-runtime.internal/pazo-admin-paypal-live-inspect',{
  method:'OPTIONS',headers:{origin:'http://localhost:5173','access-control-request-method':'POST'}}))
 assert.equal(ok.status,204)
 assert.equal(ok.headers.get('access-control-allow-origin'),'http://localhost:5173')
})
test('wrong reservation, changed plan and Live switch prevent provider requests',async()=>{
 for(const overrides of [{readReservation:async()=>null},
  {readReservation:async()=>({...reservation(),planId:'P-OTHERPLAN12345678'})},
  {readReservation:async()=>({...reservation(),generation:0})},
  {readAdminSettings:async()=>({...settings(),live_checkout_enabled:true})},
  {readAdminSettings:async()=>({...settings(),environments:[]})},
  {readAdminSettings:async()=>{throw Error(credentials.clientSecret)}}]){
  const {handler,calls}=fixture(overrides)
  assert.ok([409,503].includes((await handler(request())).status));assert.deepEqual(calls,[])
 }
})
test('failed provider read never records metadata or leaks provider errors',async()=>{
 const {handler,calls}=fixture({fetchImpl:async()=>{throw Error(credentials.clientSecret)}})
 const res=await handler(request())
 assert.equal(res.status,409);assert.deepEqual(calls,[])
 assert.equal((await res.json()).code,'live_provider_unavailable')
})
test('generation changed while checking provider cannot be recorded',async()=>{
 let reads=0
 const {handler,calls}=fixture({readReservation:async()=>({...reservation(),generation:++reads===1?1:2})})
 const res=await handler(request())
 assert.equal((await res.json()).code,'generation_changed_during_inspection')
 assert.equal(calls.some(x=>x.record),false)
})
test('unconfirmed audit result cannot report successful configuration',async()=>{
 const {handler}=fixture({recordResources:async()=>false})
 const res=await handler(request())
 assert.equal(res.status,409)
 assert.equal((await res.json()).code,'resource_record_unconfirmed')
})
test('record RPC sends no credentials and reader strips unexpected sensitive fields',async()=>{
 const sent=[]
 const store=createLiveResourceStore({projectUrl:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  serviceRoleKey:'SYNTHETIC_SERVICE_ROLE_KEY_1234567890',fetchImpl:async(dest,options)=>{
   sent.push({dest,body:JSON.parse(options.body)})
   return new Response(JSON.stringify(dest.endsWith('_read')?{...reservation(),client_secret:credentials.clientSecret}:true),
    {status:200,headers:{'content-type':'application/json'}})
  }})
 const read=await store.readReservation({actorId,planId})
 assert.equal(read.generation,1)
 assert.ok(!JSON.stringify(read).includes('SYNTHETIC_SECRET'))
 assert.equal(await store.recordResources({actorId,merchantGeneration:1,planId,webhookId,...credentials}),true)
 assert.ok(!JSON.stringify(sent).includes('SYNTHETIC_SECRET'))
})
test('inspection UI masks and clears both private values without persistent browser storage',()=>{
 const source=readFileSync(new URL('../components/AdminPaypalLiveResourceCheck.tsx',import.meta.url),'utf8')
 assert.equal((source.match(/type="password"/g)||[]).length,2)
 assert.match(source,/payload\.clientId='';payload\.clientSecret=''/)
 assert.match(source,/epoch\.current!==current/)
 assert.doesNotMatch(source,/localStorage|sessionStorage|console\.|navigator\.clipboard|service_role/)
})

test('additional, duplicate or malformed PayPal webhook events show only safe non-financial details',async()=>{
 const scenarios=[
  {types:[...REQUIRED_EVENTS,'UNRELATED.EVENT.TEST'],extra:1,duplicate:0,malformed:0,names:['UNRELATED.EVENT.TEST']},
  {types:[...REQUIRED_EVENTS,REQUIRED_EVENTS[0]],extra:0,duplicate:1,malformed:0,names:[]},
  {types:[...REQUIRED_EVENTS,'*'],extra:1,duplicate:0,malformed:1,names:[]}
 ]
 for(const scenario of scenarios){
  const {handler,calls}=fixture({eventTypes:scenario.types})
  const response=await handler(request())
  assert.equal(response.status,409)
  const body=await response.json()
  assert.equal(body.code,'live_webhook_events_unexpected')
  assert.deepEqual(body.eventMismatch,{
   receivedCount:11,extraCount:scenario.extra,duplicateCount:scenario.duplicate,
   malformedCount:scenario.malformed,unexpectedTypes:scenario.names
  })
  assert.equal(body.mayCharge,false)
  assert.equal(body.liveActivated,false)
  assert.equal(body.credentialsStored,false)
  assert.equal(calls.some(x=>x.record),false)
  assert.doesNotMatch(JSON.stringify(body),/SYNTHETIC_(?:CLIENT|SECRET|OAUTH)/)
 }
 const ui=readFileSync(new URL('../components/AdminPaypalLiveResourceCheck.tsx',import.meta.url),'utf8')
 assert.match(ui,/API event_types=/)
 assert.match(ui,/unexpectedTypes/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|console\.|navigator\.clipboard/)
})
