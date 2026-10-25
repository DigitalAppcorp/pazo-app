import test from 'node:test'
import assert from 'node:assert/strict'
import { publicSupporterControls } from '../../../src/features/admin/publicSupporterControls.mjs'
const ready = {
  checkoutsRequested: false,
  checkoutsEnabled: false,
  invitationsEnabled: false,
  healthy: true,
  certified: true,
  openBlocker: null,
}
test('review: available actions correspond to each independent server state', () => {
  assert.deepEqual(publicSupporterControls(ready), {
    financial: 'open_checkouts',
    promotion: 'resume_invitations',
  })
  assert.deepEqual(
    publicSupporterControls({
      ...ready,
      checkoutsRequested: true,
      checkoutsEnabled: true,
      invitationsEnabled: true,
    }),
    { financial: 'pause_checkouts', promotion: 'pause_invitations' },
  )
  assert.deepEqual(
    publicSupporterControls({
      ...ready,
      checkoutsRequested: true,
      checkoutsEnabled: true,
    }),
    { financial: 'pause_checkouts', promotion: 'resume_invitations' },
  )
  assert.deepEqual(
    publicSupporterControls({ ...ready, invitationsEnabled: true }),
    { financial: 'open_checkouts', promotion: 'pause_invitations' },
  )
})
test('review: unavailable certificate, health or merchant never offers an actionable opening', () => {
  for (const openBlocker of [
    'hosted_gate_required',
    'health_requires_review',
    'merchant_requires_review',
  ]) {
    assert.equal(
      publicSupporterControls({ ...ready, openBlocker }).financial,
      null,
    )
    assert.equal(
      publicSupporterControls({ ...ready, openBlocker }).promotion,
      'resume_invitations',
    )
  }
})
test('review: a safety stop preserves the emergency pause for a previously enabled checkout', () => {
  assert.deepEqual(
    publicSupporterControls({
      ...ready,
      checkoutsRequested: true,
      healthy: false,
      openBlocker: 'health_requires_review',
    }),
    { financial: 'pause_checkouts', promotion: 'resume_invitations' },
  )
})
test('review: stale, incomplete or contradictory snapshots cannot enable any control', () => {
  for (const value of [
    null,
    {},
    [],
    { ...ready, openBlocker: undefined },
    { ...ready, healthy: false },
    { ...ready, certified: false },
    { ...ready, checkoutsEnabled: true },
    {
      ...ready,
      checkoutsRequested: true,
      checkoutsEnabled: true,
      healthy: false,
      openBlocker: 'health_requires_review',
    },
    {
      ...ready,
      checkoutsRequested: true,
      checkoutsEnabled: true,
      certified: false,
      openBlocker: 'hosted_gate_required',
    },
    {
      ...ready,
      checkoutsRequested: true,
      checkoutsEnabled: true,
      openBlocker: 'merchant_requires_review',
    },
    { ...ready, invitationsEnabled: 'true' },
    { ...ready, openBlocker: 'untrusted_code' },
  ]) {
    assert.deepEqual(publicSupporterControls(value), {
      financial: null,
      promotion: null,
    })
  }
})
