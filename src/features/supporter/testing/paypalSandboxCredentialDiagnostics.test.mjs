import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectCredentialFormat, safeOauthErrorCode } from './paypalSandboxCredentialDiagnostics.mjs'
test('accepts credential-shaped strings without returning their contents', () => {
  const x=inspectCredentialFormat('PAYPAL_EXAMPLE_ID','PAYPAL_EXAMPLE_SECRET')
  assert.deepEqual(x,{ok:true,reason:null})
  assert.equal(JSON.stringify(x).includes('SECRET'),false)
})
test('rejects invisible trailing spaces and control characters without leaking values',()=>{
  assert.equal(inspectCredentialFormat('ID ','SECRET').reason,'credentials_contain_outer_whitespace')
  assert.equal(inspectCredentialFormat('ID',' SECRET').reason,'credentials_contain_outer_whitespace')
  assert.equal(inspectCredentialFormat('ID','SECRET\r\n').reason,'credentials_contain_control_characters')
  assert.equal(inspectCredentialFormat('ID','SECRET\u0000').reason,'credentials_contain_control_characters')
})
test('rejects missing credentials and colon in Basic-auth ID',()=>{
  assert.equal(inspectCredentialFormat('ID','').reason,'credentials_missing')
  assert.equal(inspectCredentialFormat('user:name','SECRET').reason,'client_id_contains_colon')
})
test('never reflects arbitrary provider response text',()=>{
  assert.equal(safeOauthErrorCode({error:'invalid_client',error_description:'SHOULD_NOT_APPEAR'}),'invalid_client')
  assert.equal(safeOauthErrorCode({error:'SHOULD_NOT_APPEAR'}),null)
  assert.equal(safeOauthErrorCode(null),null)
})
