import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createPublicSupporterAdminHandler,
  PUBLIC_SUPPORTER_CONFIRMATIONS,
} from '../../functions/pazo-admin-public-supporter/handler.mjs'
import { createPublicSupporterMaintenance } from '../../functions/pazo-paypal-live-worker/publicSupporterMaintenance.mjs'
const id = '18000000-0000-4000-8000-00000000ffff'
const actor = { id, isAdmin: true, freshSession: true }
const input = {
  action: 'pause_checkouts',
  confirmation: PUBLIC_SUPPORTER_CONFIRMATIONS.pause_checkouts,
  expectedRevision: 0,
  requestId: id,
}
const req = (value = input, options = {}) =>
  new Request(
    'https://fixture.supabase.co/functions/v1/pazo-admin-public-supporter',
    {
      method: 'POST',
      headers: {
        origin: 'https://pazo-app.vercel.app',
        'content-type': 'application/json',
      },
      body: JSON.stringify(value),
      ...options,
    },
  )
test('F18 all four operational controls require precise confirmation and fresh GoTrue admin MFA', async () => {
  for (const [action, confirmation] of Object.entries(
    PUBLIC_SUPPORTER_CONFIRMATIONS,
  )) {
    let calls = 0
    const h = createPublicSupporterAdminHandler({
      authenticateAdmin: async () => actor,
      change: async (value) => {
        calls++
        assert.equal(value.actorId, id)
        assert.equal(value.action, action)
        return { code: 'updated', revision: 1, secret: 'NEVER_EXPOSE' }
      },
    })
    const r = await h(req({ ...input, action, confirmation }))
    assert.equal(r.status, 200)
    assert.deepEqual(await r.json(), {
      code: 'updated',
      revision: 1,
      mayCharge: false,
    })
    assert.equal(
      (await h(req({ ...input, action, confirmation: 'yes' }))).status,
      400,
    )
    assert.equal(calls, 1)
    for (const proof of [
      { ...actor, freshSession: false },
      { ...actor, isAdmin: false },
      null,
    ])
      assert.equal(
        (
          await createPublicSupporterAdminHandler({
            authenticateAdmin: async () => proof,
            change: async () => {
              throw Error('MUST_NOT_MUTATE')
            },
          })(req({ ...input, action, confirmation }))
        ).status,
        403,
      )
  }
})
test('review: retired mass resolution cannot reach the service mutation, even with admin MFA and duplicate nonce', async () => {
  let calls = 0
  const h = createPublicSupporterAdminHandler({
    authenticateAdmin: async () => actor,
    change: async () => {
      calls++
      return { code: 'updated' }
    },
  })
  const retired = {
    ...input,
    action: 'resolve_incidents',
    confirmation: 'CONFIRMO REVISAR INCIDENCIAS',
  }
  assert.equal((await h(req(retired))).status, 400)
  assert.equal((await h(req(retired))).status, 400)
  assert.equal(calls, 0)
  assert.equal(
    Object.hasOwn(PUBLIC_SUPPORTER_CONFIRMATIONS, 'resolve_incidents'),
    false,
  )
})
test('F18 forged owner, revision, nonce, extra fields, oversized input and foreign origin are denied', async () => {
  let calls = 0
  const h = createPublicSupporterAdminHandler({
    authenticateAdmin: async () => actor,
    change: async () => {
      calls++
      return { code: 'updated' }
    },
  })
  for (const value of [
    { ...input, owner: id },
    { ...input, expectedRevision: -1 },
    { ...input, requestId: 'bad' },
    { ...input, action: '__proto__' },
    null,
    [],
    { ...input, confirmation: 'x'.repeat(3000) },
  ])
    assert.equal((await h(req(value))).status, 400)
  assert.equal(
    (
      await h(
        req(input, {
          headers: {
            origin: 'https://evil.invalid',
            'content-type': 'application/json',
          },
        }),
      )
    ).status,
    403,
  )
  assert.equal(calls, 0)
})
test('F18 unknown admin outcome exposes no private diagnostic and never retries', async () => {
  let calls = 0
  const r = await createPublicSupporterAdminHandler({
    authenticateAdmin: async () => actor,
    change: async () => {
      calls++
      throw Error('SENSITIVE_PROVIDER_PAYLOAD')
    },
  })(req())
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), {
    code: 'outcome_unknown',
    mayCharge: false,
  })
  assert.equal(calls, 1)
})
test('F18 worker delegates inbox+ACK to one transaction; financial review is preserved', async () => {
  const calls = []
  const run = createPublicSupporterMaintenance({
    rpc: async (...args) => calls.push(args),
    readWebhookReady: async () => true,
  })
  await run({ outcome: 'idle' })
  await run({ outcome: 'review' })
  assert.deepEqual(calls, [
    [
      'publicSupporterTick',
      { p_webhook_ready: true, p_financial_review: false },
    ],
    [
      'publicSupporterTick',
      { p_webhook_ready: true, p_financial_review: true },
    ],
  ])
})
test('F18 unavailable webhook fails closed for new sales without retrying payment', async () => {
  const calls = []
  await createPublicSupporterMaintenance({
    rpc: async (...args) => calls.push(args),
    readWebhookReady: async () => {
      throw Error('network')
    },
  })({ outcome: 'unknown' })
  assert.deepEqual(calls, [
    [
      'publicSupporterTick',
      { p_webhook_ready: false, p_financial_review: true },
    ],
  ])
})
