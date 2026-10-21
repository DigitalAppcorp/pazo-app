import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoScopedManagementTokenReader,MANAGEMENT_TOKEN_SECRET_NAME} from '../../../../supabase/functions/pazo-admin-paypal-provision/scopedManagementToken.mjs'
test('project-scoped Supabase management token is read only from trusted Edge env',()=>{
 assert.equal(MANAGEMENT_TOKEN_SECRET_NAME,'PAZO_F16_SCOPED_MANAGEMENT_TOKEN')
 const fake='sbp_fc'+ 'TEST_TOKEN_PRIVATE_'+ 'A'.repeat(25)
 const getToken=createPazoScopedManagementTokenReader({getEnv:name=>{
  assert.equal(name,MANAGEMENT_TOKEN_SECRET_NAME);return fake
 }})
 assert.equal(getToken(),fake)
})
test('unscoped legacy PAT, empty values or transport errors are rejected',()=>{
 for(const value of [null,undefined,'','sbp_legacy_token_'+'X'.repeat(32),'TOKEN_IN_BROWSER']){
  assert.throws(()=>createPazoScopedManagementTokenReader({getEnv:()=>value})(),
   /scoped_management_token_unavailable/)
 }
 assert.throws(()=>createPazoScopedManagementTokenReader({getEnv:()=>{throw Error('do not echo secrets')}})(),
  e=>e.message==='scoped_management_token_unavailable')
})
