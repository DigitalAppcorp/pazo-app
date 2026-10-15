import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { PAZO_REQUIRED_PAYPAL_EVENTS,
 PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS } from './paypalSandboxWebhookContract.mjs'

const ID='offline_client_id'
const SECRET='offline_client_secret'
function run(mode) {
  const fixture={webhooks:[{id:'WH-TEST123',url:'https://example.com/paypal/events',
    event_types:[...PAZO_REQUIRED_PAYPAL_EVENTS,
      ...(mode==='ready_complete'?PAZO_REQUIRED_PAYPAL_DISPUTE_EVENTS:[])].map(name=>({name}))}]}
  const stub=[
    'const mode = '+JSON.stringify(mode)+';',
    'const fixture = '+JSON.stringify(fixture)+';',
    'globalThis.fetch=async (url, opts)=>{',
    'if(url==="https://api-m.sandbox.paypal.com/v1/oauth2/token"){',
    'if(opts.method!=="POST" || opts.headers.Authorization!=="Basic "+Buffer.from("offline_client_id:offline_client_secret").toString("base64")) throw Error("invalid request")',
    'if(mode==="auth_failed") return {ok:false,status:401,json:async()=>({error:"invalid_client",error_description:"offline_client_secret"})};',
    'return {ok:true,json:async()=>({token_type:"Bearer",access_token:"dummy_token"})};}',
    'if(url!=="https://api-m.sandbox.paypal.com/v1/notifications/webhooks" || opts.method!=="GET" || opts.headers.Authorization!=="Bearer dummy_token") throw Error("unexpected endpoint");',
    'if(mode==="no_hooks") return {ok:true,json:async()=>({webhooks:[]})};',
    'if(mode==="list_failed") return {ok:false,status:403,json:async()=>({})};',
    'return {ok:true,json:async()=>fixture};',
    '};',
  ].join('\n')
  const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(stub),
    'scripts/f16-paypal-verify-webhooks-readonly.mjs'],{
      cwd:process.cwd(),env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:ID,PAYPAL_SANDBOX_CLIENT_SECRET:SECRET},
      encoding:'utf8',timeout:10000,
    })
  assert.equal(r.error,undefined,String(r.error))
  assert.equal((r.stdout+r.stderr).includes(SECRET),false,'secret must not be printed')
  assert.equal((r.stdout+r.stderr).includes(ID),false,'client ID must not be printed')
  assert.equal((r.stdout+r.stderr).includes('example.com'),false,'webhook URL must not be printed')
  return r
}
test('sale subscriptions may be configured yet dispute coverage blocks finance',()=>{
  const r=run('ready')
  assert.equal(r.status,1,r.stderr)
  assert.match(r.stdout,/"subscriptions_configured"/)
  assert.match(r.stdout,/"financialReconciliationReady": false/)
  assert.match(r.stdout,/"CUSTOMER.DISPUTE.CREATED"/)
  assert.match(r.stdout,/"webhookId": "WH-TEST123"/)
})
test('the read-only preflight returns success only with matching dispute coverage',()=>{
  const r=run('ready_complete')
  assert.equal(r.status,0,r.stderr)
  assert.match(r.stdout,/"financialReconciliationReady": true/)
  assert.match(r.stdout,/"subscriptions_configured"/)
})
test('distinguishes missing webhook from PayPal authentication error',()=>{
  const empty=run('no_hooks')
  assert.equal(empty.status,1,empty.stderr)
  assert.match(empty.stdout,/"needs_webhook_configuration"/)
  const auth=run('auth_failed')
  assert.equal(auth.status,2,auth.stderr)
  assert.match(auth.stderr,/oauth_token failed: HTTP 401 \(invalid_client\)/)
})
test('reports PayPal permission failure at webhook list stage without leaking response',()=>{
  const r=run('list_failed')
  assert.equal(r.status,2,r.stderr)
  assert.match(r.stderr,/webhooks_list failed: HTTP 403/)
})
