import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, createSign } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { receivePaypalEvent } from './offlineWebhookIntake.mjs'
import { verifyPayPalCertificateBoundSignature } from './paypalCertificateBoundVerifier.mjs'
import { paypalSignedMessage } from './paypalOfflineSignature.mjs'

// Offline end-to-end acceptance only. Disposable self-signed cert is NOT PayPal trust.
// The injected fetch simulates a hardened server HTTP client; no requests are made.
test('signed event enters inbox only once; tampering, wrong environment and untrusted cert fail closed', async () => {
  const dir=mkdtempSync(join(tmpdir(),'pazo-paypal-e2e-'))
  try {
    const { privateKey }=generateKeyPairSync('rsa',{modulusLength:2048})
    writeFileSync(join(dir,'key.pem'),privateKey.export({format:'pem',type:'pkcs8'}))
    execFileSync('openssl',['req','-new','-x509','-key',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=offline-fixture.invalid'],{stdio:'ignore'})
    const certificatePem=readFileSync(join(dir,'cert.pem'),'utf8')
    const webhookId='WH-E2E-TEST'
    const headers={
      'content-type':'application/json',
      'paypal-transmission-id':'tx-123',
      'paypal-transmission-time':'2026-10-13T12:00:00Z',
      'paypal-auth-algo':'SHA256withRSA',
      'paypal-cert-url':'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-offline',
    }
    const body=new TextEncoder().encode(JSON.stringify({id:'WH-E2E-1',event_type:'PAYMENT.SALE.COMPLETED'}))
    const signer=createSign('RSA-SHA256')
    signer.update(paypalSignedMessage({rawBody:body,headers,webhookId}),'utf8');signer.end()
    headers['paypal-transmission-sig']=signer.sign(privateKey).toString('base64')
    const received=[]
    const inbox={insertIfAbsent:async event=>{
      if(received.some(x=>x.eventId===event.eventId)) return false
      received.push(event)
      return true
    }}
    const fetchCertificate=async (_url,options)=>{
      assert.equal(options.redirect,'error')
      assert.equal(options.environment,'sandbox')
      return {status:200,redirected:false,certificatePem}
    }
    const makeVerifier=environment=>({rawBody,headers,webhookId})=>verifyPayPalCertificateBoundSignature({
      rawBody,headers,webhookId,environment,fetchCertificate,
    })
    const req={method:'POST',body,headers}
    const sandbox={webhookId,inbox,verifySignature:makeVerifier('sandbox')}
    assert.equal((await receivePaypalEvent(req,sandbox)).status,202)
    assert.equal((await receivePaypalEvent(req,sandbox)).status,200)
    assert.equal(received.length,1)
    assert.equal((await receivePaypalEvent({...req,body:new TextEncoder().encode('{"id":"WH-E2E-2","event_type":"PAYMENT.SALE.COMPLETED"}')},sandbox)).status,401)
    assert.equal((await receivePaypalEvent(req,{...sandbox,verifySignature:makeVerifier('live')})).status,401)
    assert.equal(received.length,1)
    assert.deepEqual(received[0],{provider:'paypal',eventId:'WH-E2E-1',eventType:'PAYMENT.SALE.COMPLETED'})
    // Inbox acceptance is NOT payment verification or membership activation.
  } finally {rmSync(dir,{recursive:true,force:true})}
})
