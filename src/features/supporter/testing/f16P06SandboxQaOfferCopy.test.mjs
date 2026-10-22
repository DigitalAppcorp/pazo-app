import test from 'node:test'
import assert from 'node:assert/strict'
import {
 F16_P06_SANDBOX_QA_COPY_REVIEW_ONLY as scope,
 F16_P06_SANDBOX_QA_COPY_LOCALES as locales,
} from '../sandboxQaOfferCopyP06.mjs'

test('Sandbox test copy is review-only and impossible to treat as released Live text',()=>{
 assert.equal(scope.status,'QA_COPY_REVIEW_ONLY_NOT_PUBLISHED')
 assert.equal(scope.publishedAt,null)
 assert.equal(scope.mayPublish,false)
 assert.equal(scope.mayEnableLive,false)
 assert.equal(scope.mayGrantBenefits,false)
 assert.equal(scope.priceMinor,299)
 assert.equal(scope.currency,'USD')
 assert.equal(scope.cadence,'MONTH_1')
 assert.match(scope.version,/^pazo-supporter-[a-z0-9.-]{3,40}$/)
})
test('Both immutable-candidate locales disclose no real payment and cancellation without placeholders',()=>{
 assert.deepEqual(Object.keys(locales).sort(),['en','es'])
 for(const [lang,item] of Object.entries(locales)){
  assert.equal(item.locale,lang)
  assert.ok(item.exactCopy.length>=100&&item.exactCopy.length<=12000)
  assert.ok(item.consentLabel.length>=35)
  assert.doesNotMatch(item.exactCopy,/\[(?:ENLACE|CONFIRMACION|CANCELLATION|ACKNOWLEDGEMENT)[^\]]*\]/i)
  assert.match(item.exactCopy,/Sandbox/i)
  assert.match(item.exactCopy,/2\.99/)
  assert.match(item.exactCopy,/appdigital\.corp@gmail\.com/)
  assert.match(item.exactCopy,lang==='es'?/SIN DINERO REAL/:/NO REAL MONEY/)
  assert.match(item.exactCopy,lang==='es'?/Cancelar renovación/:/Cancel renewal/)
  assert.match(item.exactCopy,lang==='es'?/PAZO.+gratuit/:/PAZO.+free/)
 }
})
