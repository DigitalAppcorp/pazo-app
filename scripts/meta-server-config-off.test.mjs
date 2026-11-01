import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveMetaServerConfig,metaCredentialStatus}
  from '../supabase/functions/_shared/metaServerConfig.mjs'

const fixture=Object.freeze({
  META_DATASET_ID:'1438916858347709',
  META_CAPI_ACCESS_TOKEN:'synthetic_test_token_not_a_real_Meta_access_token',
})
const readSecret=(name)=>fixture[name]

test('OFF by default never even asks the environment for secrets',()=>{
  let reads=0
  const spy=()=>{reads++;throw Error('never read')}
  assert.equal(resolveMetaServerConfig({readSecret:spy}),null)
  assert.equal(resolveMetaServerConfig({
    releaseEnabled:true,readSecret:spy,apiVersion:'v24.0'}),null)
  assert.equal(resolveMetaServerConfig({
    privacyGateApproved:true,readSecret:spy,apiVersion:'v24.0'}),null)
  assert.equal(reads,0)
  assert.deepEqual(metaCredentialStatus({readSecret:spy}),{status:'disabled'})
  assert.equal(reads,0)
})
test('server resolves only the correct PAZO dataset and secrets',()=>{
  let calls=[]
  const result=resolveMetaServerConfig({
    releaseEnabled:true,privacyGateApproved:true,apiVersion:'v24.0',
    readSecret:name=>{calls.push(name);return fixture[name]}
  })
  assert.deepEqual(calls,['META_DATASET_ID','META_CAPI_ACCESS_TOKEN'])
  assert.equal(result.datasetId,fixture.META_DATASET_ID)
  assert.equal(result.serverToken,fixture.META_CAPI_ACCESS_TOKEN)
  assert.equal(result.apiVersion,'v24.0')
  assert.ok(Object.isFrozen(result))
  assert.deepEqual(metaCredentialStatus({
    releaseEnabled:true,privacyGateApproved:true,
    apiVersion:'v24.0',readSecret,
  }),{status:'configured'})
})
test('wrong dataset, absent token, whitespace and obsolete version fail closed',()=>{
  const base={releaseEnabled:true,privacyGateApproved:true,apiVersion:'v24.0'}
  const rejected=[
    {...base,readSecret:name=>name==='META_DATASET_ID'?'648944045758089':fixture[name]},
    {...base,readSecret:name=>name==='META_DATASET_ID'?'1234567890':undefined},
    {...base,readSecret:name=>name==='META_DATASET_ID'?fixture[name]:'short'},
    {...base,readSecret:name=>name==='META_DATASET_ID'?fixture[name]:'hello test token long length'},
    {...base,apiVersion:'invalid',readSecret},
    {...base,apiVersion:'v1.0',readSecret},
    {...base,readSecret:()=>{throw Error('secret store unavailable')}},
  ]
  for(const options of rejected){
    assert.equal(resolveMetaServerConfig(options),null)
    assert.deepEqual(metaCredentialStatus(options),{status:'not_configured'})
  }
})
test('status emits no secrets or credential lengths',()=>{
  const status=metaCredentialStatus({
    releaseEnabled:true,privacyGateApproved:true,apiVersion:'v24.0',readSecret,
  })
  const report=JSON.stringify(status)
  for(const privateString of Object.values(fixture))
    assert.equal(report.includes(privateString),false)
  assert.deepEqual(Object.keys(status),['status'])
})
