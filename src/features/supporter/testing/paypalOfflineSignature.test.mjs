import test from 'node:test'
import assert from 'node:assert/strict'
import { createSign, generateKeyPairSync } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crc32Decimal, paypalSignedMessage, verifyPaypalSignatureOffline } from './paypalOfflineSignature.mjs'

// Self-signed disposable fixture: ONLY tests local RSA math, not PayPal certificate trust.
const dir=mkdtempSync(join(tmpdir(),'pazo-paypal-sign-'))
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048})
writeFileSync(join(dir,'key.pem'),privateKey.export({format:'pem',type:'pkcs8'}))
execFileSync('openssl',['req','-new','-x509','-key',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=offline-fixture.invalid'],{stdio:'ignore'})
const cert=readFileSync(join(dir,'cert.pem'),'utf8')
rmSync(dir,{recursive:true,force:true})
function signed(body,webhookId='WH-ID') {
  const headers={'paypal-transmission-id':'tx-1','paypal-transmission-time':'2026-10-13T10:00:00Z','paypal-auth-algo':'SHA256withRSA'}
  const signer=createSign('RSA-SHA256');signer.update(paypalSignedMessage({rawBody:body,headers,webhookId}),'utf8');signer.end()
  headers['paypal-transmission-sig']=signer.sign(privateKey).toString('base64')
  return {rawBody:body,headers,webhookId,trustedCertificatePem:cert}
}
test('CRC32 fixture matches standard 123456789 value',()=> {
  assert.equal(crc32Decimal(new TextEncoder().encode('123456789')),'3421780262')
})
test('valid local RSA SHA256 signature passes using exact bytes',()=> {
  const b=new TextEncoder().encode('{"id":"WH-1","event_type":"PAYMENT.SALE.COMPLETED"}')
  assert.equal(verifyPaypalSignatureOffline(signed(b)),true)
})
test('body tamper fails even for semantically equivalent JSON',()=> {
  const b=new TextEncoder().encode('{"id":"WH-1"}')
  const x=signed(b)
  assert.equal(verifyPaypalSignatureOffline({...x,rawBody:new TextEncoder().encode('{ "id":"WH-1" }')}),false)
})
test('mismatched webhook ID, transmission and signature fail',()=> {
  const x=signed(new TextEncoder().encode('{}'))
  assert.equal(verifyPaypalSignatureOffline({...x,webhookId:'other'}),false)
  assert.equal(verifyPaypalSignatureOffline({...x,headers:{...x.headers,'paypal-transmission-id':'tx-2'}}),false)
  assert.equal(verifyPaypalSignatureOffline({...x,headers:{...x.headers,'paypal-transmission-sig':'AAAA'}}),false)
})
test('unsupported algorithm or untrusted/missing PEM fails closed',()=> {
  const x=signed(new TextEncoder().encode('{}'))
  assert.equal(verifyPaypalSignatureOffline({...x,headers:{...x.headers,'paypal-auth-algo':'SHA1withRSA'}}),false)
  assert.equal(verifyPaypalSignatureOffline({...x,trustedCertificatePem:''}),false)
})
