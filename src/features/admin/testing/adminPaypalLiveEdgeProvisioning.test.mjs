import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveEdgeSecretsProvisioner} from '../../../../supabase/functions/pazo-admin-paypal-validate/liveEdgeProvisioning.mjs'
const id='12345678-1234-4234-8234-123456789abc'
const secrets={
 clientId:'CLIENT_LIVE_TEST_123456',
 clientSecret:'SECRET_LIVE_TEST_123456'
}
const pat='sbp_fc_SCOPED_TOKEN_TEST_0123456789012345'
const stub={
 generation:7,environment:'live',credentialSource:'edge_secrets',
 isRetired:false,verifiedAdminId:id,revision:3,liveCheckoutEnabled:false,
 killSwitch:true,planId:'P-ABCDEFGHIJKLMN',webhookId:'WH-ABCDEFGHIJKL',
 merchantFingerprint:'a'.repeat(64)
}
const args={request:new Request('https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-provision',{method:'POST'}),
 merchantGeneration:7,...secrets,confirmation:'PREPARAR CREDENCIALES LIVE',expectedRevision:3}
function build(changes={},released=true){
 const calls=[],secretsStored=new Set()
 const handler=createPazoLiveEdgeSecretsProvisioner({
  released,
  authenticateAdmin:async()=>({id,isAdmin:true,freshSession:true}),
  readGeneration:async()=>({...stub,...changes}),
  verifyProviderResources:async()=>({oauthVerified:true,planVerified:true,
   webhookVerified:true,merchantIdentityVerified:true,isLive:true,mayCharge:false}),
  getScopedManagementToken:()=>pat,
  fetchImpl:async(url,opts)=>{
   calls.push({url,method:opts.method,
    body:opts.body?JSON.parse(opts.body):null,header:opts.headers.Authorization})
   if(opts.method==='GET')return {ok:true,status:200,
    json:async()=>[...secretsStored].map(name=>({name}))}
   for(const x of JSON.parse(opts.body))secretsStored.add(x.name)
   return {ok:true,status:201}
  }
 })
 return {handler,calls,secretsStored}
}
test('release OFF checks before reading admin or merchant credentials',async()=>{
 const {handler,calls}=build({},false)
 assert.deepEqual(await handler(args),{
  ok:false,code:'edge_provisioning_not_released',liveActivated:false,
  mayCharge:false,credentialsExposed:false})
 assert.equal(calls.length,0)
})
test('stages only six exact secrets into one pinned project, never activates Live',async()=>{
 const {handler,calls}=build()
 const r=await handler(args)
 assert.equal(r.ok,true)
 assert.equal(r.secretCount,6)
 assert.equal(r.mayCharge,false)
 assert.equal(r.liveActivated,false)
 assert.equal(r.credentialsExposed,false)
 assert.deepEqual(calls.map(x=>x.method),['GET','POST','GET'])
 assert.ok(calls.every(c=>c.url==='https://api.supabase.com/v1/projects/mrybvqdebbgcayuvgkkr/secrets'))
 assert.ok(calls.every(c=>c.header==='Bearer '+pat))
 const body=calls[1].body
 assert.equal(body.length,6)
 assert.ok(body.every(x=>x.name.startsWith('PAZO_F16_LIVE_G7_')))
 assert.equal(body.find(x=>x.name.endsWith('CLIENT_SECRET')).value,secrets.clientSecret)
 assert.equal(JSON.stringify(r).includes(secrets.clientSecret),false)
 assert.equal(JSON.stringify(r).includes(pat),false)
})
test('rejects stale revision, retired merchant, changed owner and Live already ON',async()=>{
 for(const change of [
  {revision:4},{isRetired:true},{environment:'sandbox'},
  {credentialSource:'vault'},{verifiedAdminId:'33333333-3333-4333-8333-333333333333'},
  {liveCheckoutEnabled:true},{killSwitch:false},
  {merchantFingerprint:'NOT_A_HASH'}
 ]){
  const {handler,calls}=build(change)
  const r=await handler(args)
  assert.equal(r.ok,false)
  assert.equal(r.code,'immutable_generation_not_ready')
  assert.equal(calls.length,0)
 }
})
test('no bulk secrets write for wrong explicit phrase, source generation or request',async()=>{
 const {handler,calls}=build()
 for(const change of [
  {confirmation:'ACTIVAR LIVE PAZO'},
  {merchantGeneration:8},{expectedRevision:-1},
  {clientId:'no'},{clientSecret:'abc'},
  {request:new Request('https://example.com',{method:'GET'})}
 ]){
  const r=await handler({...args,...change})
  assert.equal(r.ok,false)
 }
 assert.equal(calls.length,0)
})
test('does not repeat writes when original secret names already exist',async()=>{
 const {handler,calls}=build()
 assert.equal((await handler(args)).ok,true)
 const r=await handler(args)
 assert.equal(r.code,'generation_secrets_already_present')
 assert.deepEqual(calls.map(x=>x.method),['GET','POST','GET','GET'])
})
test('ambiguous management POST never retries or confirms success',async()=>{
 let sends=0
 const handler=createPazoLiveEdgeSecretsProvisioner({
  released:true,
  authenticateAdmin:async()=>({id,isAdmin:true,freshSession:true}),
  readGeneration:async()=>stub,
  verifyProviderResources:async()=>({oauthVerified:true,planVerified:true,
   webhookVerified:true,merchantIdentityVerified:true,isLive:true,mayCharge:false}),
  getScopedManagementToken:()=>pat,
  fetchImpl:async(_url,opts)=>opts.method==='GET'?{
   ok:true,status:200,json:async()=>[]
  }:(sends++,{ok:false,status:503})
 })
 const r=await handler(args)
 assert.equal(r.code,'secret_write_outcome_unknown_manual_review')
 assert.equal(sends,1)
})
