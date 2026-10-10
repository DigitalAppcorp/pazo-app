import test from 'node:test'
import assert from 'node:assert/strict'
import {
  A3_GATES, A3_EXECUTION_RELEASE_APPROVED,
  inspectA3DeletionEvidence, inspectA3ServerJob,
} from './deletionExecutionPlan.ts'

const verified = Object.fromEntries(A3_GATES.map(name => [name, true]))

test('A3 executor stays disabled even after all review evidence', () => {
  assert.equal(A3_EXECUTION_RELEASE_APPROVED, false)
  assert.deepEqual(inspectA3DeletionEvidence(verified), {
    phase: 'await_auth_final', missing: [], readyForReview: true,
    destructiveExecutionAllowed: false,
  })
})

test('missing any independent gate always blocks final review', () => {
  for (const gate of A3_GATES) {
    const result = inspectA3DeletionEvidence({...verified, [gate]: false})
    assert.ok(result.missing.includes(gate), gate)
    assert.equal(result.readyForReview, false, gate)
    assert.equal(result.destructiveExecutionAllowed, false, gate)
  }
})

test('evidence must be strictly true, never truthy or client-provided status strings', () => {
  for (const invalid of [null, [], 'approved', 1]) {
    assert.throws(() => inspectA3DeletionEvidence(invalid))
  }
  for (const invalid of ['true', 1, {}, null, undefined]) {
    const result = inspectA3DeletionEvidence({...verified, valid_request: invalid})
    assert.equal(result.phase, 'review_request')
  }
})

test('next phase prioritizes ownership and third-party safety ahead of media', () => {
  assert.equal(inspectA3DeletionEvidence({}).phase, 'review_request')
  assert.equal(inspectA3DeletionEvidence({...verified, write_fence_active: false}).phase,'freeze_writes')
  assert.equal(inspectA3DeletionEvidence({...verified, third_party_contributions_preserved: false, storage_objects_removed_at_origin: false}).phase,'preserve_others')
  assert.equal(inspectA3DeletionEvidence({...verified, old_public_urls_checked: false}).phase,'remove_media')
  assert.equal(inspectA3DeletionEvidence({...verified, private_data_and_fk_clean: false}).phase,'clean_private_data')
  assert.equal(inspectA3DeletionEvidence({...verified, old_sessions_revoked: false}).phase,'revoke_sessions')
})

test('stale lease, cancelled request and missing operator approval block review', () => {
  const good = {requestStatus: 'processing', operatorApproved: true, leaseTokenPresent: true, leaseExpiresAtMs: 1100, revision: 1}
  assert.equal(inspectA3ServerJob(good,1000).reviewable,true)
  for (const invalid of [
    {...good, requestStatus: 'cancelled'},
    {...good, requestStatus: 'requested'},
    {...good, requestStatus: 'completed'},
    {...good, operatorApproved: false},
    {...good, leaseTokenPresent: false},
    {...good, leaseExpiresAtMs: 1000},
    {...good, leaseExpiresAtMs: NaN},
    {...good, revision: 0},
    {...good, revision: 1.2},
  ]) assert.equal(inspectA3ServerJob(invalid,1000).reviewable,false)
})
