import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('the agenda and a lost-pet alert explain why alerts matter when off',()=>{
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
