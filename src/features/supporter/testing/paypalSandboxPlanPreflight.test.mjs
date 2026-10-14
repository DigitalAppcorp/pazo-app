import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const ID = 'offline_client_id'
const SECRET = 'offline_client_secret'
function run(mode, secret=SECRET) {
  const stub = [
    'const mode = '+JSON.stringify(mode)+';',
    'globalThis.fetch=async (url,opts)=>{',
    ' const oauth=url.endsWith("/v1/oauth2/token");',
    ' if(oauth) {',
    '  if(opts.headers.Authorization!=="Basic "+Buffer.from("offline_client_id:offline_client_secret").toString("base64") || opts.body!=="grant_type=client_credentials") throw Error("bad_request_contract");',
    '  if(mode==="bad_oauth") return {ok:false,status:401,json:async()=>({error:"invalid_client",error_description:"offline_client_secret"})};',
    '  return {ok:true,json:async()=>({token_type:"Bearer",access_token:"dummy_token"})};',
    ' }',
    ' if(mode==="bad_plan") return {ok:false,status:401,json:async()=>({})};',
    ' if(mode!=="good_plan" || opts.headers.Authorization!=="Bearer dummy_token") throw Error("unexpected_plan_request");',
    ' return {ok:true,json:async()=>({id:"P-14V25407JP6850922NLHMDKI",status:"ACTIVE",billing_cycles:[{tenure_type:"REGULAR",frequency:{interval_unit:"MONTH",interval_count:1},total_cycles:0,pricing_scheme:{fixed_price:{currency_code:"USD",value:"2.99"}}}],payment_preferences:{setup_fee:{currency_code:"USD",value:"0.00"}}})};',
    '};',
  ].join('\n')
  const r=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(stub),'scripts/f16-paypal-verify-plan-readonly.mjs'],{
    cwd:process.cwd(),env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:ID,PAYPAL_SANDBOX_CLIENT_SECRET:secret},
    encoding:'utf8',timeout:10000,
  })
  assert.equal(r.error,undefined,String(r.error))
  assert.equal((r.stdout+r.stderr).includes(SECRET),false,'secret must never be echoed')
  assert.equal((r.stdout+r.stderr).includes(ID),false,'client ID must never be echoed')
  return r
}
test('OAuth rejects invalid credentials with a safe error code and no secret leak',()=>{
  const r=run('bad_oauth')
  assert.equal(r.status,2,r.stderr)
  assert.match(r.stderr,/oauth_token failed: HTTP 401 \(invalid_client\)/)
})
test('local whitespace error blocks before any HTTP call',()=>{
  const r=run('good_plan',' '+SECRET)
  assert.equal(r.status,2)
  assert.match(r.stderr,/credentials_contain_outer_whitespace/)
})
test('OAuth success but plan lookup 401 is correctly distinguished',()=>{
  const r=run('bad_plan')
  assert.equal(r.status,2,r.stderr)
  assert.match(r.stderr,/plan_lookup failed: HTTP 401/)
})
test('both OAuth and plan lookup work under a fully local mock',()=>{
  const r=run('good_plan')
  assert.equal(r.status,0,r.stderr)
  assert.match(r.stdout,/"ok": true/)
})
