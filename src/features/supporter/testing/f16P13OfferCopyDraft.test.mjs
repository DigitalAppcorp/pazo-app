import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
 F16_P13_DRAFT_SCOPE as plan,
 F16_P13_DRAFT_LOCALES as locale,
 F16_P13_COPY_RELEASE_BLOCKERS as blockers,
} from '../offerCopyDraftP13.mjs'
test('P13 proposal matches PO approved monthly optional free-core scope',()=>{
 assert.equal(plan.product,'PAZO_OPTIONAL_SUPPORTER')
 assert.equal(plan.priceMinor,299)
 assert.equal(plan.currency,'USD')
 assert.equal(plan.cadence,'MONTH_1')
 assert.equal(plan.trial,false)
 assert.equal(plan.annualPlan,false)
 assert.equal(plan.planId,'P-14V25407JP6850922NLHMDKI')
})
test('both languages contain visible recurring terms and honest reward status',()=>{
 for(const lang of ['es','en']){
  const x=locale[lang]
  assert.equal(x.locale,lang)
  assert.ok(x.exactCopy.length>=100&&x.exactCopy.length<=12000)
  assert.ok(x.heading.includes('US$2.99'))
  assert.ok(x.consentLabel.includes('US$2.99'))
  assert.ok(x.exactCopy.includes('US$2.99'))
  assert.ok(x.exactCopy.includes('PayPal'))
  assert.ok(x.exactCopy.includes('appdigital.corp@gmail.com'))
  assert.ok(!/(\$24|free trial included|prueba gratuita incluida|100% legal|approved by counsel)/i.test(x.exactCopy))
 }
 assert.match(locale.es.exactCopy,/se renovará automáticamente/)
 assert.match(locale.en.exactCopy,/automatically renews monthly/)
 assert.match(locale.es.exactCopy,/todavía no están completamente implementadas/)
 assert.match(locale.en.exactCopy,/not yet fully implemented/)
 assert.match(locale.es.exactCopy,/cada mascota/)
 assert.match(locale.en.exactCopy,/each separately authorized pet/)
 assert.match(locale.es.exactCopy,/pendiente o fallido/)
 assert.match(locale.en.exactCopy,/Pending or failed/)
})
test('P13 disclosure has no route to published offer or checkout',()=>{
 assert.equal(plan.status,'REVIEW_ONLY_NOT_PUBLISHED')
 assert.equal(plan.publishedAt,null)
 for(const k of ['mayPublish','mayShowAsPurchaseOffer','mayStartPayPalCheckout',
  'mayGrantBenefits']) assert.equal(plan[k],false)
 assert.match(locale.es.exactCopy,/\[ENLACE_DE_CANCELACION_PENDIENTE\]/)
 assert.match(locale.en.exactCopy,/\[CANCELLATION_LINK_PENDING\]/)
 assert.match(locale.es.exactCopy,/\[CONFIRMACION_CONSERVABLE_PENDIENTE\]/)
 assert.match(locale.en.exactCopy,/\[RETAINABLE_ACKNOWLEDGEMENT_PENDING\]/)
 assert.ok(blockers.includes('legal_review_and_product_owner_approval'))
 assert.ok(blockers.includes('direct_online_cancellation_operational'))
 assert.ok(blockers.includes('actual_benefits_available_and_financial_entitlement_verified'))
 const sql=fs.readFileSync(
  new URL('../../../../supabase/drafts/f16_p12_staged_install_REQUIRES_PO_GO.sql',import.meta.url),
  'utf8')
 assert.doesNotMatch(sql,/INSERT INTO supporter_private\.paypal_p06_offers/)
 for(const lang of ['es','en']){
  assert.ok(!sql.includes(locale[lang].exactCopy))
 }
})

test('draft describes PO-approved activation-to-merchant billing boundary without authorizing access',()=>{
 const es=locale.es.exactCopy,en=locale.en.exactCopy
 for(const [copy,checks] of [
  [es,[/activación PayPal comprobada/,/próxima fecha de facturación observada/,/límite de servicio acordado por PAZO/,/30 días contados desde el cobro/,/recompensas de ese ciclo permanecerán en revisión/]],
  [en,[/PayPal activation time verified by PAZO/,/next billing date observed by PAZO at activation/,/PAZO contractual service boundary/,/30-day period starting on the charge date/,/rewards for the affected cycle remain under review/]],
 ]) for(const pattern of checks)assert.match(copy,pattern)
 assert.equal(plan.status,'REVIEW_ONLY_NOT_PUBLISHED')
 assert.equal(plan.mayPublish,false)
 assert.equal(plan.mayStartPayPalCheckout,false)
 assert.equal(plan.mayGrantBenefits,false)
})
test('draft does not claim historical Sandbox QA terms authorize a paid interval',()=>{
 for(const copy of [locale.es.exactCopy,locale.en.exactCopy]){
  assert.doesNotMatch(copy,/pazo-supporter-sandbox\.qa20261016-v1/)
  assert.doesNotMatch(copy,/paidThrough\s*[:=]\s*['"]?2026/)
 }
})
