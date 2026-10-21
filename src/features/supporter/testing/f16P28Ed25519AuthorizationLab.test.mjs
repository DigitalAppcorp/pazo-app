import test from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {p28CanonicalAuthorization as canonical,p28SignAuthorization as sign,p28VerifyAuthorization as verify} from '../../../../supabase/functions/f16-paypal-webhook/p28Ed25519AuthorizationLab.mjs'
const base={eventId:'WH-P28-ALPHA',requestId:'11111111-1111-4111-8111-111111111111',keyVersion:'v1',expiresAt:1790000000}
test('Ed25519 signature binds event, request, version and expiry',async()=>{
 const keys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
 const msg=canonical(base)
 const signature=await sign({payload:msg,privateKey:keys.privateKey,cryptoImpl:webcrypto})
 assert.equal(await verify({payload:msg,signature,publicKey:keys.publicKey,cryptoImpl:webcrypto}),true)
 for(const diff of [{eventId:'WH-P28-BETA'},{requestId:'22222222-2222-4222-8222-222222222222'},{keyVersion:'v2'},{expiresAt:1790000001}]){
  const other=canonical({...base,...diff})
  assert.equal(await verify({payload:other,signature,publicKey:keys.publicKey,cryptoImpl:webcrypto}),false)
 }
 const other=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
 assert.equal(await verify({payload:msg,signature,publicKey:other.publicKey,cryptoImpl:webcrypto}),false)
})
test('invalid canonical request and missing signature deny',async()=>{
 assert.equal(canonical({...base,eventId:'*'}),null)
 assert.equal(canonical({...base,keyVersion:'retired'}),null)
 assert.equal(await verify({payload:canonical(base),signature:new Uint8Array(4)}),false)
})
