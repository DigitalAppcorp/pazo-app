import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAZO_CAMPAIGN,
  MARKETING_ATTRIBUTION_TTL_MS,
  createPazoMarketingRecorder,
  parsePazoCampaign,
  prepareAutomaticCampaignIntake,
} from './attribution.ts'

const valid = '?utm_source=meta&utm_medium=paid_social&utm_campaign='
  + PAZO_CAMPAIGN + '&utm_content=perfil_es'

const makeStore = () => {
  const values = new Map()
  return {
    values,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  }
}

test('only the exact approved campaign and creative pass; never return raw URL or click IDs', () => {
  assert.deepEqual(parsePazoCampaign(valid + '&fbclid=sensitive-token', 1000), {
    source: 'meta', medium: 'paid_social', campaign: PAZO_CAMPAIGN,
    creative: 'perfil_es', firstTouchAt: 1000,
  })
  for (const bad of [
    '?utm_source=google',
    valid + '&utm_content=qr_en',
    valid.replace('perfil_es', 'john%40example.com'),
    valid.replace('meta', 'facebook'),
    valid.replace('paid_social', 'cpc'),
    valid.replace(PAZO_CAMPAIGN, 'other_campaign'),
  ]) assert.equal(parsePazoCampaign(bad, 1000), null)
})

test('disabled by default integration performs no reads or writes', () => {
  const store = makeStore()
  const recorder = createPazoMarketingRecorder(store, { enabled: false, now: () => 1000 })
  recorder.captureLanding(valid)
  recorder.signupRequested()
  recorder.signupVerified('1970-01-01T00:00:01Z', '1970-01-01T00:00:01Z')
  recorder.firstPetCreated()
  assert.equal(store.values.size, 0)
  assert.equal(recorder.read(), null)
})

test('signup request must be verified separately; first pet is idempotent', () => {
  let clock = Date.parse('2026-10-24T01:00:00.000Z')
  const store = makeStore()
  const r = createPazoMarketingRecorder(store, { enabled: true, now: () => clock })
  r.captureLanding(valid)
  assert.deepEqual(r.read()?.steps, ['landing'])
  r.signupVerified(new Date(clock).toISOString(), new Date(clock).toISOString())
  r.firstPetCreated()
  assert.deepEqual(r.read()?.steps, ['landing'])
  r.signupRequested()
  assert.deepEqual(r.read()?.steps, ['landing','signup_requested'])
  const oldAccount = new Date(clock - 86400000).toISOString()
  r.signupVerified(oldAccount, new Date(clock).toISOString())
  assert.deepEqual(r.read()?.steps, ['landing','signup_requested'])
  clock += 1000
  const createdAt = new Date(clock).toISOString()
  r.signupVerified(createdAt, createdAt)
  r.signupVerified(createdAt, createdAt)
  r.firstPetCreated()
  r.firstPetCreated()
  assert.deepEqual(r.read()?.steps, [
    'landing', 'signup_requested', 'signup_verified', 'first_pet_created',
  ])
  assert.ok(!JSON.stringify(r.read()).includes('user_id'))
})

test('stored campaign expires, corrupt data and storage errors are safe', () => {
  let clock = 10000
  const store = makeStore()
  const r = createPazoMarketingRecorder(store, { enabled: true, now: () => clock })
  r.captureLanding(valid)
  clock += MARKETING_ATTRIBUTION_TTL_MS + 1
  assert.equal(r.read(), null)
  assert.equal(store.values.size, 0)
  store.values.set('pazo_marketing_firstparty_v1', '{bad-json')
  assert.equal(r.read(), null)
  const blocked = createPazoMarketingRecorder({
    getItem() { throw Error('blocked') },
    setItem() { throw Error('blocked') },
    removeItem() { throw Error('blocked') },
  }, { enabled: true })
  assert.doesNotThrow(() => blocked.captureLanding(valid))
  assert.equal(blocked.read(), null)
})

test('first touch is immutable within one session', () => {
  const store = makeStore()
  const r = createPazoMarketingRecorder(store, { enabled: true, now: () => 5000 })
  r.captureLanding(valid)
  r.captureLanding(valid.replace('perfil_es', 'qr_en'))
  assert.equal(r.read()?.attribution.creative, 'perfil_es')
})

test('verified registration produces automatic allowlisted UTM without opt-in field or PII',()=>{
  const store=makeStore()
  let now=Date.parse('2026-10-24T01:00:00Z')
  const r=createPazoMarketingRecorder(store,{enabled:true,now:()=>now})
  r.captureLanding(valid)
  assert.equal(prepareAutomaticCampaignIntake(r.read()),null)
  r.signupRequested()
  now+=1000
  const created=new Date(now).toISOString()
  r.signupVerified(created,created)
  assert.deepEqual(prepareAutomaticCampaignIntake(r.read()),{
    utm_source:'meta',utm_medium:'paid_social',
    utm_campaign:PAZO_CAMPAIGN,utm_content:'perfil_es',
    first_touch_at:'2026-10-24T01:00:00.000Z',
  })
  const raw=JSON.stringify(prepareAutomaticCampaignIntake(r.read()))
  for(const key of ['owner_id','email','consent','jwt','url','fbclid'])assert.ok(!raw.includes(key))
  r.clear()
  assert.equal(prepareAutomaticCampaignIntake(r.read()),null)
})
