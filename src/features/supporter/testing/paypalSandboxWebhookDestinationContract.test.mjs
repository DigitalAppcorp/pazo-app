import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {inspectPazoWebhookDestination,PAZO_EXPECTED_WEBHOOK_URL,PAZO_SANDBOX_WEBHOOK_ID} from './paypalSandboxWebhookDestinationContract.mjs'

test('matches exact expected Supabase function URL but never prints callback URL',()=>{
 const r=inspectPazoWebhookDestination({id:PAZO_SANDBOX_WEBHOOK_ID,url:PAZO_EXPECTED_WEBHOOK_URL})
 assert.deepEqual(r,{ok:true,status:'destination_matches',webhookIdMatches:true,destinationMatches:true})
 assert.equal(JSON.stringify(r).includes('supabase.co'),false)
})
test('rejects altered ID, host, path and secret query strings',()=>{
 for(const url of [
  PAZO_EXPECTED_WEBHOOK_URL+'?token=private',
  PAZO_EXPECTED_WEBHOOK_URL+'/',
  'https://evil.example/functions/v1/paypal-webhook',
  'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/wrong',
 ]){
  const r=inspectPazoWebhookDestination({id:PAZO_SANDBOX_WEBHOOK_ID,url})
  assert.equal(r.ok,false)
  assert.equal(JSON.stringify(r).includes(url),false)
 }
 const x=inspectPazoWebhookDestination({id:'OTHER',url:PAZO_EXPECTED_WEBHOOK_URL})
 assert.equal(x.ok,false)
 assert.equal(x.status,'webhook_id_mismatch')
})
test('rejects invalid provider responses without inventing matches',()=>{
 assert.equal(inspectPazoWebhookDestination(null).status,'invalid_response')
 assert.equal(inspectPazoWebhookDestination({}).ok,false)
})
function run(mode){
 const fixture=mode==='matching' ? PAZO_EXPECTED_WEBHOOK_URL : 'https://different.example/webhook?key=private'
 const stub=[
  'const mode='+JSON.stringify(mode)+';',
  'globalThis.fetch=async (url, opts)=>{',
  'if (url==="https://api-m.sandbox.paypal.com/v1/oauth2/token") {',
  'if (mode==="oauth_failed") return {ok:false,status:401,json:async()=>({error:"invalid_client",error_description:"secret-marker"})};',
  'return {ok:true,json:async()=>({access_token:"mock_token",token_type:"Bearer"})};',
  '}',
  'if (url!=="https://api-m.sandbox.paypal.com/v1/notifications/webhooks/6N7889790V1467139" || opts.headers.Authorization!=="Bearer mock_token") throw Error("wrong_endpoint");',
  'return {ok:true,json:async()=>({id:"6N7889790V1467139",url:'+JSON.stringify(fixture)+'})};',
  '};',
 ].join('\n')
 const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(stub),
    'scripts/f16-paypal-verify-webhook-destination-readonly.mjs'],{
    encoding:'utf8',timeout:10000,cwd:process.cwd(),
    env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:'local_test_id',
      PAYPAL_SANDBOX_CLIENT_SECRET:'local_test_secret'},
 })
 assert.equal(r.error,undefined,String(r.error))
 assert.doesNotMatch(r.stdout+r.stderr,/local_test_secret|local_test_id|different\.example|secret-marker|supabase\.co/)
 return r
}
test('script confirms matching destination through mocked Sandbox GET, without network',()=>{
 const r=run('matching')
 assert.equal(r.status,0,r.stderr)
 assert.match(r.stdout,/"destinationMatches": true/)
})
test('script reports mismatch but never leaks configured URL or credentials',()=>{
 const r=run('mismatch')
 assert.equal(r.status,1,r.stderr)
 assert.match(r.stdout,/"destination_mismatch"/)
})
test('script classifies OAuth 401, never calls webhook endpoint',()=>{
 const r=run('oauth_failed')
 assert.equal(r.status,2,r.stderr)
 assert.match(r.stderr,/oauth_token failed: HTTP 401 \(invalid_client\)/)
})
