import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {PAZO_SANDBOX_WEBHOOK_ID} from './paypalSandboxWebhookDestinationContract.mjs'
import {PAZO_REQUIRED_PAYPAL_EVENTS} from './paypalSandboxWebhookContract.mjs'
import {PAZO_F16_EXPECTED_WEBHOOK_URL} from './paypalSandboxResourceContract.mjs'
import {
 buildApprovedF16WebhookPatch,sameWebhookSnapshot,verifiedF16WebhookConfiguration,
 PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS,
} from './paypalSandboxWebhookPatchContract.mjs'

const plan={
 id:'P-14V25407JP6850922NLHMDKI',status:'ACTIVE',
 billing_cycles:[{tenure_type:'REGULAR',
  frequency:{interval_unit:'MONTH',interval_count:1},total_cycles:0,
  pricing_scheme:{fixed_price:{currency_code:'USD',value:'2.99'}}}],
 payment_preferences:{setup_fee:{currency_code:'USD',value:'0.00'}},
}
const original=()=>({
 id:PAZO_SANDBOX_WEBHOOK_ID,
 url:'https://another-host.invalid/callback?private=SECRET_DO_NOT_PRINT',
 event_types:[...PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6),...PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS].map(name=>({name})),
})
const final=()=>({...original(),url:PAZO_F16_EXPECTED_WEBHOOK_URL,
 event_types:[...PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6),...PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS,...PAZO_REQUIRED_PAYPAL_EVENTS.slice(6)].map(name=>({name}))})
