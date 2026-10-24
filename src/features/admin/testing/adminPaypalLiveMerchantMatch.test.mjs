import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createLiveResourceInspection} from '../../../../supabase/functions/pazo-admin-paypal-live-inspect/handler.mjs'
import {REQUIRED_EVENTS,liveWebhookUrlForGeneration} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveProviderReadOnly.mjs'
const host='https://api-m.paypal.com'
const route='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-live-inspect'
const actor='12345678-1234-4234-8234-123456789abc'
const merchantId='ABCD2345EFGHJ'
const planId='P-MERCHANTMATCH1234567'
const webhookId='WH-MERCHANTMATCH12345'
const secrets={clientId:'SYNTHETIC_CLIENT_1234567890',clientSecret:'SYNTHETIC_SECRET_1234567890'}
const form=()=>({action:'verify_merchant_id',confirmation:'COMPROBAR COMERCIO LIVE',
 merchantId,...secrets})
const settings=()=>({active_environment:'sandbox',live_checkout_enabled:false,
 environments:[{environment:'live',plan_id:planId,price_minor:299,
 currency:'USD',interval_unit:'MONTH',return_origin:'https://pazo-app.vercel.app',
 webhook_id:webhookId},{environment:'sandbox'}]})
const reservation=()=>({generation:1,planId,state:'reserved',environment:'live',
 webhookId,mayCharge:false})
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{'content-type':'application/json'}})
function req(data=form(),override={}){
 return new Request(route,{method:'POST',
 headers:{origin:'http://localhost:5173','content-type':'application/json',
  authorization:'Bearer e30.e30.synthetic'},body:JSON.stringify(data),...override})
}
function setup(overrides={}){
 const calls=[]
 const deps={
  released:true,authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readAdminSettings:async()=>settings(),readReservation:async()=>reservation(),
  recordResources:async()=>{throw Error('NO_WRITE_ALLOWED')},
  fetchImpl:async(url,config)=>{
   calls.push({url,method:config.method})
   assert.equal(new URL(url).origin,host)
   assert.equal(config.redirect,'error')
   assert.equal(config.cache,'no-store')
   if(url===host+'/v1/oauth2/token')return json({
    token_type:'Bearer',access_token:'OPAQUE_TEST_TOKEN_12345',
    scope:'https://uri.paypal.com/services/reporting/balances/read'})
   if(url===host+'/v1/billing/plans/'+planId)return json({
    id:planId,status:'ACTIVE',
    billing_cycles:[{tenure_type:'REGULAR',sequence:1,frequency:{
     interval_unit:'MONTH',interval_count:1},total_cycles:0,
     pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],
    payment_preferences:{auto_bill_outstanding:false}})
   if(url===host+'/v1/notifications/webhooks/'+webhookId)return json({
    id:webhookId,url:liveWebhookUrlForGeneration(1),
    event_types:REQUIRED_EVENTS.map(name=>({name}))})
   if(url===host+'/v1/reporting/balances?currency_code=USD')
    return json({account_id:merchantId,balances:[{total_balance:{
     currency_code:'USD',value:'SENSITIVE_TEST_BALANCE'}}]})
   throw Error('UNTRUSTED_HOST')
  },...overrides}
 return {calls,handler:createLiveResourceInspection(deps)}
}
test('authenticated and freshly MFA-verified merchant match reveals no merchant ID, balance or tokens',async()=>{
 const f=setup()
 const result=await f.handler(req())
 assert.equal(result.status,200)
 const body=await result.json()
 assert.equal(body.code,'live_merchant_id_read_match')
 assert.equal(body.merchantIdMatched,true)
 assert.equal(body.merchantBindingStored,false)
 assert.equal(body.merchantIdentityVerified,false)
 assert.equal(body.credentialsStored,false)
 assert.equal(body.liveActivated,false)
 assert.equal(body.mayCharge,false)
 assert.equal(body.generation,1)
 assert.deepEqual(f.calls.map(x=>x.method),['POST','GET','GET','POST','GET'])
 for(const secret of [merchantId,...Object.values(secrets),
  'OPAQUE_TEST_TOKEN_12345','SENSITIVE_TEST_BALANCE'])
  assert.ok(!JSON.stringify(body).includes(secret))
})
test('mismatched merchant ID is blocked without creating generation or leaking an ID',async()=>{
 const f=setup()
 const res=await f.handler(req({...form(),merchantId:'JKLM2345EFGHJ'}))
 assert.equal(res.status,409)
 const text=await res.text()
 assert.match(text,/live_merchant_id_mismatch/)
 assert.ok(!text.includes(merchantId))
 assert.ok(!text.includes('JKLM2345EFGHJ'))
 assert.equal(f.calls.length,5)
})
test('untrusted inputs never read PayPal or access a merchant account',async()=>{
 for(const raw of [
  {...form(),merchantId:'a'.repeat(13)},
  {...form(),merchantId:'SENSITIVE_TEST_BALANCE'},
  {...form(),expectedMerchantFingerprint:'a'.repeat(64)},
  {...form(),merchantGeneration:2},
  {...form(),clientSecret:''},
  {...form(),confirmation:'COMPROBAR RECURSOS LIVE'}
 ]){
  const f=setup()
  const res=await f.handler(req(raw))
  assert.equal(res.status,400)
  assert.equal(f.calls.length,0)
 }
 const f=setup()
 const evil=req(form(),{headers:{origin:'https://phishing.example',
  authorization:'Bearer e30.e30.synthetic','content-type':'application/json'}})
 assert.equal((await f.handler(evil)).status,403)
 assert.equal(f.calls.length,0)
})
test('stale admin MFA and absent resource record cannot read merchant balance',async()=>{
 for(const overrides of [{authenticateAdmin:async()=>({id:actor,isAdmin:true,
  freshSession:false})},{readReservation:async()=>({...reservation(),webhookId:''})},
  {readAdminSettings:async()=>({...settings(),live_checkout_enabled:true})}]){
  const f=setup(overrides)
  const res=await f.handler(req())
  assert.ok([403,409].includes(res.status))
  assert.equal(f.calls.length,0)
 }
})
test('reporting scope refusal returns only a public safe error code',async()=>{
 let auth=0
 const base=setup()
 const f=setup({fetchImpl:async(url,init)=>{
  base.calls.push({url,method:init.method})
  if(url===host+'/v1/oauth2/token'){
   auth++
   return json({token_type:'Bearer',access_token:'OPAQUE_TEST_TOKEN_12345',
    scope:auth===2?'openid':'https://uri.paypal.com/services/reporting/balances/read'})
  }
  if(url===host+'/v1/billing/plans/'+planId)return json({
   id:planId,status:'ACTIVE',
   billing_cycles:[{tenure_type:'REGULAR',sequence:1,
    frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
    pricing_scheme:{fixed_price:{value:'2.99',currency_code:'USD'}}}],
   payment_preferences:{auto_bill_outstanding:false}})
  if(url===host+'/v1/notifications/webhooks/'+webhookId)return json({
   id:webhookId,url:liveWebhookUrlForGeneration(1),
   event_types:REQUIRED_EVENTS.map(name=>({name}))})
  throw Error('unexpected balance read')
 }})
 const res=await f.handler(req())
 assert.equal(res.status,409)
 const body=await res.json()
 assert.equal(body.code,'live_merchant_read_permission_required')
 assert.equal(body.mayCharge,false)
 assert.equal(base.calls.length,4)
})
test('merchant ID component never persists private input in storage, URL or logs',()=>{
 const source=readFileSync(new URL('../components/AdminPaypalLiveMerchantMatch.tsx',import.meta.url),'utf8')
 assert.match(source,/type="password"/)
 assert.match(source,/data-pazo-live-merchant-match/)
 assert.match(source,/merchantBindingStored!==false/)
 assert.doesNotMatch(source,/localStorage|sessionStorage|console\.|navigator\.clipboard|URLSearchParams/)
})

test('PayPal balance reporting scope is not a required gate in admin Live UI',()=>{
 const page=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
 assert.match(page,/data-pazo-merchant-balance-check="not-required"/)
 assert.doesNotMatch(page,/<AdminPaypalLiveMerchantMatch/)
 assert.match(page,/La lectura de saldos de PayPal no es un requisito/)
 assert.match(page,/Guardar claves no autoriza cobros/)
 assert.match(page,/<AdminLiveReadiness/)
 assert.match(page,/<AdminLiveReleaseControl/)
})
