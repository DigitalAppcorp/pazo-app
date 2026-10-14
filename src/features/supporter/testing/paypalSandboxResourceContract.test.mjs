import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {PAZO_SANDBOX_PLAN_ID} from './paypalSandboxPlanContract.mjs'
import {PAZO_REQUIRED_PAYPAL_EVENTS} from './paypalSandboxWebhookContract.mjs'
import {PAZO_SANDBOX_WEBHOOK_ID} from './paypalSandboxWebhookDestinationContract.mjs'
import {assessF16SandboxResources,PAZO_F16_EXPECTED_WEBHOOK_URL} from './paypalSandboxResourceContract.mjs'

const validPlan=()=>({
  id:PAZO_SANDBOX_PLAN_ID,status:'ACTIVE',
  billing_cycles:[{tenure_type:'REGULAR',frequency:{interval_unit:'MONTH',interval_count:1},
    total_cycles:0,pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
  payment_preferences:{setup_fee:{currency_code:'USD',value:'0.00'}},
})
const validWebhook=()=>({
  id:PAZO_SANDBOX_WEBHOOK_ID,url:PAZO_F16_EXPECTED_WEBHOOK_URL,
  event_types:PAZO_REQUIRED_PAYPAL_EVENTS.map(name=>({name})),
})
test('read access is not proof of delivery or entitlement',()=>{
  const r=assessF16SandboxResources(validPlan(),validWebhook())
  assert.equal(r.resourcesAccessible,true)
  assert.equal(r.webhook.destinationMatchesF16,true)
  assert.deepEqual(r.webhook.missingEvents,[])
  assert.equal(r.safeToActivate,false)
})
test('classifies legacy, other-host and incomplete events, without copying URLs',()=>{
  const legacy=assessF16SandboxResources(validPlan(),{...validWebhook(),
    url:'https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/paypal-webhook'})
  assert.equal(legacy.webhook.destinationCategory,'legacy_receiver_unsafe_for_f16')
  const other=assessF16SandboxResources(validPlan(),{...validWebhook(),
    url:'https://outside.example/webhook',event_types:[]})
  assert.equal(other.resourcesAccessible,true)
  assert.equal(other.webhook.destinationCategory,'different_host')
  assert.equal(other.webhook.missingEvents.length,PAZO_REQUIRED_PAYPAL_EVENTS.length)
  assert.equal(other.safeToActivate,false)
})
test('read-only mismatch diagnosis reveals only approved PayPal event names, never unknown raw names',()=>{
 const old=validWebhook()
 const extra='UNEXPECTED.PRIVATE_CUSTOM_TOKEN_DO_NOT_PRINT'
 const hook={...old,
  url:'https://untrusted.invalid/callback?secret=DO_NOT_PRINT',
  event_types:[
   ...PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6).map(name=>({name})),
   {name:extra},
  ],
 }
 const result=assessF16SandboxResources(validPlan(),hook)
 assert.equal(result.webhook.configuredEventsCount,7)
 assert.equal(result.webhook.unexpectedEventsCount,1)
 assert.equal(result.webhook.duplicateEventsCount,0)
 assert.deepEqual(result.webhook.missingSubscriptionEvents,[])
 assert.deepEqual(result.webhook.missingEvents,PAZO_REQUIRED_PAYPAL_EVENTS.slice(6))
 assert.deepEqual(result.webhook.recognizedEvents,PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6))
 assert.equal(result.webhook.wildcardPresent,false)
 assert.doesNotMatch(JSON.stringify(result),/UNEXPECTED|PRIVATE_CUSTOM|DO_NOT_PRINT|untrusted\\.invalid|secret=/)
 const missing={...hook,event_types:[
  ...PAZO_REQUIRED_PAYPAL_EVENTS.slice(1,6).map(name=>({name})),
 ]}
 const m=assessF16SandboxResources(validPlan(),missing)
 assert.deepEqual(m.webhook.missingSubscriptionEvents,[PAZO_REQUIRED_PAYPAL_EVENTS[0]])
 assert.equal(m.webhook.configuredEventsCount,5)
 assert.equal(m.webhook.unexpectedEventsCount,0)
 const repeated={...hook,event_types:[{name:'*'},{name:'*'}]}
 const w=assessF16SandboxResources(validPlan(),repeated)
 assert.equal(w.webhook.wildcardPresent,true)
 assert.equal(w.webhook.duplicateEventsCount,1)
 assert.equal(w.webhook.unexpectedEventsCount,2)
 assert.doesNotMatch(JSON.stringify(w),/"recognizedEvents":\\["\\*"\\]/)
})

