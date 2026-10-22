import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getPazoLiveOffer,verifyPazoLiveOfferConsent}
 from '../../../../supabase/functions/pazo-paypal-live-checkout/liveOfferRegistry.mjs'

const ui=readFileSync(new URL('../../supporter/components/SupporterLiveCheckoutPanel.tsx',import.meta.url),'utf8')
const screen=readFileSync(new URL('../../supporter/components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
const hosted=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/liveHostedCheckout.mjs',import.meta.url),'utf8')

test('both exact immutable Live offers are rendered only with explicit separate consent',()=>{
 for(const locale of ['es','en']){
  const offer=getPazoLiveOffer(locale)
  assert.equal(offer.priceMinor,299)
  assert.equal(offer.cadence,'MONTH_1')
  assert.equal(offer.currency,'USD')
  assert.equal(verifyPazoLiveOfferConsent({locale,affirmativeConsent:true,
   termsVersion:offer.version,termsDigest:offer.termsDigest}),true)
  assert.equal(verifyPazoLiveOfferConsent({locale,affirmativeConsent:false,
   termsVersion:offer.version,termsDigest:offer.termsDigest}),false)
 }
 assert.match(ui,/offer\.exactCopy\.split/)
 assert.match(ui,/offer\.consentLabel/)
 assert.match(ui,/setAccepted\(false\)/)
 assert.match(ui,/!accepted\|\|attempted\.current/)
 assert.match(ui,/affirmativeConsent:true/)
})

test('readiness is server owned: no client-side flag may bypass worker/merchant gate',()=>{
 assert.match(screen,/<SupporterLiveCheckoutPanel lang=\{lang\} key=\{offerRefreshRevision\}/)
 assert.match(screen,/onAvailabilityChange=\{receiveLiveOfferState\}/)
 assert.match(screen,/liveOfferPhase==='loading'/)
 assert.match(screen,/liveOfferPhase==='blocked'/)
 assert.doesNotMatch(screen,/min-h-12 w-full cursor-not-allowed/)
 assert.match(screen,/import\.meta\.env\.DEV/)
 assert.match(screen,/\['localhost','127\.0\.0\.1'\]/)
 assert.match(ui,/code==='live_checkout_ready'/)
 assert.match(ui,/worker|backend readiness|backend must/)
 assert.match(hosted,/rpc\('workerHealth',\{\}\)/)
 assert.match(hosted,/worker\.processingAllowed!==true/)
 assert.match(hosted,/worker\.healthy!==true/)
 assert.match(hosted,/req\.method==='GET'/)
 const edge=readFileSync(new URL('../../../../supabase/functions/pazo-paypal-live-checkout/index.ts',import.meta.url),'utf8')
 assert.match(edge,/const CONTROLLED_CHECKOUT_RUNTIME=true/)
})

test('one attempt never repeats a PayPal CREATE after an uncertain outcome',()=>{
 assert.match(ui,/attempted\.current=true/)
 assert.match(ui,/crypto\.randomUUID\(\)/)
 assert.match(ui,/setStage\('review'\)/)
 assert.match(ui,/window\.location\.assign\(url\)/)
 assert.match(ui,/data\.phase==='APPROVAL_PENDING'/)
 assert.match(ui,/data\.entitlement===false/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|setInterval|retry_begin|retrySubscription/)
 assert.match(ui,/u\.hostname==='www\.paypal\.com'/)
 assert.match(ui,/u\.searchParams\.size===1/)
 assert.match(ui,/authorization:'Bearer '\+session\.access_token/)
})
