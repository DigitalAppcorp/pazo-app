import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {createP28VersionedFingerprint as create} from '../../../../supabase/functions/f16-paypal-webhook/p28VersionedFingerprint.mjs'
const a='a'.repeat(48),b='b'.repeat(48),event='WH-P28-ROTATION'
test('active key version derives fingerprint and rotates without fallback',async()=>{
 const old=await create({activeVersion:'v1',keys:{v1:a},cryptoImpl:webcrypto})(event)
 const next=await create({activeVersion:'v2',keys:{v2:b},cryptoImpl:webcrypto})(event)
 assert.equal(old.keyVersion,'v1');assert.equal(next.keyVersion,'v2')
 assert.match(next.eventFingerprint,/^[0-9a-f]{64}$/)
 assert.notEqual(old.eventFingerprint,next.eventFingerprint)
})
test('missing active key, multiple keys, weak key and invalid version fail closed',async()=>{
 for(const params of [{activeVersion:'v2',keys:{v1:a}},
 {activeVersion:'v2',keys:{v1:a,v2:b}},
 {activeVersion:'v2',keys:{v2:'short'}},
 {activeVersion:'latest',keys:{latest:b}}]){
  assert.equal(await create({...params,cryptoImpl:webcrypto})(event),null)
 }
})
