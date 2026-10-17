import test from 'node:test'
import assert from 'node:assert/strict'
import {
  F16_SANDBOX_BENEFITS_OFFER_V2 as policy,
  F16_SANDBOX_BENEFITS_V2_COPY as copy,
  isF16SandboxBenefitsV2PublishedOffer as accepts
} from '../sandboxBenefitsOfferV2.mjs'
import {
  F16_P06_SANDBOX_QA_COPY_REVIEW_ONLY as old,
  F16_P06_SANDBOX_QA_COPY_LOCALES as oldCopy,
} from '../sandboxQaOfferCopyP06.mjs'
import {readFileSync} from 'node:fs'

test('Sandbox four-benefit contract uses NEW immutable version and stays unpublished',()=>{
 assert.equal(policy.environment,'sandbox')
 assert.equal(policy.version,'pazo-supporter-sandbox.benefits-v2')
 assert.notEqual(policy.version,old.version)
 assert.equal(policy.priceMinor,299)
 assert.equal(policy.currency,'USD')
 assert.equal(policy.cadence,'MONTH_1')
 assert.equal(policy.state,'UNPUBLISHED_PO_REVIEW_REQUIRED')
 assert.equal(policy.mayPublish,false)
 assert.equal(policy.mayCreateCheckout,false)
 assert.equal(policy.mayGrantBenefits,false)
 assert.deepEqual([...policy.benefits],[
  'badge','five-themes','opt-in-wall','elapsed-paid-cycle-medals'])
})

test('Both languages disclose real four perks, renewal, free product, separate wall consent',()=>{
 for(const locale of ['es','en']){
   const offer=copy[locale]
   const text=offer.exactCopy
   assert.ok(text.length>750 && text.length<11500)
   assert.match(text,/2\.99/)
   assert.match(text,/Sandbox/i)
   assert.match(text,locale==='es'?/NO SE UTILIZA DINERO REAL/:/NO REAL MONEY/)
   for(const fragment of locale==='es'
     ? ['insignia Amigo de PAZO','cinco fondos','muro público','3, 6 y 12','consentimiento','renovación automática']
     : ['Friend of PAZO badge','five pet profile themes','public Thank You','3, 6 and 12','consent','automatically renewed']){
    assert.ok(text.includes(fragment),`Missing ${fragment} in ${locale}`)
   }
   const valid={version:policy.version,locale,priceMinor:299,
     currency:'USD',cadence:'MONTH_1',termsDigest:'a'.repeat(64),exactCopy:text}
   assert.equal(accepts(valid,locale),true)
   for(const change of [
     {version:old.version},
     {exactCopy:oldCopy[locale].exactCopy},
     {exactCopy:text.replace('US$2.99','US$3.99')},
     {priceMinor:399},{termsDigest:'wrong'},{locale:locale==='es'?'en':'es'}
   ])assert.equal(accepts({...valid,...change},locale),false)
 }
})

test('Sandbox UI and backend both refuse old P06 terms; public latch remains OFF',()=>{
 const panel=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')
 assert.ok(panel.includes("const BENEFITS_V2='pazo-supporter-sandbox.benefits-v2'"))
 assert.ok(panel.includes("o.version!==BENEFITS_V2"))
 assert.ok(server.includes("const SANDBOX_BENEFITS_OFFER_V2='pazo-supporter-sandbox.benefits-v2'"))
 assert.ok(server.includes("data.consent?.termsVersion!==SANDBOX_BENEFITS_OFFER_V2"))
 assert.ok(server.includes('offer?.version===SANDBOX_BENEFITS_OFFER_V2'))
 assert.ok(server.includes('const QA_CHECKOUT_RELEASE_APPROVED = false'))
 assert.match(panel,/setConsent\(false\)/)
 assert.match(panel,/!consent\|\|busy/)
 assert.doesNotMatch(server,/const QA_CHECKOUT_RELEASE_APPROVED = true/)
})
