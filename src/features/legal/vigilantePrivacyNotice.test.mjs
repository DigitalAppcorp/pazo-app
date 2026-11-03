import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { legalPreview } from './legalCopy.ts'

test('the Vigilante notice describes exactly what the Vigilante does', () => {
  const read = (path) => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8')
  const details = read('supabase/migrations/20261103201000_pazo_vigilante_private_details.sql')
  const push = read('supabase/migrations/20261103220000_pazo_health_alert_push.sql')
  const engine = read('supabase/migrations/20261103230000_pazo_vigilante_engine.sql')
  const worker = read('supabase/functions/pazo-vigilante-worker/workerCore.mjs')
  const section = (lang, heading) => legalPreview.privacy[lang].sections.find((s) => s.heading === heading)?.text ?? ''
  const es = { data: section('es', 'Salud, comida y código postal'), alerts: section('es', 'Alertas de salud del Vigilante') }
  const en = { data: section('en', 'Health, food and postal code'), alerts: section('en', 'Vigilante health alerts') }
  for (const copy of [es, en]) assert.ok(copy.data && copy.alerts)

  // The closed list of conditions is the one the database accepts.
  assert.match(details, /health_conditions <@ array\['allergies','diabetes','heart','respiratory','seizures','other'\]/)
  assert.match(es.data, /alergias, diabetes, corazón, respiratorio, convulsiones u otra/)
  assert.match(en.data, /allergies, diabetes, heart, respiratory, seizures or other/)
  assert.match(details, /postal_code ~ '\^\[0-9\]\{5\}\$'/)

  // Every health alert waits for 08:00 in Los Angeles; medium ones are capped at two a week.
  assert.match(push, /time '08:00'/)
  assert.match(push, />= 21/)
  assert.match(engine, /case when new\.type='health_alert' then push_private\.next_daytime\(now\(\)\) else now\(\) end/)
  assert.match(engine, /medium_weekly_cap integer not null default 2/)
  assert.match(es.alerts, /Entre las 9 p\. m\. y las 8 a\. m\. \(hora de Los Ángeles\) no enviamos alertas de salud/)
  assert.match(en.alerts, /Between 9 p\.m\. and 8 a\.m\. \(Los Angeles time\) we do not send health alerts/)
  assert.match(es.alerts, /como máximo dos por semana/)

  // Alerts and answers live 30 days on the notification row; the sending queue 7.
  assert.match(push, /'new_follower','health_alert'\) and created_at<now\(\)-interval '30 days'/)
  assert.match(push, /delete from push_private\.outbox where status in\('sent','failed'\) and created_at<now\(\)-interval '7 days'/)
  assert.match(es.alerts, /se borran a los 30 días; la cola de envío, a los 7/)

  // Official sources only receive a plain request, and no AI service is involved.
  assert.doesNotMatch(worker, /body\s*:|method\s*:\s*'POST'/)
  assert.doesNotMatch(worker + engine, /anthropic|openai|gemini/i)
  assert.match(es.alerts, /sin inteligencia artificial/)
  assert.match(en.alerts, /without artificial intelligence/)

  // Phone alerts now list health alerts too.
  assert.match(section('es', 'Avisos en tu teléfono'), /seguidores y alertas de salud/)
  assert.match(section('en', 'Alerts on your phone'), /followers and health alerts/)
})
