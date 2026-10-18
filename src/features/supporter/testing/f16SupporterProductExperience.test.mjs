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
 const design=readFileSync(new URL('../components/SupporterOfferB.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const pet=readFileSync(new URL('../../../components/views/PetView.tsx',import.meta.url),'utf8')
 assert.match(design,/Ayuda a que PAZO siga creciendo/)
 assert.match(design,/Como agradecimiento/)
 assert.match(design,/US\$2\.99/)
 assert.match(design,/amigo-pazo-inicio\.png/)
 assert.match(page,/Ahora no, seguir usando PAZO/)
 assert.match(page,/onClick=\{onClose\}/)
 assert.match(page,/Las suscripciones todavía no están disponibles/)
 assert.match(page,/qaV2Screen \?/)
 assert.match(page,/SandboxCheckoutQaPanel/)
 assert.match(page,/SandboxV2AccountPanel/)
 assert.match(page,/SupporterWallConsentSettings/)
 assert.match(page,/supporterBenefitsUiEnabled/)
 assert.ok(pet.includes('Apoya por US$2.99 al mes'))
 assert.ok(checkout.includes("action:retry?'retry_begin':'begin'"))
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

test('F16 verified owner gets a decorated member-only entry and real benefit controls',()=>{
 const pet=readFileSync(new URL('../../../components/views/PetView.tsx',import.meta.url),'utf8')
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const home=readFileSync(new URL('../components/SupporterBenefitsHome.tsx',import.meta.url),'utf8')
 const proof=readFileSync(new URL('../useSupporterMembershipStatus.ts',import.meta.url),'utf8')
 assert.ok(pet.includes("supporterStatus.kind==='verified'"))
 assert.ok(pet.includes('bg-[#E6EDDB]'))
 assert.ok(pet.includes('setShowSupporterAccount(true)'))
 assert.ok(page.includes("membership.kind === 'verified'"))
 assert.ok(page.includes("membership.kind === 'inactive'"))
 assert.ok(page.includes('SupporterBenefitsHome'))
 assert.ok(home.includes('SupporterThemePreviewPanel'))
 assert.ok(home.includes('SupporterWallConsentSettings'))
 assert.ok(home.includes('SandboxV2AccountPanel'))
 assert.ok(home.includes('SupporterBadge active'))
 assert.ok(proof.includes("supabase.rpc('pazo_supporter_public_pet_benefits'"))
 assert.ok(proof.includes("if (!enabled || !benefitsEnabled)"))
 assert.ok(!proof.includes('localStorage'))
 assert.ok(!proof.includes('sessionStorage'))
})

test('F16 prompt is available as a non-blocking component, but automatic delivery is not live',()=>{
 const prompt=readFileSync(new URL('../components/SupporterInvitationPrompt.tsx',import.meta.url),'utf8')
 const page=readFileSync(new URL('../../../App.tsx',import.meta.url),'utf8')
 const pet=readFileSync(new URL('../../../components/views/PetView.tsx',import.meta.url),'utf8')
 assert.ok(prompt.includes('onExplore'))
 assert.ok(prompt.includes('onDismiss'))
 assert.ok(prompt.includes('Ahora no'))
 assert.ok(prompt.includes('PAZO seguirá siendo gratis'))
 assert.ok(!page.includes('<SupporterInvitationPrompt'))
 assert.ok(pet.includes('<SupporterInvitationPrompt'))
 assert.ok(pet.includes('invitationPreviewRequested'))
 assert.ok(pet.includes("import.meta.env.DEV"))
 assert.ok(pet.includes("VITE_PAZO_F16_SANDBOX_QA_UI === 'true'"))
 assert.ok(pet.includes("get('supporter_preview') === '1'"))
 assert.ok(pet.includes("supporterStatus.kind === 'inactive'"))
 assert.ok(pet.includes('!dismissedInvitationPreview'))
 assert.ok(prompt.includes('previewOnly'))
 assert.ok(!page.includes('<SupporterInvitationPrompt'))
})

test('F16 membership is account-scoped across owned pets, never the selected pet only',()=>{
 const pet=readFileSync(new URL('../../../components/views/PetView.tsx',import.meta.url),'utf8')
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const hook=readFileSync(new URL('../useSupporterMembershipStatus.ts',import.meta.url),'utf8')
 assert.ok(pet.includes('useSupporterMembershipStatus(undefined, canManagePet)'))
 assert.ok(page.includes('useSupporterMembershipStatus()'))
 assert.ok(!page.includes('useSupporterMembershipStatus(pet?.id)'))
 assert.ok(hook.includes("eq('owner_id',user!.id)"))
 assert.ok(hook.includes('for(const pet of pets)'))
 assert.ok(hook.includes('if(proof.badge) {active=true'))
 assert.ok(hook.includes("return active ? {kind:'verified',milestone} : noStatus('inactive')"))
 assert.ok(hook.includes("catch(() => {if(!cancelled)setStatus(noStatus('unavailable'))"))
})

test('F16 phone-frame offer stays single-column and covers shell navigation',()=>{
 const offer=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const member=readFileSync(new URL('../components/SupporterBenefitsHome.tsx',import.meta.url),'utf8')
 const portal=readFileSync(new URL('../components/SupporterScreenPortal.tsx',import.meta.url),'utf8')
 const app=readFileSync(new URL('../../../App.tsx',import.meta.url),'utf8')
 assert.match(app,/data-pazo-app-shell/)
 assert.match(portal,/createPortal\(/)
 assert.match(portal,/querySelector\('\[data-pazo-app-shell\]'\)/)
 assert.match(portal,/shell \? 'absolute' : 'fixed'/)
 assert.match(portal,/inset-0 z-\[115\]/)
 assert.match(offer,/<SupporterScreenPortal>/)
 assert.match(member,/<SupporterScreenPortal>/)
 const design=readFileSync(new URL('../components/SupporterOfferB.tsx',import.meta.url),'utf8')
 assert.match(design,/grid min-w-0 grid-cols-4 gap-1\.5/)
 assert.doesNotMatch(design,/sm:grid-cols-2/)
 assert.match(design,/flex min-h-\[92px\] min-w-0 flex-col items-center/)
 assert.match(offer,/overscroll-contain/)
 assert.match(member,/overscroll-contain/)
 assert.ok(offer.includes('<SandboxCheckoutQaPanel lang={lang} inline onReviewExisting={reviewExistingQaRequest}/>'))
 assert.match(design,/Muro de agradecimiento/)
})

test('F16 option B keeps signed PayPal Sandbox consent and one-shot checkout unchanged',()=>{
 const design=readFileSync(new URL('../components/SupporterOfferB.tsx',import.meta.url),'utf8')
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const badgeLabels=['Insignia especial','5 fondos especiales','Muro de agradecimiento','Medallas por antigüedad']
 for(const label of badgeLabels)assert.ok(design.includes(label),label)
 assert.ok(design.includes('amigo-pazo-inicio.png'),'Original approved badge is decorative offer artwork')
 assert.ok(design.includes('alt="" aria-hidden="true"'),'Badge in offer is not a false entitlement')
 assert.ok(design.includes('Ayuda a que PAZO siga creciendo'))
 assert.ok(design.includes('Como agradecimiento'))
 assert.ok(!design.includes('fetch(')&&!design.includes('supabase.'),'Layout cannot trigger purchases')
 assert.ok(page.includes('<SupporterOfferB lang={lang}>'))
 assert.ok(page.includes('<SandboxCheckoutQaPanel lang={lang} inline onReviewExisting={reviewExistingQaRequest}/>'),'Checkout directly follows offer, not a second modal')
 assert.ok(!page.includes('setShowSandboxQa(true)'),'No duplicate purchase entry')
 assert.ok(checkout.includes("o.version!==BENEFITS_V2"),'Must accept published v2 terms')
 assert.ok(checkout.includes('checked={consent}'))
 assert.ok(checkout.includes("setConsent(false)"),'Each offer opens unchecked')
 assert.ok(checkout.includes('affirmativeConsent:true'))
 assert.ok(checkout.includes("disabled={!consent||busy||phase!=='ready'||attempted.current}"))
 assert.ok(checkout.includes('attempted.current=true'),'Purchase must remain one-shot')
 assert.ok(checkout.includes("data.phase==='APPROVAL_PENDING'"))
 assert.ok(checkout.includes("window.location.assign(url)"))
 assert.ok(checkout.includes('bg-[#E1E53F]'),'PO chose lime-colored PayPal CTA for better blue-logo contrast')
 assert.ok(page.includes('Las suscripciones todavía no están disponibles'),'Public/Live checkout remains OFF')
 assert.ok(page.includes('button type="button" disabled'),'Public/Live PayPal button cannot charge')
})

test('F16 option B mobile screenshot corrections enforce compact hierarchy without modifying billing',()=>{
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const design=readFileSync(new URL('../components/SupporterOfferB.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 assert.ok(page.includes('grid-cols-[44px_minmax(0,1fr)_44px]'),'Centered navigation, no sales header crowding')
 assert.ok(page.includes('aria-label={label(\'Volver a PAZO\''),'Accessible back button')
 assert.ok(!page.includes('Entorno de prueba · PayPal Sandbox'),'QA bar must not displace hero')
 assert.ok(design.includes('top-[-62px]'),'Official art overlaps the central card')
 assert.ok(design.includes('max-w-[300px] text-[clamp(21px,5.8vw,24px)]'),'Central card title is centered and scales on mobile')
 assert.ok(design.includes('min-h-[92px]'),'Four mini thank-you tokens have compact height')
 assert.ok(design.includes('grid-cols-4 gap-1.5'),'One horizontal row of four gratitude icons')
 assert.ok(checkout.includes('Leer las condiciones completas'),'Full signed terms remain accessible')
 assert.ok(checkout.includes('offer.exactCopy'),'Server published terms are not replaced with abbreviated copy')
 assert.ok(checkout.includes("checked={consent}"))
 assert.ok(checkout.includes("disabled={!consent||busy||phase!=='ready'||attempted.current}"))
 assert.ok(checkout.includes('PayPal Sandbox · Solo dinero ficticio'),'Payment test environment stays explicitly disclosed')
 assert.ok(!checkout.includes('Solo PayPal Sandbox · Dinero ficticio · Los beneficios requieren pago verificado.'),'No oversized early warning block')
 assert.ok(page.includes('Ahora no, seguir usando PAZO'),'One-tap exit remains')
})

test('F16 Sandbox checkout explains linked subscription and transient offer failures without repeating begin',()=>{
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 assert.ok(checkout.includes("res.status===429"),'Rate limiting must be distinguished from missing offer')
 assert.ok(checkout.includes("res.status===403"),'Account restrictions must not look like purchase success')
 assert.ok(checkout.includes("res.status===409 && value?.phase==='ALREADY_LINKED_NOT_PAYMENT_VERIFIED'"),
   'An already bound subscription requires management, never another checkout')
 assert.ok(checkout.includes("setBeginFailure(code==='qa_already_linked'"))
 assert.ok(checkout.includes('Ya existe una suscripción Sandbox vinculada'))
 assert.ok(checkout.includes('No repitas el pago'))
 assert.ok(checkout.includes("setOfferRevision(n=>n+1)"),'User can retry only a read-only offer lookup')
 assert.ok(checkout.includes("call({action:'offer',locale:lang})"))
 assert.ok(checkout.includes('},[lang,offerRevision])'))
 assert.ok(checkout.includes('attempted.current=true'),'One-shot begin guard must survive transient failure while mounted')
 assert.ok(!checkout.includes('attempted.current=false'),'No reset of purchase guard on failures')
 assert.ok(checkout.includes("disabled={!consent||busy||phase!=='ready'||attempted.current}"))
 assert.ok(checkout.includes("window.location.assign(url)"),'Only approved PayPal sandbox URL is navigable')
 assert.ok(checkout.includes('payPal')===false||checkout.includes('approveUrl'),'Keep approved URL validation')
})

test('F16 QA V2 one-attempt owner cannot be offered a second Sandbox subscription',()=>{
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const management=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 assert.ok(page.includes("qaV2AccountState==='none'"),'Only a confirmed no-account result can show the payment CTA')
 assert.ok(page.includes("const [qaV2AccountState,setQaV2AccountState]"))
 assert.ok(page.includes('onAccountInspection={setQaV2AccountState}'))
 assert.ok(page.includes('reviewRevision={qaReviewRevision}'))
 assert.ok(page.includes('onReviewExisting={reviewExistingQaRequest}'))
 assert.ok(page.includes('setQaReviewRevision(n=>n+1)'))
 assert.ok(checkout.includes('Revisar mi solicitud de PayPal'))
 assert.ok(page.includes('Ya existe una solicitud de PayPal Sandbox registrada'))
 assert.ok(page.includes('No se pudo comprobar si ya tienes una suscripción Sandbox'))
 assert.ok(page.includes('Consultar mi suscripción Sandbox'))
 assert.ok(page.includes('onClick={reviewExistingQaRequest}'))
 assert.ok(management.includes("onAccountInspection?.(found?.state||'none')"))
 assert.ok(management.includes("onAccountInspection?.('unavailable')"))
 assert.ok(management.includes("onAccountInspection?.('checking')"))
 assert.ok(management.includes("setAccount(result.accounts[0]||null)")===false)
 assert.ok(edge.includes("action==='list'"))
 assert.ok(edge.includes("listForOwner({ownerId:qaOwner})"))
 assert.ok(checkout.includes('attempted.current=true'))
 assert.ok(!page.includes('setQaV2AccountState(\'none\')'),'Do not optimistically enable checkout')
})

test('F16 checkout 409 cannot trap buyer in a disabled PayPal CTA',()=>{
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 assert.ok(checkout.includes("phase==='pending'&&<div"))
 assert.ok(checkout.includes('onClick={onReviewExisting}'))
 assert.ok(page.includes('const reviewExistingQaRequest = () => {'))
 assert.ok(page.includes('setQaManagementOpen(true)'))
 assert.ok(page.includes("setQaV2AccountState('checking')"))
 assert.ok(page.includes('setQaReviewRevision(n=>n+1)'))
 assert.ok(account.includes('if(reviewRevision>0)void refresh()'))
 assert.ok(account.includes("call({action:'list'})"))
 assert.ok(!account.includes("call({action:'begin'"),'Account refresh may never charge')
})


test('F16 localhost Sandbox enables presentation but never synthesizes paid rights',()=>{
 const policy=readFileSync(new URL('../supporterUiRelease.ts',import.meta.url),'utf8')
 const hook=readFileSync(new URL('../useSupporterMembershipStatus.ts',import.meta.url),'utf8')
 const account=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const qa=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 assert.ok(policy.includes('import.meta.env.DEV'))
 assert.ok(policy.includes("VITE_PAZO_F16_SANDBOX_QA_UI === 'true'"))
 assert.ok(policy.includes("['localhost','127.0.0.1']"))
 assert.ok(policy.includes("VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'"))
 assert.ok(!policy.includes('localStorage')&&!policy.includes('mayGrantBenefits:true'))
 assert.ok(hook.includes("supabase.rpc('pazo_supporter_public_pet_benefits'"))
 assert.ok(hook.includes('SUPPORTER_PAYMENT_VERIFIED_EVENT'))
 assert.ok(hook.includes("document.addEventListener('visibilitychange', onVisible)"))
 assert.ok(account.includes("membership.kind === 'verified'"))
 assert.ok(account.includes("membership.kind === 'inactive'"))
 assert.ok(account.includes('onPaidVerified={refreshMembership}'))
 assert.ok(qa.includes("result.code!=='verified_first_sandbox_cycle'"))
 assert.ok(qa.includes('result.mayGrantBenefits!==true'))
 assert.ok(qa.includes("window.dispatchEvent(new Event(SUPPORTER_PAYMENT_VERIFIED_EVENT))"))
 assert.ok(qa.includes("result.phase==='ACTIVE'"))
 assert.ok(qa.includes("call({action:'verify_payment',intentId:a.intentId})"))
 assert.ok(!qa.includes("call({action:'begin'"))
 assert.ok(qa.includes("recoveryStage==='approval_not_payment'&&!paidThrough"))
})
test('F16 no-pet membership is owner-only read-only; no synthetic pets or billing access',()=>{
 const hook=readFileSync(new URL('../useSupporterMembershipStatus.ts',import.meta.url),'utf8')
 const migration=readFileSync(new URL('../../../../supabase/migrations/20261018213000_f16_sandbox_qa_owner_membership_read.sql',import.meta.url),'utf8')
 assert.ok(hook.includes('if(pets.length===0)'))
 assert.ok(hook.includes("supabase.rpc('pazo_supporter_my_account_status')"))
 assert.ok(hook.includes("if(petId)throw Error('PETS_UNVERIFIED')"))
 assert.ok(migration.includes("v_owner uuid := auth.uid()"))
 assert.ok(migration.includes('supporter_private.f16_sandbox_qa_projection('))
 assert.ok(migration.includes("AND u.email_confirmed_at IS NOT NULL"))
 assert.ok(migration.includes("AND u.is_anonymous IS DISTINCT FROM true"))
 assert.ok(migration.includes('FROM PUBLIC,anon,authenticated,service_role'))
 assert.ok(migration.includes('TO authenticated'))
 assert.ok(!migration.includes('INSERT INTO')&&!migration.includes('UPDATE supporter_private'))
})


test('F16 member management does not flicker or close during background revalidation',()=>{
 const hook=readFileSync(new URL('../useSupporterMembershipStatus.ts',import.meta.url),'utf8')
 const page=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const home=readFileSync(new URL('../components/SupporterBenefitsHome.tsx',import.meta.url),'utf8')
 assert.ok(hook.includes("setStatus(previous=>sameScope&&previous.kind==='verified'"))
 assert.ok(hook.includes("previous:noStatus('checking')"))
 assert.ok(hook.includes("const sameScope=lastScope.current.petId===petId"))
 assert.ok(hook.includes("lastScope.current.enabled===enabled"))
 assert.ok(hook.includes("supabase.auth.onAuthStateChange"))
 assert.ok(hook.includes("if(changed){setStatus(noStatus('checking'));refresh()}"))
 assert.ok(hook.includes(".catch(() => {if(!cancelled)setStatus(noStatus('unavailable'))})"))
 assert.ok(page.includes("if (membership.kind === 'verified')"))
 assert.ok(home.includes("setShowMembership(v=>!v)"))
 assert.ok(!hook.includes('mayGrantBenefits:true'))
})


test('F16 approved PAZO visual pass keeps benefits prominent and Sandbox diagnostics secondary',()=>{
 const home=readFileSync(new URL('../components/SupporterBenefitsHome.tsx',import.meta.url),'utf8')
 const theme=readFileSync(new URL('../components/SupporterThemePreviewPanel.tsx',import.meta.url),'utf8')
 const save=readFileSync(new URL('../components/SupporterThemeSaveControl.tsx',import.meta.url),'utf8')
 const palette=readFileSync(new URL('../components/SupporterProfileThemes.tsx',import.meta.url),'utf8')
 const wall=readFileSync(new URL('../components/SupporterWallConsentSettings.tsx',import.meta.url),'utf8')
 assert.ok(home.includes('Ya eres Amigo de PAZO'))
 assert.ok(home.includes('Tus beneficios'))
 assert.ok(home.includes('Herramientas de prueba Sandbox'))
 assert.ok(home.includes('open={showSandboxTools}'))
 assert.ok(home.includes('showMembership &&'))
 assert.ok(home.includes('setShowMilestones'))
 assert.ok(home.includes('setShowWall(true)'))
 assert.ok(home.includes('<SupporterWallConsentSettings lang={lang}/>'))
 assert.ok(home.includes('<SandboxV2AccountPanel lang={lang}/>'))
 assert.ok(theme.includes('Volver a beneficios'))
 assert.ok(theme.includes('Elige tu fondo'))
 assert.ok(theme.includes('<SupporterProfileBackdrop theme={theme}'))
 assert.ok(theme.includes('<SupporterThemeSaveControl'))
 assert.ok(save.includes('Guardar cambios'))
 assert.ok(save.includes("supabase.rpc('pazo_supporter_set_pet_theme'"))
 assert.ok(save.includes('SERVER_POSTFLIGHT_MISMATCH'))
 assert.ok(palette.includes('SUPPORTER_PROFILE_THEMES.map'))
 assert.ok(wall.includes('Ellos también son parte de PAZO'))
 assert.ok(wall.includes('Conocer el muro público'))
 assert.ok(wall.includes("supabase.rpc('pazo_wall_consent_enable'"))
 assert.ok(wall.includes("supabase.rpc('pazo_wall_consent_disable'"))
 assert.ok(wall.includes("confirmId!==petId"))
 assert.ok(wall.includes("verified!==allow"))
 for(const src of [home,theme,save,wall]) {
  assert.ok(!/className=["'][^"']*(?:border-|outline-|focus-visible:ring-)/.test(src),
    'PAZO cards and buttons must not acquire outlines or borders')
 }
 assert.ok(!home.includes('18/11/2026'),'Never hardcode a membership expiration date in design')
})


test('F16 user-approved corrections match PAZO type scale, compact wall and original/custom profile isolation',()=>{
 const feed=readFileSync(new URL('../../../components/views/HomeView.tsx',import.meta.url),'utf8')
 const profile=readFileSync(new URL('../../../components/views/PublicProfileView.tsx',import.meta.url),'utf8')
 const wall=readFileSync(new URL('../components/GratitudeWallScene.tsx',import.meta.url),'utf8')
 const benefits=readFileSync(new URL('../components/SupporterBenefitsHome.tsx',import.meta.url),'utf8')
 const badge=readFileSync(new URL('../components/SupporterBadge.tsx',import.meta.url),'utf8')
 const theme=readFileSync(new URL('../components/SupporterThemePreviewPanel.tsx',import.meta.url),'utf8')
 const grant=readFileSync(new URL('../components/SupporterThemeSaveControl.tsx',import.meta.url),'utf8')
 assert.ok(feed.includes('text-[16px] font-extrabold'),'PAZO Feed name scale is 16 px')
 assert.ok(feed.includes('text-[12px] text-[#5C7470]'),'PAZO Feed location/time scale is 12 px')
 assert.ok(benefits.includes('text-[16px] font-black'),'Benefit item names inherit the same 16 px hierarchy')
 assert.ok(theme.includes('text-[14px]'),'Theme supporting text must be readable')
 assert.ok(grant.includes('text-[14px]'),'The saved-theme status must be legible')
 assert.ok(wall.includes('grid grid-cols-2 gap-2.5'),'Wall should show more pets in two columns without a search requirement')
 assert.ok(wall.includes('w-full break-words text-[16px]'),'Compact wall still uses readable pet names')
 assert.ok(wall.includes('wallSort(rows,tab)'),'The original verified source/tab sort remains authoritative')
 assert.ok(badge.includes("size==='mini'?'h-[20px] w-[20px]'"))
 assert.ok(badge.includes('loading="eager"'))
 assert.ok(feed.includes('absolute -bottom-1 -right-1 z-10 block h-[20px]'))
 assert.ok(feed.includes('size="mini"'))
 assert.ok(profile.includes('size="mini"'))
 assert.ok(!feed.includes('<SupporterBadge active milestone={supporterBadge.milestone} lang={lang}/>'),'Badge may not shift Sugerencia')
 assert.ok(feed.includes('supporterBadge={post.supporterBadge}'),'Feed must render badge from its initial verified post payload')
 assert.ok(!feed.includes('badgeRefreshCycle'),'Feed must not issue post-render badge lookups')
 assert.ok(!feed.includes("supabase.rpc('pazo_supporter_public_badges_batch'"))
 assert.ok(profile.includes('!(supporterVisualsEnabled && supporterPerks?.theme)'),'Custom background excludes original decorative canvas')
 assert.ok(profile.includes('<SupporterProfileBackdrop theme={supporterPerks.theme} />'))
 assert.ok(benefits.includes('Tu apoyo merece reconocimiento'))
 assert.ok(benefits.includes('PAZO agradece el tiempo'))
 assert.ok(!benefits.includes("t('Pendiente','Pending')"),'Milestones are recognition, not a checklist')
 for(const content of [wall,benefits,theme]) {
  assert.ok(!/className=["'][^"']*(?:border-|outline-|focus-visible:ring-)/.test(content),'Preserve PO zero-outline rule')
 }
})


test('F16 Feed owner joins payment badge evidence BEFORE committing a visible page',()=>{
 const app=readFileSync(new URL('../../../App.tsx',import.meta.url),'utf8')
 const helper=readFileSync(new URL('../verifiedFeedPostBadges.ts',import.meta.url),'utf8')
 const feed=readFileSync(new URL('../../../components/views/HomeView.tsx',import.meta.url),'utf8')
 assert.ok(app.includes('attachVerifiedFeedBadges(page,async ids=>'))
 assert.ok(app.includes('Promise.all(['))
 assert.ok(app.includes('const enrichedPage=interactionsPage.map('))
 assert.ok(app.indexOf('const enrichedPage=interactionsPage.map(')<app.indexOf('setPosts(enrichedPage)'))
 assert.ok(app.includes('attachVerifiedFeedBadges([newPost]'))
 assert.ok(app.includes('await preloadVerifiedFeedBadgeArt(enrichedPage)'),'Paint waits for official badge image decode')
 assert.ok(app.includes('await preloadVerifiedFeedBadgeArt(resolved)'),'New post paint waits for its badge artwork')
 assert.ok(feed.includes('supporterBadge={post.supporterBadge}'))
 assert.ok(!feed.includes('badgeQueriesMade'),'No asynchronous badge lookup on render')
 assert.ok(!feed.includes("pazo_supporter_public_badges_batch"))
 assert.ok(helper.includes('FEED_BADGE_EVIDENCE_UNAVAILABLE'))
 assert.ok(helper.includes('FEED_BADGE_INCOMPLETE_RESPONSE'))
 assert.ok(helper.includes('if(posts.length===0)return []'))
})


test('F16 Feed badges are already verified on initial payload; fail closed without a delayed badge',async()=>{
 const {attachVerifiedFeedBadges}=await import('../verifiedFeedPostBadges.ts')
 const id=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0')
 const input=[{id:'p1',petId:id(1),petName:'Luna'},{id:'p2',petId:id(2),petName:'Milo'},{id:'p3',petId:id(1),petName:'Luna'}]
 let calls=0
 const page=await attachVerifiedFeedBadges(input,async ids=>{
  calls++
  return {data:ids.map(pet_id=>({pet_id,badge:pet_id===id(1),milestone:0})),error:null}
 })
 assert.equal(calls,1,'Batch one network read for one page')
 assert.deepEqual(page.map(p=>p.supporterBadge?.badge),[true,false,true])
 assert.equal(input[0].supporterBadge,undefined,'Do not mutate original post')
 await assert.rejects(attachVerifiedFeedBadges(input,async()=>({data:[],error:null})),/FEED_BADGE_EVIDENCE_UNAVAILABLE/)
 await assert.rejects(attachVerifiedFeedBadges(input,async()=>({
  data:[{pet_id:id(1),badge:true,milestone:12},{pet_id:id(1),badge:true,milestone:12}],error:null,
 })),/FEED_BADGE_BAD_RESPONSE/)
 await assert.rejects(attachVerifiedFeedBadges(input,async ids=>({
  data:ids.map(pet_id=>({pet_id,badge:false,milestone:3})),error:null,
 })),/FEED_BADGE_BAD_RESPONSE/)
 const many=Array.from({length:60},(_,i)=>({id:'post-'+i,petId:id(i+1)}))
 const chunks=[]
 const manyResult=await attachVerifiedFeedBadges(many,async ids=>{
  chunks.push(ids.length)
  return {data:ids.map(pet_id=>({pet_id,badge:false,milestone:0})),error:null}
 })
 assert.deepEqual(chunks,[48,12])
 assert.equal(manyResult.length,60)
})


test('F16 approved invitation leads with support and introduces perks only as thanks',()=>{
 const offer=readFileSync(new URL('../components/SupporterOfferB.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const member=readFileSync(new URL('../components/SupporterBenefitsHome.tsx',import.meta.url),'utf8')
 const intro='PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.'
 assert.ok(offer.includes('Ayuda a que PAZO siga creciendo'))
 assert.ok(offer.includes(intro),'Copy approved verbatim by PO')
 assert.ok(offer.includes('Como agradecimiento'))
 assert.ok(offer.indexOf('Ayuda a que PAZO siga creciendo')<offer.indexOf('{children}'))
 assert.ok(offer.indexOf('{children}')<offer.indexOf('Como agradecimiento'),
   'Invitation and support action must lead; rewards are secondary')
 assert.ok(!offer.includes('Lo que recibirás'),'No sales-first messaging')
 assert.ok(offer.includes('US$2.99'))
 assert.ok(offer.includes('Reconocimientos por el tiempo de apoyo'))
 assert.ok(checkout.includes('Quiero apoyar a PAZO'))
 assert.ok(checkout.includes('Continuar con PayPal'),'Payment method must remain clear')
 assert.ok(checkout.includes("disabled={!consent||busy||phase!=='ready'||attempted.current}"),
   'Voluntary support still requires explicit acceptance')
 assert.ok(account.includes('PAZO seguirá siendo gratis para todos.'))
 assert.ok(account.includes('Ahora no, seguir usando PAZO'))
 assert.ok(member.includes('Con el paso del tiempo, tu mascota recibe nuevos reconocimientos que reflejan ese apoyo.'))
 assert.ok(!member.includes('meses pagados y verificados'),'Recognition message is gratitude, not pressure')
 // The existing legally accepted V2 exact terms are untouched; this UI is promotional.
 const terms=readFileSync(new URL('../sandboxBenefitsOfferV2.mjs',import.meta.url),'utf8')
 assert.ok(terms.includes('al mes, USD, con renovación automática mensual'))
 assert.ok(!offer.includes('fetch(')&&!offer.includes('supabase.'),'UI cannot grant/pay')
})


test('F16 Card Central PO image layout replaces the sales-first offer in mobile shell',()=>{
 const design=readFileSync(new URL('../components/SupporterOfferB.tsx',import.meta.url),'utf8')
 const shell=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 assert.ok(design.includes('data-pazo-supporter-layout="card-central"'))
 assert.ok(design.includes('relative pt-[57px]')&&design.includes('rounded-[30px] bg-white'))
 assert.ok(design.includes('left-1/2 top-[-62px]')&&design.includes('amigo-pazo-inicio.png'))
 assert.ok(design.includes('text-center shadow-[0_12px_34px'),'Main invitation is centered, not split hero')
 assert.ok(design.includes('grid-cols-4 gap-1.5'),'Gratitude is exactly four side-by-side icons')
 assert.ok(!design.includes('grid-cols-1 gap-1.5'),'No former list of sales benefit cards')
 assert.ok(design.includes('Ayuda a que PAZO siga creciendo'))
 assert.ok(design.includes('PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.'))
 assert.ok(design.indexOf('{children}')<design.indexOf('Como agradecimiento'))
 assert.ok(checkout.indexOf('onClick={()=>void begin()}')<checkout.indexOf('checked={consent}'),
   'CTA must appear before consent while staying disabled until accepted')
 assert.ok(checkout.includes("disabled={!consent||busy||phase!=='ready'||attempted.current}"))
 assert.ok(checkout.includes('Leer las condiciones completas'))
 assert.ok(checkout.includes('offer.exactCopy'))
 assert.ok(shell.indexOf('</SupporterOfferB>')<shell.indexOf('PAZO seguirá siendo gratis para todos.'))
 assert.ok(shell.includes('Ahora no, seguir usando PAZO'))
 assert.ok(!/border-|outline-|focus-visible:ring-/.test(design),'No card/button visual contours')
 assert.ok(!design.includes('fetch(')&&!design.includes('supabase.'),'Design is exclusively visual')
})

test('F16 PayPal CTA option 2 uses lime surface and preserves brand-blue logo at full contrast',()=>{
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 assert.ok(checkout.includes("bg-[#E1E53F] px-4 py-2.5 text-[14px] font-extrabold text-[#204E4A]"))
 assert.ok(checkout.includes("disabled:bg-[#EEF1B7] disabled:text-[#204E4A]"))
 assert.ok(checkout.includes("className=\"h-[25px] w-[25px] shrink-0 fill-[#003087]\""))
 assert.ok(checkout.includes('fill="#009CDE"'))
 assert.ok(!checkout.includes('disabled:opacity-50'),'Disabled state must not dim the PayPal blue logo')
 assert.ok(checkout.includes("disabled={!consent||busy||phase!=='ready'||attempted.current}"))
 assert.ok(checkout.includes("checked={consent}"))
 assert.ok(checkout.includes("affirmativeConsent:true"))
 assert.ok(checkout.includes("window.location.assign(url)"))
})
