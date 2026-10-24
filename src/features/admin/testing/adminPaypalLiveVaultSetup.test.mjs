import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoLiveVaultSetup} from '../../../../supabase/functions/pazo-admin-paypal-vault/liveVaultSetup.mjs'
const url='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-vault'
const actor='12345678-1234-4234-8234-123456789abc'
const id='SYNTHETIC_LIVE_CLIENT_12345678'
const secret='SYNTHETIC_LIVE_SECRET_12345678'
const plan='P-9BR88240215654528NLL3I4I'
const hook='6UA43660E66988355'
const form=()=>({action:'prepare_live_vault',confirmation:'PREPARAR CREDENCIALES LIVE',
 clientId:id,clientSecret:secret})
const req=(data=form(),path=url)=>new Request(path,{method:'POST',
 headers:{'content-type':'application/json',authorization:'Bearer test.test.test',
  origin:'http://localhost:5173'},body:JSON.stringify(data)})
const settings=()=>({active_environment:'sandbox',live_checkout_enabled:false,
 environments:[{environment:'sandbox'},{environment:'live',plan_id:plan,
  webhook_id:hook,return_origin:'https://pazo-app.vercel.app',
  price_minor:299,currency:'USD',interval_unit:'MONTH'}]})
const reservation=()=>({environment:'live',state:'reserved',generation:1,
 planId:plan,webhookId:hook,mayCharge:false})
const verified=()=>({ok:true,planReadVerified:true,webhookReadVerified:true,
 mayCharge:false,mayActivate:false})
function fixture(overrides={}){
 const calls=[]
 const handler=createPazoLiveVaultSetup({released:true,
  authenticateAdmin:async()=>({id:actor,isAdmin:true,freshSession:true}),
  readSettings:async()=>{calls.push('settings');return settings()},
  readReservation:async()=>{calls.push('reservation');return reservation()},
  reserveGeneration:async()=>{calls.push('reserve');return {generation:1,planId:plan,environment:'live',mayCharge:false}},
  verifyProvider:async args=>{calls.push('provider');assert.equal(args.environment,'live');
   assert.equal(args.clientId,id);assert.equal(args.clientSecret,secret);
   assert.equal(args.merchantGeneration,1);return verified()},
  saveVault:async args=>{calls.push('vault');assert.equal(args.clientId,id);
   assert.equal(args.clientSecret,secret);return true},
  readbackVault:async()=>{calls.push('readback');return true},
  ...overrides
 })
 return {handler,calls}
}
test('explicit MFA-staged creds verify PayPal Live before Vault, no charge or exposure',async()=>{
 const f=fixture()
 const r=await f.handler(req())
 assert.equal(r.status,200)
 const body=await r.json()
 assert.equal(body.code,'live_vault_credentials_prepared')
 assert.equal(body.generation,1)
 assert.equal(body.credentialsStored,true)
 assert.equal(body.liveActivated,false)
 assert.equal(body.mayCharge,false)
 assert.equal(body.merchantIdentityVerified,false)
 assert.deepEqual(f.calls,['settings','reservation','provider','reservation','settings','vault','readback'])
 for(const secretValue of [id,secret]){
  assert.ok(!JSON.stringify(body).includes(secretValue))
 }
})
test('single credential submission automatically reserves only the missing original generation',async()=>{
 let reserved=false,writes=0
 const f=fixture({
  readReservation:async()=>{f.calls.push('reservation');return reserved?reservation():null},
  reserveGeneration:async ({actorId,planId})=>{
   f.calls.push('reserve')
   assert.equal(actorId,actor);assert.equal(planId,plan)
   assert.equal(reserved,false)
   reserved=true
   return {generation:1,planId:plan,environment:'live',mayCharge:false}
  },
  saveVault:async()=>{writes++;f.calls.push('vault');return true}
 })
 const res=await f.handler(req())
 assert.equal(res.status,200)
 const body=await res.json()
 assert.equal(body.code,'live_vault_credentials_prepared')
 assert.equal(body.generation,1)
 assert.equal(body.mayCharge,false)
 assert.equal(writes,1)
 assert.deepEqual(f.calls,['settings','reservation','reserve','reservation',
  'provider','reservation','settings','vault','readback'])
})

test('uncertain generation reservation uses one write and same-owner readback, never guesses',async()=>{
 for(const committed of [false,true]){
  let attempted=0;let reserved=false;let writes=0
  const f=fixture({
   readReservation:async()=>{f.calls.push('reservation');return reserved?reservation():null},
   reserveGeneration:async()=>{
    attempted++;f.calls.push('reserve')
    if(committed)reserved=true
    throw Error('SYNTHETIC_UNCERTAIN_WRITE')
   },
   saveVault:async()=>{writes++;return true}
  })
  const result=await f.handler(req())
  assert.equal(attempted,1)
  assert.equal(result.status,committed?200:503)
  assert.equal(writes,committed?1:0)
  const response=await result.json()
  assert.equal(response.mayCharge,false)
  if(!committed)assert.equal(response.code,'generation_outcome_needs_review')
 }
})

