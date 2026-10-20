
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assessPazoLiveVerifiedSale,
  assessPazoLiveVerifiedReversal
} from '../../../../supabase/functions/pazo-paypal-live-webhook/liveVerifiedSettlement.mjs'

const binding = Object.freeze({
  sourceEnvironment: 'live',
  provider: 'paypal',
  ownerVerified: true,
  merchantGenerationVerified: true,
  ownerId: '12345678-1234-4234-8234-123456789abc',
  intentId: 'intent-23456789-1234-4234-8234-123456789abc',
  subscriptionId: 'I-SUBSCRIPTION123456',
  merchantGeneration: 7
})

const receipt = Object.freeze({
  provider: 'paypal',
  sourceEnvironment: 'live',
  merchantVerified: true,
  signatureVerified: true,
  subscriptionVerified: true,
  subscriptionId: binding.subscriptionId,
  merchantGeneration: 7,
  saleId: 'SALE-123456789',
  eventId: 'WH-123456789',
  eventType: 'PAYMENT.SALE.COMPLETED',
  state: 'COMPLETED',
  currency: 'USD',
  amountMinor: 299
})

const period = Object.freeze({
  cycleKey: 'CYCLE-2026-11',
  serviceStart: '2026-11-01T00:00:00.000Z',
  serviceEnd: '2026-12-01T00:00:00.000Z',
  providerPeriodVerified: true
})

test('genuine independent merchant sale maps precisely to private ledger fields', () => {
  const decision = assessPazoLiveVerifiedSale({
    binding,
    receipt,
    period
  })

  assert.equal(decision.ready, true)
  assert.equal(decision.mayGrantBenefits, false)
  assert.equal(decision.record.p_owner, binding.ownerId)
  assert.equal(decision.record.p_sale_id, receipt.saleId)
  assert.equal(decision.record.p_amount_minor, 299)
  assert.equal(decision.record.p_start, period.serviceStart)
})

test('merchant mismatch, unverified sale, wrong amount or unsigned event block billing', () => {
  const changes = [
    { signatureVerified: false },
    { state: 'APPROVAL_PENDING' },
    { amountMinor: 300 },
    { currency: 'EUR' },
    { merchantGeneration: 8 },
    { subscriptionId: 'I-ATTACKER-123456' },
    { merchantVerified: false },
    { subscriptionVerified: false },
    { eventType: 'PAYMENT.SALE.REFUNDED' }
  ]

  for (const change of changes) {
    const d = assessPazoLiveVerifiedSale({
      binding,
      receipt: { ...receipt, ...change },
      period
    })

    assert.equal(d.ready, false)
    assert.equal(d.mayGrantBenefits, false)
    assert.equal(d.record, undefined)
  }

  assert.equal(
    assessPazoLiveVerifiedSale({
      binding: { ...binding, ownerVerified: false },
      receipt,
      period
    }).ready,
    false
  )
})

test('no auto-generated monthly cycle without independently verified period proof', () => {
  const variants = [
    { ...period, providerPeriodVerified: false },
    { ...period, serviceEnd: '2026-11-01T00:00:00.000Z' },
    { ...period, serviceEnd: '2027-01-01T00:00:00.000Z' },
    { ...period, serviceEnd: '2026-12-01' },
    { ...period, serviceEnd: '2026-11-31T00:00:00.000Z' },
    { ...period, serviceEnd: '2026-12-01T00:00:00Z' },
    { ...period, serviceStart: '2026-02-30T00:00:00.000Z' },
    { ...period, serviceEnd: '2026-12-01T00:00:00.0000Z' },
    { cycleKey: 'fake' }
  ]

  for (const p of variants) {
    const d = assessPazoLiveVerifiedSale({
      binding,
      receipt,
      period: p
    })

    assert.equal(d.ready, false)
  }
})

test('signed and merchant-scoped reversal maps to immutable hold, never a new period', () => {
  const refunded = {
    ...receipt,
    eventType: 'PAYMENT.SALE.REFUNDED',
    holdId: 'HOLD-12345678'
  }

  const d = assessPazoLiveVerifiedReversal({
    binding,
    receipt: refunded
  })

  assert.equal(d.ready, true)
  assert.equal(d.mayGrantBenefits, false)
  assert.equal(d.record.p_kind, 'refunded')

  const reversed = assessPazoLiveVerifiedReversal({
    binding,
    receipt: {
      ...refunded,
      eventType: 'PAYMENT.SALE.REVERSED'
    }
  })

  assert.equal(reversed.ready, true)
  assert.equal(reversed.record.p_kind, 'reversed')

  assert.equal(
    assessPazoLiveVerifiedReversal({
      binding,
      receipt: {
        ...refunded,
        signatureVerified: false
      }
    }).ready,
    false
  )
})
