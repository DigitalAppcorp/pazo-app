import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectPayPalCertUrl,validatePayPalWebhookContext} from './paypalCertificateUrlPolicy.mjs'
const sandbox='https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-ab66f33d'
const live='https://api-m.paypal.com/v1/notifications/certs/CERT-abc123'
test('accepts only the matching official PayPal certificate endpoint per environment',()=>{
  assert.equal(inspectPayPalCertUrl(sandbox,'sandbox'),true)
  assert.equal(inspectPayPalCertUrl(live,'live'),true)
  assert.equal(inspectPayPalCertUrl(sandbox,'live'),false)
  assert.equal(inspectPayPalCertUrl(live,'sandbox'),false)
})
test('rejects redirects in URL form, credentials, non-HTTPS, lookalikes and non-certificate paths',()=>{
  for(const u of [
    sandbox.replace('https:','http:'),
    'https://api.sandbox.paypal.com.evil.example/v1/notifications/certs/x',
    'https://api.sandbox.paypal.com@evil.example/v1/notifications/certs/x',
    'https://evil:pass@api.sandbox.paypal.com/v1/notifications/certs/x',
    'https://api.sandbox.paypal.com:444/v1/notifications/certs/x',
    'https://api.sandbox.paypal.com/v1/notifications/certs/x?next=evil',
    'https://api.sandbox.paypal.com/v1/notifications/certs/x#hi',
    'https://api.sandbox.paypal.com/v1/notifications/certs/../other',
    'https://api.sandbox.paypal.com/v2/payments/captures/x',
    'file:///etc/passwd',
  ]) assert.equal(inspectPayPalCertUrl(u,'sandbox'),false,u)
})
test('fails closed on unknown env and sandbox/live mismatch',()=>{
  assert.equal(validatePayPalWebhookContext({environment:'sandbox',configuredEnvironment:'live',certificateUrl:sandbox,webhookId:'WH-ID'}),false)
  assert.equal(validatePayPalWebhookContext({environment:'sandbox',configuredEnvironment:'sandbox',certificateUrl:sandbox,webhookId:'WH-ID'}),true)
  assert.equal(validatePayPalWebhookContext({environment:'sandbox',configuredEnvironment:'sandbox',certificateUrl:sandbox,webhookId:''}),false)
  assert.equal(inspectPayPalCertUrl(sandbox,'staging'),false)
})