test('fails closed for wrong resource ID, invalid plans and secret-bearing URLs',()=>{
  const changed={...validWebhook(),id:'OTHER',url:'https://secret.example/hook?secret=TOP_SECRET'}
  const r=assessF16SandboxResources(validPlan(),changed)
  assert.equal(r.resourcesAccessible,false)
  assert.equal(r.webhook.destinationCategory,'not_available')
  const wrong=assessF16SandboxResources({...validPlan(),status:'CREATED'},
    {...validWebhook(),url:'https://secret.example/hook?token=TOP_SECRET',payer:{email:'private@example.com'}})
  assert.equal(wrong.resourcesAccessible,false)
  assert.equal(wrong.webhook.destinationCategory,'has_extra_parameters_or_credentials')
  assert.doesNotMatch(JSON.stringify(wrong),/TOP_SECRET|private@example.com|secret\.example|supabase\.co/)
})
function run(mode){
  const stub=[
    'const mode='+JSON.stringify(mode)+';',
    'let calls=[];',
    'globalThis.fetch=async(url,opts)=>{',
    'const u=String(url);calls.push({url:u,method:opts.method});',
    'if(u==="https://api-m.sandbox.paypal.com/v1/oauth2/token"){',
    'if(mode==="oauth_fail")return {ok:false,status:401,json:async()=>({error:"invalid_client",error_description:"SECRET_PROVIDER"})};',
    'if(opts.method!=="POST")throw Error("wrong_oauth_method");',
    'return {ok:true,json:async()=>({access_token:"SECRET_TOKEN",token_type:"Bearer"})};}',
    'if(opts.method!=="GET"||opts.headers.Authorization!=="Bearer SECRET_TOKEN")throw Error("unexpected_request");',
    'if(u==="https://api-m.sandbox.paypal.com/v1/billing/plans/P-14V25407JP6850922NLHMDKI")',
    'return {ok:true,json:async()=>('+JSON.stringify(validPlan())+')};',
    'if(u==="https://api-m.sandbox.paypal.com/v1/notifications/webhooks/6N7889790V1467139")',
    'return {ok:true,json:async()=>('+JSON.stringify({...validWebhook(),url:'https://outside.example/not-pazo?private=SECRET_CALLBACK'})+')};',
    'throw Error("unknown_endpoint");',
    '};',
  ].join('\n')
  const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(stub),
    'scripts/f16-paypal-verify-resources-readonly.mjs'],{
    encoding:'utf8',timeout:12000,cwd:process.cwd(),
    env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:'SECRET_CLIENT_ID',PAYPAL_SANDBOX_CLIENT_SECRET:'SECRET_CLIENT_SECRET'},
  })
  assert.equal(r.error,undefined,String(r.error))
  assert.doesNotMatch(r.stdout+r.stderr,/SECRET_CLIENT_SECRET|SECRET_CLIENT_ID|SECRET_CALLBACK|SECRET_TOKEN|SECRET_PROVIDER|outside\.example|supabase\.co/)
  return r
}
test('single OAuth plus plan and webhook GETs; sanitized output',()=>{
  const r=run('success')
  assert.equal(r.status,0,r.stderr)
  assert.match(r.stdout,/"resourcesAccessible": true/)
  assert.match(r.stdout,/"destinationCategory": "has_extra_parameters_or_credentials"/)
  assert.match(r.stdout,/"safeToActivate": false/)
})
test('OAuth failures fail closed and only emit allowlisted code',()=>{
  const r=run('oauth_fail')
  assert.equal(r.status,2)
  assert.match(r.stderr,/oauth_token failed: HTTP 401 \(invalid_client\)/)
})
