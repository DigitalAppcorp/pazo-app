import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {getPazoLiveOffer,verifyPazoLiveOfferConsent,readPazoLiveAcceptedOffer,PAZO_LIVE_OFFER_VERSION}
 from '../../../../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'
const expected={es:'b3b6614d95ea6bb600fe9479ac4be115d39769f1e38a4fc30b7cb4273573dbb1',
 en:'eb7f13dc7bb212a83223af0f260d77c5ac66ee993d5e090a3d7e6e7e886484b9'}
test('each immutable language has a distinct digest covering version, locale, title, consent and full text',()=>{
 for(const locale of ['es','en']){
  const o=getPazoLiveOffer(locale)
  assert.equal(o.version,PAZO_LIVE_OFFER_VERSION);assert.equal(o.priceMinor,299);assert.equal(o.currency,'USD')
  assert.equal(o.cadence,'MONTH_1');assert.equal(o.termsDigest,expected[locale]);assert.ok(Object.isFrozen(o))
  const digest=createHash('sha256').update([o.version,o.locale,o.title,o.consentLabel,o.exactCopy].join('\n'),'utf8').digest('hex')
  assert.equal(digest,o.termsDigest)
  assert.ok(!/DRAFT|PLACEHOLDER|TO_GENERATE|SANDBOX|PENDIENTE\]/.test(o.exactCopy))
 }
 assert.notEqual(expected.es,expected.en)
})
test('acceptance must bind the exact displayed language/version/digest and an affirmative choice',()=>{
 for(const locale of ['es','en']){
  const o=getPazoLiveOffer(locale),c={locale,termsVersion:o.version,termsDigest:o.termsDigest,affirmativeConsent:true}
  assert.equal(verifyPazoLiveOfferConsent(c),true);assert.equal(readPazoLiveAcceptedOffer(c),o)
  for(const bad of [{...c,affirmativeConsent:false},{...c,termsVersion:o.version+'-other'},
   {...c,termsDigest:'a'.repeat(64)},{...c,locale:locale==='es'?'en':'es'}]){
   assert.equal(verifyPazoLiveOfferConsent(bad),false)
  }
  assert.equal(readPazoLiveAcceptedOffer({...c,termsDigest:'a'.repeat(64)}),null)
 }
 for(const locale of [undefined,null,'ES','fr','__proto__','constructor'])assert.equal(getPazoLiveOffer(locale),null)
})
test('prospective copy preserves operator, monthly renewal, cancellation, optional wall consent and no return grant',()=>{
 const legal=readFileSync(new URL('../../legal/legalCopy.ts',import.meta.url),'utf8')
 assert.ok(legal.includes("PAZO_LEGAL_OPERATOR_NAME = 'Alvarado Solutions LLC'"))
 for(const locale of ['es','en']){
  const text=getPazoLiveOffer(locale).exactCopy
  assert.ok(text.includes('Alvarado Solutions LLC'));assert.ok(text.includes('appdigital.corp@gmail.com'))
  assert.ok(text.includes('3, 6'));assert.ok(text.includes('12'));assert.ok(text.includes('US$2.99 USD'))
  assert.match(text,locale==='es'?/permiso separado y revocable/:/separate, revocable permission/)
  assert.match(text,locale==='es'?/Cancelar renovación/:/Cancel renewal/)
  assert.match(text,locale==='es'?/regresar a PAZO no activa beneficios/:/returning to PAZO does not activate benefits/)
  assert.match(text,locale==='es'?/justo antes de la próxima fecha/:/immediately before the next billing date/)
  assert.match(text,locale==='es'?/período ya pagado, verificado y no revertido conserva/:/already paid, verified period that has not been reversed keeps/)
 }
})
