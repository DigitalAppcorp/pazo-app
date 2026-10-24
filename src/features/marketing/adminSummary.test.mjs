import test from 'node:test'
import assert from 'node:assert/strict'
import {parseMarketingSummary} from './adminSummary.ts'
const totals={landing_signals:2,verified_signups:1,first_pet_within_7d:1,d7_matured_owners:0,d7_screen_activity_proxy:0}
const sample=()=>({status:'collecting',period_days:30,as_of:'2026-10-24T04:00:00Z',time_zone:'America/Los_Angeles',totals:{...totals},daily:[{...totals,day:'2026-10-23',campaign:'pazo_beta_local_202610',creative:'perfil_es'}]})
test('valid aggregate crosses boundary; malformed counts, unexpected identities and false totals do not',()=>{
 assert.deepEqual(parseMarketingSummary(sample()),sample())
 for(const mutate of [v=>v.owner_id='must-not-render',v=>v.daily[0].creative='person@example.invalid',v=>v.totals.landing_signals=99,
  v=>v.daily.push(v.daily[0]),v=>v.daily[0].day='2026-02-31',v=>v.totals.d7_screen_activity_proxy=-1,v=>v.period_days=365,v=>v.daily[0].email='private']){
  const data=sample();mutate(data);assert.throws(()=>parseMarketingSummary(data),/INVALID_AGGREGATE/)
 }
})
