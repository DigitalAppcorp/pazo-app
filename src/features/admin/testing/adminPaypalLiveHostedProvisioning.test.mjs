import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveHostedProvisioning}
 from '../../../../supabase/functions/pazo-admin-paypal-provision/liveHostedProvisioning.mjs'
import {readFileSync} from 'node:fs'

const target='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-provision'
const request=new Request(target,{method:'POST',headers:{
 authorization:'Bearer e30.e30.c2ln','content-type':'application/json'
},body:JSON.stringify({
 merchantGeneration:7,clientId:'CLIENT_TEST_123456789012345',
 clientSecret:'SECRET_TEST_123456789012345',
 expectedRevision:0,confirmation:'PREPARAR CREDENCIALES LIVE'
})})
test('released=false must not read ANY environment secret or construct a privileged client',async()=>{
 let accessed=0,fetches=0
 const handler=createPazoLiveHostedProvisioning({
  getEnv:()=>{accessed++;throw Error('MUST_NOT_READ')},
  verifyProviderResources:async()=>{throw Error('MUST_NOT_CALL')},
  fetchImpl:async()=>{fetches++;throw Error('MUST_NOT_FETCH')}
 })
 const r=await handler(request)
 assert.equal(r.status,503)
 assert.equal((await r.json()).code,'live_provisioning_not_released')
 assert.equal(accessed,0)
 assert.equal(fetches,0)
})
test('server-default pinned merchant verifier cannot bypass bad project configuration',async()=>{
 let accessed=0
 const handler=createPazoLiveHostedProvisioning({
  released:true,getEnv:()=>{accessed++;return 'secret'}
 })
 const r=await handler(request)
 assert.equal(r.status,503)
 assert.equal((await r.json()).code,'live_provisioning_not_configured')
 assert.equal(accessed,3)
})
test('invalid project configuration and absent project token do not expose secrets',async()=>{
 const handler=createPazoLiveHostedProvisioning({
  released:true,getEnv:name=>name==='SUPABASE_URL'?
   'https://attacker.invalid':'private_credential_never_log',
  verifyProviderResources:async()=>{throw Error('PRIVATE_PROVIDER_SECRET')},
  fetchImpl:async()=>{throw Error('PRIVATE_SERVICE_KEY')}
 })
 const r=await handler(request)
 assert.equal(r.status,503)
 const body=JSON.stringify(await r.json())
 assert.equal(body.includes('private_credential_never_log'),false)
 assert.equal(body.includes('PRIVATE_PROVIDER_SECRET'),false)
 assert.equal(body.includes('PRIVATE_SERVICE_KEY'),false)
})
test('actual hosted Edge remains independently hard locked OFF',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-admin-paypal-provision/index.ts',import.meta.url),'utf8')
 assert.match(edge,/const RELEASE_APPROVED=false/)
 assert.doesNotMatch(edge,/released:true/)
})
