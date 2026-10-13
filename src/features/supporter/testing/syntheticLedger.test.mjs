import test from 'node:test'
import assert from 'node:assert/strict'
import { createSyntheticLedger } from './syntheticLedger.mjs'

const start = Date.parse('2026-10-01T00:00:00Z')
const end = Date.parse('2026-11-01T00:00:00Z')
const expected = { ownerId: 'owner-A', merchant: 'merchant-A', plan: 'pazo-monthly' }
const payment = (patch = {}) => ({
  provider: 'paypal', id: 'sale-1', ownerId: 'owner-A', merchant: 'merchant-A',
  plan: 'pazo-monthly', currency: 'USD', amountMinor: 299,
  status: 'COMPLETED', providerConfirmed: true, periodStart: start, periodEnd: end, ...patch
})

test('T01 approval without verified payment never creates entitlement', () => {
  assert.equal(createSyntheticLedger().active('owner-A',start),false)
})
test('T02 invalid signature is rejected before payment processing', () => {
  const ledger = createSyntheticLedger()
  assert.deepEqual(ledger.acceptEvent({id:'evt-1',signatureValid:false}),{accepted:false,reason:'invalid_signature'})
  assert.equal(ledger.countPayments(),0)
})
test('T03 completed provider-verified correct amount gives one period', () => {
  const l=createSyntheticLedger(); assert.equal(l.reconcile(payment(),expected).credited,true)
  assert.equal(l.active('owner-A',start),true); assert.equal(l.countPayments(),1)
})
test('T04 repeated event and payment IDs are idempotent', () => {
  const l=createSyntheticLedger()
  for(let i=0;i<5;i++) { l.acceptEvent({id:'evt-1',signatureValid:true}); l.reconcile(payment(),expected) }
  assert.equal(l.countPayments(),1); assert.equal(l.paidIntervals('owner-A').length,1)
})
test('T05 separate events cannot credit same payment twice', () => {
  const l=createSyntheticLedger()
  for(const id of ['evt-1','evt-2']) { l.acceptEvent({id,signatureValid:true}); l.reconcile(payment(),expected) }
  assert.equal(l.countPayments(),1)
})
test('T06 wrong owner merchant plan currency or amount denied', () => {
  for(const patch of [{ownerId:'owner-B'},{merchant:'other'},{plan:'other'},{currency:'EUR'},{amountMinor:300}]) {
    assert.equal(createSyntheticLedger().reconcile(payment(patch),expected).credited,false)
  }
})
test('T07 pending failure and approval without payment denied', () => {
  for(const patch of [{status:'PENDING'},{status:'FAILED'},{status:'ACTIVATED'},{providerConfirmed:false}])
    assert.equal(createSyntheticLedger().reconcile(payment(patch),expected).credited,false)
})
test('T08 cancellation does not erase verified paid-through', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  assert.equal(l.active('owner-A',end-1),true)
})
test('T09 expiry takes effect without notification', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  assert.equal(l.active('owner-A',end),false)
})
test('T10 verified reversal removes entitlement', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  assert.equal(l.reverse('paypal','sale-1'),true); assert.equal(l.active('owner-A',start),false)
})
test('T11 late duplicate payment cannot undo reversal', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected); l.reverse('paypal','sale-1')
  assert.equal(l.reconcile(payment(),expected).credited,false)
  assert.equal(l.active('owner-A',start),false)
})
test('T12 payment attributed to B never credits A', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  assert.equal(l.active('owner-B',start),false)
})
test('T13 revoked consent is never eligible for wall', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  const eligible=({consent,owned,moderated})=>l.active('owner-A',start)&&consent&&owned&&!moderated
  assert.equal(eligible({consent:false,owned:true,moderated:false}),false)
})
test('T14 reactivation requires fresh pet opt-in', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  l.reconcile(payment({id:'sale-2',periodStart:end,periodEnd:end+86400000}),expected)
  const freshOptIn=false
  assert.equal(l.active('owner-A',end)&&freshOptIn,false)
})
test('T15 overlapping periods from different providers do not double count', () => {
  const l=createSyntheticLedger(); l.reconcile(payment(),expected)
  l.reconcile(payment({provider:'stripe',id:'pi-2'}),expected)
  assert.deepEqual(l.paidIntervals('owner-A'),[[start,end]])
})
