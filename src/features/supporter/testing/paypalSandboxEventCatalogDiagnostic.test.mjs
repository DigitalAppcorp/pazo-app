import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {assessF16SandboxResources} from './paypalSandboxResourceContract.mjs'
import {PAZO_REQUIRED_PAYPAL_EVENTS} from './paypalSandboxWebhookContract.mjs'

const validPlan=()=>({
 id:'P-14V25407JP6850922NLHMDKI',status:'ACTIVE',
 billing_cycles:[{tenure_type:'REGULAR',
 frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
 pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
 payment_preferences:{setup_fee:{currency_code:'USD',value:'0.00'}},
})
const expectedSix=PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6)
const webhook=()=>({
 id:'6N7889790V1467139',
 url:'https://DO_NOT_REFLECT_UNKNOWN_HOST.invalid/callback?private=SECRET_CALLBACK',
 event_types:[
 ...expectedSix.map(name=>({name})),
 {name:'BILLING.SUBSCRIPTION.CREATED'},
 {name:'CATALOG.PRODUCT.UPDATED'},
 ],
})
const catalog=()=>({event_types:[
 {name:'BILLING.SUBSCRIPTION.CREATED'},
 {name:'CATALOG.PRODUCT.UPDATED'},
 {name:'PAYMENT.SALE.COMPLETED'},
]})
test('read-only event catalogue identifies precisely the two actual extras if PayPal confirms their public names',()=>{
 const x=assessF16SandboxResources(validPlan(),webhook(),catalog())
 assert.equal(x.resourcesAccessible,true)
 assert.equal(x.webhook.configuredEventsCount,8)
 assert.equal(x.webhook.unexpectedEventsCount,2)
 assert.equal(x.webhook.unresolvedAdditionalEventsCount,0)
 assert.equal(x.webhook.officialCatalogStatus,'verified')
 assert.deepEqual(x.webhook.additionalProviderEvents,[
  'BILLING.SUBSCRIPTION.CREATED','CATALOG.PRODUCT.UPDATED',
 ])
 assert.deepEqual(x.webhook.missingEvents,PAZO_REQUIRED_PAYPAL_EVENTS.slice(6))
 assert.equal(x.webhook.missingSubscriptionEvents.length,0)
 assert.doesNotMatch(JSON.stringify(x),/DO_NOT_REFLECT|SECRET_CALLBACK|callback\?private/i)
})
test('injected webhook labels never escape unless confirmed by independent PayPal catalogue',()=>{
 const hostile={...webhook(),event_types:[...webhook().event_types,
  {name:'BILLING.SUBSCRIPTION.PERSONAL_DATA_DO_NOT_ECHO'},
 ]}
 const x=assessF16SandboxResources(validPlan(),hostile,catalog())
 assert.equal(x.webhook.unexpectedEventsCount,3)
 assert.equal(x.webhook.unresolvedAdditionalEventsCount,1)
 assert.deepEqual(x.webhook.additionalProviderEvents,[
  'BILLING.SUBSCRIPTION.CREATED','CATALOG.PRODUCT.UPDATED',
 ])
 assert.doesNotMatch(JSON.stringify(x),/PERSONAL_DATA_DO_NOT_ECHO|SECRET_CALLBACK/)
 const unavailable=assessF16SandboxResources(validPlan(),webhook())
 assert.deepEqual(unavailable.webhook.additionalProviderEvents,[])
 assert.equal(unavailable.webhook.unresolvedAdditionalEventsCount,2)
 assert.equal(unavailable.webhook.officialCatalogStatus,'unavailable')
})
function simulate(mode){
 const stub=[
  'const mode='+JSON.stringify(mode)+';',
  'const plan='+JSON.stringify(validPlan())+';',
  'const hook='+JSON.stringify(webhook())+';',
  'const catalog='+JSON.stringify(catalog())+';',
  'globalThis.fetch=async(url,opts)=>{',
  'const u=String(url);',
  'if(u==="https://api-m.sandbox.paypal.com/v1/oauth2/token")',
  'return {ok:true,json:async()=>({token_type:"Bearer",access_token:"SECRET_TEST_TOKEN"})};',
  'if(opts.method!=="GET"||opts.headers.Authorization!=="Bearer SECRET_TEST_TOKEN") throw Error("bad_request");',
  'if(u==="https://api-m.sandbox.paypal.com/v1/billing/plans/P-14V25407JP6850922NLHMDKI")',
  'return {ok:true,json:async()=>plan};',
  'if(u==="https://api-m.sandbox.paypal.com/v1/notifications/webhooks/6N7889790V1467139")',
  'return {ok:true,json:async()=>hook};',
  'if(u==="https://api-m.sandbox.paypal.com/v1/notifications/webhooks-event-types"){',
  'if(mode==="catalog_down")return {ok:false,status:503};',
  'return {ok:true,json:async()=>catalog};}',
  'throw Error("unexpected_endpoint");',
  '};',
 ].join('\n')
 return spawnSync(process.execPath,[
  '--import','data:text/javascript,'+encodeURIComponent(stub),
  'scripts/f16-paypal-verify-resources-readonly.mjs',
 ],{encoding:'utf8',timeout:12000,cwd:process.cwd(),
  env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:'SECRET_TEST_CLIENT',
   PAYPAL_SANDBOX_CLIENT_SECRET:'SECRET_TEST_SECRET'},
 })
}
test('read-only script resolves two verified names through actual PayPal catalogue endpoint',()=>{
 const x=simulate('ok')
 assert.equal(x.status,0,x.stderr)
 const output=JSON.parse(x.stdout)
 assert.deepEqual(output.webhook.additionalProviderEvents,[
  'BILLING.SUBSCRIPTION.CREATED','CATALOG.PRODUCT.UPDATED',
 ])
 assert.equal(output.webhook.officialCatalogStatus,'verified')
 assert.equal(output.webhook.unresolvedAdditionalEventsCount,0)
 assert.doesNotMatch(x.stdout+x.stderr,/SECRET_TEST|DO_NOT_REFLECT|SECRET_CALLBACK|callback\?private/)
})
test('catalogue unavailable reports unresolved counts without leaking event labels, never attempts mutation',()=>{
 const x=simulate('catalog_down')
 assert.equal(x.status,0,x.stderr)
 const output=JSON.parse(x.stdout)
 assert.equal(output.webhook.officialCatalogStatus,'unavailable')
 assert.deepEqual(output.webhook.additionalProviderEvents,[])
 assert.equal(output.webhook.unresolvedAdditionalEventsCount,2)
 assert.doesNotMatch(x.stdout+x.stderr,/SECRET_TEST|DO_NOT_REFLECT|SECRET_CALLBACK/)
})
