import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const script=fileURLToPath(new URL('../../../../scripts/f16-sandbox-auth-bound-e2e.mjs',import.meta.url))
const preflight=env=>spawnSync(process.execPath,[script,'--preflight'],{
 encoding:'utf8',
 env:{...process.env,
  PAYPAL_SANDBOX_CLIENT_ID:'',
  PAYPAL_SANDBOX_CLIENT_SECRET:'',
  PAZO_F16_SUPABASE_SECRET_KEY:'',
  ...env,
 },
 timeout:20000,
})
test('F16 preflight makes no network calls or writes with no configured secrets',()=>{
 const r=preflight()
 assert.equal(r.status,0,r.stderr)
 const o=JSON.parse(r.stdout)
 assert.equal(o.environment,'sandbox')
 assert.equal(o.mode,'preflight')
 assert.equal(o.networkCalls,0)
 assert.equal(o.writes,0)
 assert.equal(o.merchantClientConfigured,false)
 assert.equal(o.merchantSecretConfigured,false)
 assert.equal(o.supabaseServerSecretConfigured,false)
 assert.equal(o.mayGrantBenefits,false)
})
test('F16 preflight discloses booleans only, never merchant or Supabase secrets',()=>{
 const env={
  PAYPAL_SANDBOX_CLIENT_ID:'MOCK_PAYPAL_PRIVATE_CLIENT_24680',
  PAYPAL_SANDBOX_CLIENT_SECRET:'MOCK_PAYPAL_PRIVATE_SECRET_86420',
  PAZO_F16_SUPABASE_SECRET_KEY:'MOCK_SUPABASE_PRIVATE_SERVER_SECRET_12579',
 }
 const r=preflight(env)
 assert.equal(r.status,0,r.stderr)
 const o=JSON.parse(r.stdout)
 assert.equal(o.merchantClientConfigured,true)
 assert.equal(o.merchantSecretConfigured,true)
 assert.equal(o.supabaseServerSecretConfigured,true)
 assert.equal(o.networkCalls,0)
 assert.equal(o.writes,0)
 for(const secret of Object.values(env))
  assert.equal((r.stdout+r.stderr).includes(secret),false)
 assert.equal((r.stdout+r.stderr).includes('I-PAZO'),false)
})
test('F16 unsupported CLI mode does not create a subscription or reveal details',()=>{
 const r=spawnSync(process.execPath,[script,'--send-money-live'],{
 encoding:'utf8',timeout:20000,
 env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:'',
  PAYPAL_SANDBOX_CLIENT_SECRET:'',PAZO_F16_SUPABASE_SECRET_KEY:''},
 })
 assert.equal(r.status,2)
 const o=JSON.parse(r.stderr)
 assert.equal(o.step,'BLOCKED')
 assert.equal(o.why,'f16_unsupported_mode')
 assert.equal(o.mayGrantBenefits,false)
 assert.equal(o.paidThrough,null)
})

test('F16 remote validation without private env fails before network or writes',()=>{
 const r=spawnSync(process.execPath,[script,'--validate-remote'],{
  encoding:'utf8',timeout:20000,
  env:{...process.env,PAYPAL_SANDBOX_CLIENT_ID:'',
   PAYPAL_SANDBOX_CLIENT_SECRET:'',PAZO_F16_SUPABASE_SECRET_KEY:''},
 })
 assert.equal(r.status,2)
 assert.equal(r.stdout,'')
 const o=JSON.parse(r.stderr)
 assert.equal(o.step,'BLOCKED')
 assert.equal(o.why,'f16_missing_private_env')
 assert.equal(o.mayGrantBenefits,false)
})