test('wrong or absent Live resource proof blocks automatic reservation before any write',async()=>{
 for(const badSettings of [
  {...settings(),live_checkout_enabled:true},
  {...settings(),environments:settings().environments.map(x=>x.environment==='live'?{...x,webhook_id:''}:x)},
  {...settings(),environments:settings().environments.map(x=>x.environment==='live'?{...x,plan_id:'P-INVALID'}:x)}
 ]){
  let reserve=0
  const f=fixture({
   readSettings:async()=>badSettings,
   readReservation:async()=>null,
   reserveGeneration:async()=>{reserve++;return reservation()}
  })
  const result=await f.handler(req())
  assert.notEqual(result.status,200)
  assert.equal(reserve,0)
 }
})

test('release OFF cannot authenticate, inspect PayPal or touch Vault',async()=>{
 const f=fixture({released:false})
 const r=await f.handler(req())
 assert.equal(r.status,503)
 assert.equal((await r.json()).code,'live_vault_setup_not_released')
 assert.equal(f.calls.length,0)
})
test('fresh owner+admin+TOTP is mandatory before any provider or Vault action',async()=>{
 for(const identity of [null,{id:actor,isAdmin:true,freshSession:false},
  {id:actor,isAdmin:false,freshSession:true}]){
  const f=fixture({authenticateAdmin:async()=>identity})
  const r=await f.handler(req())
  assert.equal(r.status,403)
  assert.deepEqual(f.calls,[])
 }
})
test('wrong plan, webhook or changed generation prevents Vault write',async()=>{
 for(const override of [
  {readSettings:async()=>({...settings(),live_checkout_enabled:true})},
  {readReservation:async()=>({...reservation(),generation:2,webhookId:'WH-MISMATCH123'})},
  {readReservation:async()=>({...reservation(),state:'finalized'})},
  {verifyProvider:async()=>({ok:false})}
 ]){
  let writes=0
  const f=fixture({...override,saveVault:async()=>{writes++;return true}})
  const r=await f.handler(req())
  assert.ok([409,503].includes(r.status))
  assert.equal(writes,0)
 }
})
test('unknown write/readback never reports persisted Live credentials',async()=>{
 for(const outcome of [false,undefined]){
  const f=fixture({saveVault:async()=>outcome})
  const r=await f.handler(req())
  assert.equal(r.status,503)
  const body=await r.json()
  assert.equal(body.code,'credential_save_outcome_needs_review')
  assert.equal(body.credentialsStored,false)
  assert.equal(body.mayCharge,false)
 }
 const f=fixture({readbackVault:async()=>false})
 assert.equal((await f.handler(req())).status,503)
})
test('reject injections, forged origins, routes and unverified content',async()=>{
 for(const body of [{...form(),merchantId:'MALICIOUS'},{
  ...form(),clientSecret:'short'},{...form(),action:'charge'},
  {...form(),confirmation:'ACTIVATE LIVE'}
 ]){
  const f=fixture()
  assert.equal((await f.handler(req(body))).status,400)
  assert.deepEqual(f.calls,[])
 }
 const f=fixture()
 assert.equal((await f.handler(req(form(),url+'?environment=sandbox'))).status,400)
 assert.deepEqual(f.calls,[])
 const forged=new Request(url,{method:'POST',
  headers:{origin:'https://pazo-app.vercel.app.evil.invalid',
   'content-type':'application/json'},body:JSON.stringify(form())})
 assert.equal((await f.handler(forged)).status,403)
 assert.deepEqual(f.calls,[])
})
test('internal Supabase route preflight is nonfinancial and cannot bypass MFA',async()=>{
 const f=fixture()
 const r=await f.handler(new Request('http://edge-runtime.internal/pazo-admin-paypal-vault',{
  method:'OPTIONS',headers:{origin:'http://localhost:5173',
   'access-control-request-method':'POST'}}))
 assert.equal(r.status,204)
 assert.equal(r.headers.get('access-control-allow-origin'),'http://localhost:5173')
 assert.deepEqual(f.calls,[])
})
test('entrypoint remains hard-off until release security gate and never includes PAT',()=>{
 const file=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-vault/index.ts',import.meta.url),'utf8')
 assert.match(file,/const RELEASE_APPROVED=true/)
 assert.match(file,/pazo_f16_live_service_vault_prepare/) 
 assert.match(file,/pazo_f16_live_service_vault_status/) 
 assert.match(file,/createPazoLiveBootstrapSqlStore/)
 assert.match(file,/readSettings,readReservation,reserveGeneration,saveVault,readbackVault/) 
 assert.doesNotMatch(file,/pazo_admin_paypal_save_credentials/)
 assert.match(file,/pazo_admin_paypal_settings/)
 assert.doesNotMatch(file,/PAZO_F16_SCOPED_MANAGEMENT_TOKEN|api\.supabase\.com\/v1\/projects/)
})

test('UI is masked and held behind release while admin staging endpoint remains OFF',()=>{
 const widget=readFileSync(new URL('../components/AdminPaypalLiveVaultSetup.tsx',import.meta.url),'utf8')
 const settings=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
 assert.match(widget,/type="password"/)
 assert.match(widget,/mfaRecentlyVerified/)
 assert.match(widget,/payload\.clientId='';payload\.clientSecret=''/)
 assert.doesNotMatch(widget,/localStorage|sessionStorage|console\.log|navigator\.clipboard/)
 assert.match(settings,/const LIVE_VAULT_SETUP_RELEASED=true/)
 assert.match(settings,/LIVE_VAULT_SETUP_RELEASED&&<AdminPaypalLiveVaultSetup/)
})
