import test from 'node:test'
import assert from 'node:assert/strict'
import {createPazoLiveEdgeGenerationSecretReader} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveEdgeGenerationSecrets.mjs'
const g7={
 PAZO_F16_LIVE_HISTORICAL_GENERATIONS:'7,8',
 PAZO_F16_LIVE_G7_READ_ENABLED:'1',
 PAZO_F16_LIVE_G7_PLAN_ID:'P-ABCDEFGHIJKLMN',
 PAZO_F16_LIVE_G7_WEBHOOK_ID:'WH-WEBHOOKLIVE7',
 PAZO_F16_LIVE_G7_MERCHANT_FINGERPRINT_SHA256:'a'.repeat(64),
 PAZO_F16_LIVE_G7_CLIENT_ID:'CLIENT_LIVE_SEVEN_ABCD',
 PAZO_F16_LIVE_G7_CLIENT_SECRET:'SECRET_LIVE_SEVEN_ABCD',
 PAZO_F16_LIVE_G8_READ_ENABLED:'1',
 PAZO_F16_LIVE_G8_PLAN_ID:'P-OTHERPLAN12345',
 PAZO_F16_LIVE_G8_WEBHOOK_ID:'WH-WEBHOOKLIVE8',
 PAZO_F16_LIVE_G8_MERCHANT_FINGERPRINT_SHA256:'b'.repeat(64),
 PAZO_F16_LIVE_G8_CLIENT_ID:'CLIENT_LIVE_EIGHT_ABCD',
 PAZO_F16_LIVE_G8_CLIENT_SECRET:'SECRET_LIVE_EIGHT_ABCD',
 PAZO_F16_PAYPAL_CLIENT_ID:'LEGACY_NEVER_USE'
}
function resolver(config=g7,released=true){
 const reads=[]
 const reader=createPazoLiveEdgeGenerationSecretReader({
  released,getSecret:k=>{reads.push(k);return config[k]}
 })
 return {reader,reads}
}
const arg={merchantGeneration:7,sourceEnvironment:'live'}
test('LIVE historical secret generation is hard OFF until explicitly released',async()=>{
 const {reader,reads}=resolver(g7,false)
 await assert.rejects(()=>reader(arg),/live_original_merchant_secret_unavailable/)
 assert.deepEqual(reads,[])
})
test('pinned G7 uses only its namespace even when G8 is configured',async()=>{
 const {reader,reads}=resolver()
 const d=await reader(arg)
 assert.equal(d.generation,7)
 assert.equal(d.planId,g7.PAZO_F16_LIVE_G7_PLAN_ID)
 assert.equal(d.clientSecret,g7.PAZO_F16_LIVE_G7_CLIENT_SECRET)
 assert.equal(d.merchantFingerprint,'a'.repeat(64))
 assert.equal(reads.length,7)
 assert.ok(reads.every(k=>k==='PAZO_F16_LIVE_HISTORICAL_GENERATIONS'||
   k.startsWith('PAZO_F16_LIVE_G7_')))
 assert.ok(!reads.some(k=>k==='PAZO_F16_PAYPAL_CLIENT_ID'))
 const d8=await reader({merchantGeneration:8,sourceEnvironment:'live'})
 assert.equal(d8.planId,g7.PAZO_F16_LIVE_G8_PLAN_ID)
 assert.equal(d8.clientSecret,g7.PAZO_F16_LIVE_G8_CLIENT_SECRET)
})
test('Sandbox or arbitrary generation and unlisted merchants never read namespace',async()=>{
 const {reader,reads}=resolver()
 for(const x of [
  {merchantGeneration:7,sourceEnvironment:'sandbox'},
  {merchantGeneration:0,sourceEnvironment:'live'},
  {merchantGeneration:10000,sourceEnvironment:'live'},
  {merchantGeneration:NaN,sourceEnvironment:'live'},
  {merchantGeneration:'7',sourceEnvironment:'live'}
 ]){
  await assert.rejects(()=>reader(x),/live_original_merchant_secret_unavailable/)
 }
 assert.deepEqual(reads,[])
 await assert.rejects(()=>reader({merchantGeneration:9,sourceEnvironment:'live'}),
  /live_original_merchant_secret_unavailable/)
 assert.deepEqual(reads,['PAZO_F16_LIVE_HISTORICAL_GENERATIONS'])
})
test('missing one G7 credential never silently falls back to G8 or global Sandbox',async()=>{
 for(const field of ['PAZO_F16_LIVE_G7_CLIENT_SECRET','PAZO_F16_LIVE_G7_PLAN_ID',
 'PAZO_F16_LIVE_G7_WEBHOOK_ID','PAZO_F16_LIVE_G7_MERCHANT_FINGERPRINT_SHA256',
 'PAZO_F16_LIVE_G7_READ_ENABLED']){
  const partial={...g7,[field]:undefined}
  const {reader,reads}=resolver(partial)
  await assert.rejects(()=>reader(arg),/live_original_merchant_secret_unavailable/)
  assert.ok(reads.every(k=>k==='PAZO_F16_LIVE_HISTORICAL_GENERATIONS'||
   k.startsWith('PAZO_F16_LIVE_G7_')))
 }
})
test('registry cannot be a browser-supplied path or repeated / unbounded generations',async()=>{
 for(const list of ['7,7','7,01','07','7, 8','7;8','7,99999',
  Array.from({length:17},(_,i)=>i+1).join(','),'__proto__']){
  const {reader}=resolver({...g7,PAZO_F16_LIVE_HISTORICAL_GENERATIONS:list})
  await assert.rejects(()=>reader(arg),/live_original_merchant_secret_unavailable/)
 }
})
test('reader has no default process/env access and rejects missing accessor',()=>{
 assert.throws(()=>createPazoLiveEdgeGenerationSecretReader({released:true}),
 /live_edge_secret_accessor_not_configured/)
})
