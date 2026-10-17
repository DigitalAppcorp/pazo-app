import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {evaluateSupporterPitchEligibility as eligible, SUPPORTER_PITCH_POLICY as policy} from '../supporterPitchEligibility.mjs'

const now = Date.UTC(2026, 9, 17)
const DAY = 24 * 60 * 60 * 1000
const valid = () => ({
  isSupporter:false, isFirstSession:false, inOnboarding:false,
  inRescueFlow:false, isBusy:false,
  accountCreatedAtMs: now - 8*DAY, activeDaysInLast14:3,
  meaningfulActions:5, distinctActionSurfaces:2, lastDismissedAtMs:null,
})

test('F16 invitation requires established value and never interrupts rescue/onboarding',()=>{
 assert.equal(policy.minimumAccountDays,7)
 assert.equal(policy.dismissalCooldownDays,30)
 assert.deepEqual(eligible(valid(),now),{eligible:true,reason:'eligible'})
 for(const input of [
   {...valid(),accountCreatedAtMs:now-6*DAY},
   {...valid(),activeDaysInLast14:2},
   {...valid(),meaningfulActions:4},
   {...valid(),distinctActionSurfaces:1},
   {...valid(),isFirstSession:true},
   {...valid(),inOnboarding:true},
   {...valid(),inRescueFlow:true},
   {...valid(),isBusy:true},
   {...valid(),isSupporter:true},
   {...valid(),isSupporter:undefined},
   {...valid(),lastDismissedAtMs:now-29*DAY},
   {...valid(),lastDismissedAtMs:now+DAY},
   {...valid(),activeDaysInLast14:15},
   {...valid(),meaningfulActions:undefined},
   {},
   null,
 ])assert.equal(eligible(input,now).eligible,false,JSON.stringify(input))
 assert.equal(eligible({...valid(),lastDismissedAtMs:now-30*DAY},now).eligible,true)
 assert.equal(eligible(valid(),NaN).eligible,false)
})

test('F16 product page retains no-purchase path and real server-verified checkout',()=>{
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const pet=readFileSync(new URL('../../../components/views/PetView.tsx',import.meta.url),'utf8')
 assert.match(page,/Ayúdanos a mantener vivo este pequeño mundo/)
 assert.match(page,/US\$2\.99/)
 assert.match(page,/Ahora no, seguir usando PAZO/)
 assert.match(page,/onClick=\{onClose\}/)
 assert.match(page,/Las suscripciones todavía no están disponibles/)
 assert.match(page,/qaV2Screen \?/)
 assert.match(page,/SandboxCheckoutQaPanel/)
 assert.match(page,/SandboxV2AccountPanel/)
 assert.match(page,/SupporterWallConsentSettings/)
 assert.match(page,/VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED/)
 assert.match(pet,/Conoce cómo apoyar nuestra comunidad/)
 assert.match(checkout,/action:'begin'/)
 assert.match(checkout,/affirmativeConsent:true/)
 assert.match(checkout,/!consent\|\|busy\|\|phase!=='ready'\|\|attempted.current/)
 assert.match(checkout,/approveUrl/)
 assert.match(checkout,/offer.exactCopy/)
 assert.match(checkout,/<details/)
 assert.doesNotMatch(checkout,/import \{ SandboxV2AccountPanel \}/)
 assert.match(account,/action:'verify_payment'/)
 assert.match(account,/result\.cycleVerified!==true/)
 assert.match(account,/action:'cancel'/)
 assert.match(account,/confirmCancellation:true/)
})

test('F16 eligibility policy does not collect or write activity and does not auto-trigger without reviewed signals',()=>{
 const evaluator=readFileSync(new URL('../supporterPitchEligibility.mjs',import.meta.url),'utf8')
 assert.doesNotMatch(evaluator,/localStorage|sessionStorage|\.insert\(|\.upsert\(|\.rpc\(|fetch\(|navigator\./)
 assert.match(evaluator,/supporter_state_unverified/)
 assert.match(evaluator,/dismissal_cooldown/)
})
