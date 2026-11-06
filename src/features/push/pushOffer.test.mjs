import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pushOfferKind} from './pushOffer.ts'

const kind=(extra)=>pushOfferKind({environment:'available',active:false,enabled:true,closed:false,...extra})

test('the invitation appears only where alerts can work and are still off',()=>{
  assert.equal(kind(),'offer')
  assert.equal(kind({active:true}),null)
  assert.equal(kind({closed:true}),null)
  assert.equal(kind({enabled:false}),null)
  for(const environment of ['denied','unsupported','in-app-browser'])assert.equal(kind({environment}),null,environment)
})

test('an iPhone outside the Home Screen is told how to install, never asked for permission',()=>{
  assert.equal(kind({environment:'ios-needs-install',enabled:false}),'install')
  assert.equal(kind({environment:'ios-needs-install',closed:true}),null)
})

test('it waits for the first-use notice, respects a manual turn-off and never shows twice here',()=>{
  const app=readFileSync(new URL('../../App.tsx',import.meta.url),'utf8')
  assert.match(app,/usePushOffer\(Boolean\(ownPetsReady && canUseAccount && !isDemoUser && currentPet\?\.id && !firstUseHint\)\)/)
  assert.match(app,/\{canShowAppNotice && !firstUseHint && pushOffer\.kind && \(\s*<PushOfferNotice kind=\{pushOffer\.kind\} petName=\{currentPet\.name\} lang=\{lang\} onClose=\{pushOffer\.close\} \/>/)
  assert.match(app,/!firstUseHint&&!pushOffer\.kind&&/,'the supporter invitation never overlaps it')
  const hook=readFileSync(new URL('./usePushOffer.ts',import.meta.url),'utf8')
  assert.match(hook,/if \(!eligible \|\| pushOfferClosedHere\(\) \|\| pushTurnedOffHere\(\)\) return/)
  const offer=readFileSync(new URL('./pushOffer.ts',import.meta.url),'utf8')
  assert.match(offer,/const OFFER_CLOSED_KEY = 'pazo_push_offer_closed_v1'/)
  const notice=readFileSync(new URL('./PushOfferNotice.tsx',import.meta.url),'utf8')
  // Every way out (Ahora no, X, Escape, a finished or refused request) closes it for good.
  assert.equal((notice.match(/onClose\(\)|onClick=\{onClose\}|onDismiss=\{onClose\}/g)??[]).length>=4,true)
  assert.match(notice,/if \(result === 'failed'\) setFailed\(true\)\s*else onClose\(\)/)
  // Plain words: reminders, and help when the pet is lost, seen or found. No technical terms.
  for(const words of [/'Sí, activar notificaciones'/,/Cuidemos juntos a \$\{petName\}/,/Sus vacunas y cuidados, justo a tiempo/,/Si se pierde y alguien ve a \$\{petName\}/,/Y si alguien encuentra a \$\{petName\}/,/Let's look after \$\{petName\} together/])
    assert.match(notice,words)
  const shown=[...notice.matchAll(/l\((['`])([\s\S]*?)\1,\s*(['"`])([\s\S]*?)\3\)/g)].flatMap(m=>[m[2],m[4]]).join(' | ')
  assert.ok(shown.length>200,'the visible sentences were read')
  assert.doesNotMatch(shown,/push|permiso|permission|suscrip|subscri/i)
  assert.doesNotMatch(notice,/alguien la (ve|encuentra)/,'the pet may be male or female')
})

test('after "not now", the agenda and a lost-pet alert explain why alerts matter there',()=>{
  const control=readFileSync(new URL('./PushControl.tsx',import.meta.url),'utf8')
  assert.match(control,/\{reason && <p className="text-\[13px\] font-bold leading-snug text-\[#204E4A\]">\{reason\}<\/p>\}/)
  assert.match(control,/reason \? \(es \? 'Activar notificaciones' : 'Turn on notifications'\)/)
  const care=readFileSync(new URL('../../components/modals/CareModal.tsx',import.meta.url),'utf8')
  assert.match(care,/Activa las notificaciones para que podamos avisarte de tu recordatorio\./)
  const lost=readFileSync(new URL('../rescue/components/ActiveLostAlertPanel.tsx',import.meta.url),'utf8')
  assert.match(lost,/Activa las notificaciones para que te avisemos en cuanto alguien vea a \$\{pet\.name\}\./)
})

test('sign-up shows its progress across four screens and tells people to check spam',()=>{
  const progress=readFileSync(new URL('../onboarding/OnboardingProgress.tsx',import.meta.url),'utf8')
  assert.match(progress,/es: \['Tu cuenta', 'Confirma tu correo', 'Tu mascota', 'Tu zona'\]/)
  assert.match(progress,/role="progressbar"/)
  const view=readFileSync(new URL('../../components/views/OnboardingView.tsx',import.meta.url),'utf8')
  assert.match(view,/<OnboardingProgress stage=\{awaitingEmailConfirmation \? 1 : 0\} lang=\{lang\} \/>/)
  assert.match(view,/<OnboardingProgress stage=\{2\} lang=\{lang\} \/>/)
  assert.match(view,/<OnboardingProgress stage=\{3\} lang=\{lang\} \/>/)
  assert.match(view,/Revisa tu carpeta de spam o correo no deseado\. Si usas Gmail, mira también en Promociones\./)
  assert.match(view,/Paso 1 de 3/,'the existing step label stays')
})
