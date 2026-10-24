import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldSendLandingSignal,LANDING_SIGNAL_REPEAT_MS } from './landingSignal.ts'

test('landing signals are not unique-visitor IDs; same tab caps repeated calls',()=>{
 const now=Date.parse('2026-10-24T04:00:00Z')
 assert.equal(shouldSendLandingSignal(null,'perfil_es',now),true)
 assert.equal(shouldSendLandingSignal({creative:'perfil_es',sentAt:now},'perfil_es',now+1000),false)
 assert.equal(shouldSendLandingSignal({creative:'perfil_es',sentAt:now},'perfil_es',now+LANDING_SIGNAL_REPEAT_MS),true)
 assert.equal(shouldSendLandingSignal({creative:'perfil_es',sentAt:now},'qr_en',now+1000),true)
 assert.equal(shouldSendLandingSignal({creative:'perfil_es',sentAt:now+90000},'perfil_es',now),true)
 assert.equal(shouldSendLandingSignal({},'perfil_es',now),true)
 assert.equal(shouldSendLandingSignal(null,'unexpected_creative',now),false)
 assert.equal(shouldSendLandingSignal(null,'perfil_es',NaN),false)
})