test('one PATCH changes only existing URL and includes all eleven approved events',()=>{
 const result=buildApprovedF16WebhookPatch(plan,original())
 assert.equal(result.status,'patch_required')
 assert.deepEqual(result.patch.map(x=>({op:x.op,path:x.path})),[
  {op:'replace',path:'/url'}, {op:'replace',path:'/event_types'}])
 assert.equal(result.patch[0].value,PAZO_F16_EXPECTED_WEBHOOK_URL)
 assert.deepEqual(result.patch[1].value,[...PAZO_REQUIRED_PAYPAL_EVENTS.slice(0,6),...PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS,...PAZO_REQUIRED_PAYPAL_EVENTS.slice(6)].map(name=>({name})))
 assert.equal(verifiedF16WebhookConfiguration(final()),true)
 assert.equal(original().event_types.length,8)
 assert.equal(final().event_types.length,11)
 assert.deepEqual(final().event_types.slice(6,8).map(x=>x.name),PAZO_PRESERVED_PAYPAL_EXTRA_EVENTS)
 assert.equal(buildApprovedF16WebhookPatch(plan,final()).status,'already_configured')
 assert.equal(buildApprovedF16WebhookPatch(plan,final()).patch,null)
 assert.equal(sameWebhookSnapshot(original(),structuredClone(original())),true)
 assert.equal(sameWebhookSnapshot(original(),final()),false)
})
test('mismatches, unexpected events, wildcards and partial writes are blocked',()=>{
 const scenarios=[
  {...original(),id:'DIFFERENT'},
  {...original(),event_types:[...original().event_types,{name:'PAYMENT.CAPTURE.COMPLETED'}]},
  {...original(),event_types:[{name:'*'}]},
  {...original(),event_types:original().event_types.slice(1)},
  {...original(),event_types:original().event_types.filter(x=>x.name!=='BILLING.SUBSCRIPTION.CREATED')},
  {...original(),event_types:original().event_types.filter(x=>x.name!=='BILLING.SUBSCRIPTION.RE-ACTIVATED')},
  {...original(),event_types:[...original().event_types,...PAZO_REQUIRED_PAYPAL_EVENTS.slice(6,7).map(name=>({name}))]},
  {...original(),url:PAZO_F16_EXPECTED_WEBHOOK_URL},
  {...final(),url:'https://another-host.invalid'},
 ]
 for(const hook of scenarios)assert.throws(()=>buildApprovedF16WebhookPatch(plan,hook))
 assert.throws(()=>buildApprovedF16WebhookPatch({...plan,status:'CREATED'},original()))
 assert.equal(verifiedF16WebhookConfiguration({...final(),event_types:[{name:'*'}]}),false)
})
function simulate(mode){
 const fixturePlan=JSON.stringify(plan),fixtureOld=JSON.stringify(original()),fixtureFinal=JSON.stringify(final())
 const stub=[
 'const mode='+JSON.stringify(mode)+';',
 'const plan='+fixturePlan+';', 'let current='+fixtureOld+';', 'let calls=[];',
 'globalThis.fetch=async(url,opts)=>{',
 'const u=String(url);const method=opts.method;',
 'calls.push({u,method});',
 'if(u.endsWith("/v1/oauth2/token")){',
 'return {ok:true,json:async()=>({token_type:"Bearer",access_token:"SECRET_BEARER"})}}',
 'if(u.endsWith("/v1/billing/plans/P-14V25407JP6850922NLHMDKI")){',
 'if(method!=="GET")throw Error("wrong_method");return {ok:true,json:async()=>plan}}',
 'if(u.endsWith("/v1/notifications/webhooks/6N7889790V1467139")){',
 'if(method==="GET") {if(mode==="drift"&&calls.filter(x=>x.method==="GET"&&x.u===u).length===2)current={...current,event_types:[...current.event_types,{name:"UNKNOWN.EVENT"}]};',
 'return {ok:true,json:async()=>current}}',
 'if(method==="PATCH"){',
 'if(mode==="patch_timeout")throw Error("PRIVATE_FAIL_TOKEN");',
 'const v=JSON.parse(opts.body);',
 'if(v.length!==2||v[0].path!=="/url"||v[1].path!=="/event_types"||',
 'v[0].op!=="replace"||v[1].op!=="replace")throw Error("unexpected_mutation");',
 'current={...current,url:v[0].value,event_types:v[1].value};',
 'return {ok:true,json:async()=>current};}',
 '} throw Error("unknown_url")',
 '};',
 ].join('\n')
 const result=spawnSync(process.execPath,[
  '--import','data:text/javascript,'+encodeURIComponent(stub),
  'scripts/f16-paypal-update-webhook-once.mjs',
 ],{encoding:'utf8',timeout:15000,cwd:process.cwd(),
  env:{...process.env,PAZO_F16_WEBHOOK_PATCH_ACK:mode==='no_approval'?'NO':'APLICAR',
   PAYPAL_SANDBOX_CLIENT_ID:'TEST_SANDBOX_CLIENT',
   PAYPAL_SANDBOX_CLIENT_SECRET:'TEST_SANDBOX_SECRET'},
 })
 assert.equal(result.error,undefined,String(result.error))
 assert.doesNotMatch(result.stdout+result.stderr,
  /SECRET_DO_NOT_PRINT|PRIVATE_FAIL_TOKEN|SECRET_BEARER|TEST_SANDBOX_SECRET|another-host\.invalid|\/callback\?private/)
 return result
}
test('one OAuth, one plan GET, two webhook GETs, one PATCH, one verification GET; redact output',()=>{
 const r=simulate('success')
 assert.equal(r.status,0,r.stderr)
 assert.match(r.stdout,/updated_and_verified/)
 assert.match(r.stdout,/same_webhook_eleven_events_f16_destination/)
})
test('drift prevents any PATCH and fails closed',()=>{
 const r=simulate('drift')
 assert.equal(r.status,2)
 assert.match(r.stderr,/no_mutation_attempted/)
})
test('network failure after PATCH is ambiguous and never retried automatically',()=>{
 const r=simulate('patch_timeout')
 assert.equal(r.status,3)
 assert.match(r.stderr,/mutation_outcome_uncertain_manual_review/)
})
test('local affirmative confirmation is mandatory',()=>{
 const r=simulate('no_approval')
 assert.equal(r.status,1)
 assert.match(r.stderr,/explicit_local_confirmation_required/)
})
