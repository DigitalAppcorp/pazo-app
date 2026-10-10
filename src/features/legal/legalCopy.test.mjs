import test from 'node:test'
import assert from 'node:assert/strict'
import { LEGAL_RELEASE_READY, PAZO_LEGAL_OPERATOR_NAME, PAZO_LEGAL_OPERATOR_REGISTRATION_STATE, legalPreview } from './legalCopy.ts'
import { PAZO_PRIVACY_SUPPORT_EMAIL, PAZO_PRIVACY_SUPPORT_MAILTO } from './supportContact.ts'
import { readFileSync } from 'node:fs'

test('no draft is treated as the final published privacy policy or terms', () => {
  assert.equal(LEGAL_RELEASE_READY, false)
  for (const kind of ['privacy','terms']) for (const lang of ['es','en']) {
    const copy=legalPreview[kind][lang]
    assert.ok(copy.heading.length>8)
    assert.ok(copy.alert.length>60)
    assert.ok(copy.sections.length>=5)
    assert.ok(copy.sections.every(s=>s.heading && s.text))
  }
  assert.match(legalPreview.privacy.es.alert,/Borrador/)
  assert.match(legalPreview.terms.en.alert,/not final contractual terms/)
})
test('truthful disclosure: no false claims of deletion or public purchases', () => {
  const privacy=legalPreview.privacy.es.sections.map(x=>x.text).join(' ')
  const terms=legalPreview.terms.es.sections.map(x=>x.text).join(' ')
  assert.match(privacy,/Supabase/)
  assert.match(privacy,/Mapbox/)
  assert.match(privacy,/eliminación de cuenta/)
  assert.match(terms,/18 años/)
  assert.match(terms,/en desarrollo/)
  assert.doesNotMatch(privacy,/eliminación instantánea|eliminados al instante/)
})

test('public privacy inbox is real, bilingual, and never promises automated deletion', () => {
  assert.equal(PAZO_PRIVACY_SUPPORT_EMAIL, 'appdigital.corp@gmail.com')
  assert.equal(PAZO_PRIVACY_SUPPORT_MAILTO, 'mailto:appdigital.corp@gmail.com')
  assert.equal(LEGAL_RELEASE_READY, false)
  const es = legalPreview.privacy.es.sections.map(s => s.text).join(' ')
  const en = legalPreview.privacy.en.sections.map(s => s.text).join(' ')
  assert.match(es,/solicitarla no elimina automáticamente tus datos/i)
  assert.match(en,/does not automatically erase your data/i)
  const previews = readFileSync(new URL('./LegalPreviewDialog.tsx', import.meta.url), 'utf8')
  const request = readFileSync(new URL('../account/DeletionRequestDialog.tsx', import.meta.url), 'utf8')
  for (const ui of [previews, request]) {
    assert.match(ui,/PAZO_PRIVACY_SUPPORT_MAILTO/)
    assert.match(ui,/PAZO_PRIVACY_SUPPORT_EMAIL/)
    assert.match(ui,/focus-visible:bg/)
    assert.doesNotMatch(ui,/target="_blank"/)
  }
})

test('PO-designated legal operator is consistent in both languages and drafts', () => {
  assert.equal(PAZO_LEGAL_OPERATOR_NAME, 'Alvarado Solutions LLC')
  assert.equal(PAZO_LEGAL_OPERATOR_REGISTRATION_STATE, 'California')
  assert.equal(LEGAL_RELEASE_READY, false)
  for(const kind of ['privacy','terms']) {
    for(const lang of ['es','en']) {
      const copy=legalPreview[kind][lang]
      assert.ok(copy.sections.some(s=>s.text.includes(PAZO_LEGAL_OPERATOR_NAME)),kind+' '+lang)
      assert.ok(copy.sections.some(s=>s.text.includes(PAZO_LEGAL_OPERATOR_NAME) && s.text.includes(PAZO_LEGAL_OPERATOR_REGISTRATION_STATE)),kind+' '+lang+' registration')
    }
  }
  assert.match(legalPreview.privacy.es.alert,/conservación/)
  assert.match(legalPreview.privacy.en.alert,/retention/)
  assert.doesNotMatch(legalPreview.privacy.es.alert,/Falta verificar responsable legal/)
})

test('draft retention text describes real limits, without invented numeric purge guarantees', () => {
  const es=legalPreview.privacy.es.sections.find(x=>x.heading==='Conservación y solicitudes')?.text
  const en=legalPreview.privacy.en.sections.find(x=>x.heading==='Retention and requests')?.text
  assert.ok(es && en)
  assert.match(es,/No existe una purga automática general/i)
  assert.match(en,/no general automatic age-based purge/i)
  assert.match(es,/respaldo y cachés/i)
  assert.match(en,/backups and caches/i)
  assert.match(es,/solicitarla no elimina automáticamente/i)
  assert.match(en,/does not automatically erase/i)
  assert.doesNotMatch(es,/\b\d+\s+(días|semanas|meses|años)\b/i)
  assert.doesNotMatch(en,/\b\d+\s+(days|weeks|months|years)\b/i)
  assert.equal(LEGAL_RELEASE_READY,false)
})

test('draft statements distinguish ephemeral map location, persisted check-ins and rescue contacts', () => {
  for (const lang of ['es','en']) {
    const sections=legalPreview.privacy[lang].sections
    const location=sections.find(s=>s.heading===(lang==='es'?'Ubicación y lugares':'Location and places'))?.text
    const rescue=sections.find(s=>s.heading===(lang==='es'?'Rescate y avistamientos':'Rescue and sightings'))?.text
    const providers=sections.find(s=>s.heading===(lang==='es'?'Servicios utilizados':'Service providers'))?.text
    const changes=sections.find(s=>s.heading===(lang==='es'?'Cambios y señales del navegador':'Updates and browser signals'))?.text
    const retention=sections.find(s=>s.heading===(lang==='es'?'Conservación y solicitudes':'Retention and requests'))?.text
    assert.ok(location && rescue && providers && changes && retention)
    assert.match(location,/Mapbox/)
    assert.match(location,/check-in/i)
    assert.match(rescue,lang==='es'?/teléfono/:/phone number/)
    assert.match(providers,/PostHog/)
    assert.match(providers,/Unsplash/)
    assert.match(providers,lang==='es'?/excluido de esta versión/:/excluded from this release/)
    assert.match(changes,/Do Not Track/)
    assert.match(changes,lang==='es'?/no cambia su funcionamiento/:/does not change its behavior/)
    assert.match(retention,lang==='es'?/solicitar corrección/:/request corrections/)
    assert.match(retention,lang==='es'?/Si la opción está habilitada/:/If the option is enabled/)
  }
  const map=readFileSync(new URL('../../components/views/MapView.tsx',import.meta.url),'utf8')
  const places=readFileSync(new URL('../../services/placeCheckinService.ts',import.meta.url),'utf8')
  const rescue=readFileSync(new URL('../../services/rescueService.ts',import.meta.url),'utf8')
  assert.match(map,/navigator\.geolocation\.getCurrentPosition/)
  assert.match(map,/onClick=\{handleUseLocation\}/)
  for (const col of ['place_id','pet_id','visible']) assert.ok(places.includes(col))
  for (const field of ['p_reporter_name','p_reporter_phone','p_message','p_location']) assert.ok(rescue.includes(field))
  assert.equal(LEGAL_RELEASE_READY,false)
})
