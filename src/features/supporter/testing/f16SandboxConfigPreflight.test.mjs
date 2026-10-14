import test from 'node:test'
import assert from 'node:assert/strict'
import {assessF16SandboxConfig} from '../../../../supabase/functions/f16-paypal-webhook/sandboxConfigPreflight.mjs'

const data={
  PAZO_F16_PAYPAL_ENV:'sandbox',
  PAZO_F16_PAYPAL_WEBHOOK_ID:'6N7889790V1467139',
  PAZO_F16_PAYPAL_PLAN_ID:'P-14V25407JP6850922NLHMDKI',
  SUPABASE_URL:'https://mrybvqdebbgcayuvgkkr.supabase.co',
  PAZO_F16_PAYPAL_CLIENT_ID:'sandbox-merchant-id-fixture',
  PAZO_F16_PAYPAL_CLIENT_SECRET:'sandbox-secret-fixture-private',
  SUPABASE_SERVICE_ROLE_KEY:'fixture-not-a-real-supabase-server-key-1234',
}
const check=(values)=>assessF16SandboxConfig({get:name=>values[name]})

test('accepts only fixed Sandbox account, webhook and injected Supabase scope',()=>{
  assert.deepEqual(check(data),{ready:true,missing:[],invalid:[]})
})
test('missing secrets are reported as variable names, NEVER values',()=>{
  const x={...data,PAZO_F16_PAYPAL_CLIENT_SECRET:undefined}
  const result=check(x)
  assert.equal(result.ready,false)
  assert.deepEqual(result.missing,['PAZO_F16_PAYPAL_CLIENT_SECRET'])
  assert.equal(JSON.stringify(result).includes(data.PAZO_F16_PAYPAL_CLIENT_ID),false)
  assert.equal(JSON.stringify(result).includes(data.SUPABASE_SERVICE_ROLE_KEY),false)
  assert.equal(JSON.stringify(result).includes(data.PAZO_F16_PAYPAL_CLIENT_SECRET),false)
})
test('Live or misdirected webhook must fail closed even when credentials look valid',()=>{
  for(const change of [
    {PAZO_F16_PAYPAL_ENV:'live'},
    {PAZO_F16_PAYPAL_WEBHOOK_ID:'DIFFERENT'},
    {PAZO_F16_PAYPAL_PLAN_ID:'P-DIFFERENT'},
    {SUPABASE_URL:'https://evil.example'},
  ]){
    const result=check({...data,...change})
    assert.equal(result.ready,false)
    assert.equal(result.invalid.length,1)
    assert.equal(result.missing.length,0)
  }
})
test('no environment or invalid credentials report only required names',()=>{
  const empty=assessF16SandboxConfig(null)
  assert.equal(empty.ready,false)
  assert.equal(empty.missing.length,7)
  const result=check({...data,
    PAZO_F16_PAYPAL_CLIENT_ID:'short',
    PAZO_F16_PAYPAL_CLIENT_SECRET:'bad\nsecret',
    SUPABASE_SERVICE_ROLE_KEY:'short',
  })
  assert.deepEqual(result.invalid,[
    'PAZO_F16_PAYPAL_CLIENT_ID','PAZO_F16_PAYPAL_CLIENT_SECRET','SUPABASE_SERVICE_ROLE_KEY',
  ])
  assert.equal(result.ready,false)
})
test('result cannot be mutated into a successful configuration',()=>{
  const result=check({...data,PAZO_F16_PAYPAL_ENV:'live'})
  assert.equal(Object.isFrozen(result),true)
  assert.equal(Object.isFrozen(result.invalid),true)
  assert.throws(()=>{result.ready=true},TypeError)
})
