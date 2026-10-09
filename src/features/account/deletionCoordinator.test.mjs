import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCOUNT_DELETION_REQUIREMENTS,
  ACCOUNT_DELETION_SEQUENCE,
  inspectDeletionEvidence,
  matchesActiveLease,
  proposeNextPhase,
} from './deletionCoordinator.ts'

const safeEvidence = () => Object.fromEntries(ACCOUNT_DELETION_REQUIREMENTS.map(k => [k, true]))

test('missing evidence blocks destructive operations and names each blocker', () => {
  const evaluation = inspectDeletionEvidence({})
  assert.equal(evaluation.missing.length, ACCOUNT_DELETION_REQUIREMENTS.length)
  assert.equal(evaluation.readyForHumanReview, false)
  assert.equal(evaluation.destructiveExecutionAllowed, false)
  assert.equal(proposeNextPhase({}), 'review_request')
})
test('even all evidence only permits review, not account or Storage deletion', () => {
  const evidence = safeEvidence()
  assert.equal(inspectDeletionEvidence(evidence).readyForHumanReview, true)
  assert.equal(inspectDeletionEvidence(evidence).destructiveExecutionAllowed, false)
  assert.equal(proposeNextPhase(evidence), 'auth_final')
})
test('none of the required evidence accepts truthy strings, numbers, or missing flags', () => {
  const complete = safeEvidence()
  for (const key of ACCOUNT_DELETION_REQUIREMENTS) {
    const evidence = { ...complete, [key]: 'true' }
    assert.ok(inspectDeletionEvidence(evidence).missing.includes(key))
  }
})
test('logical progression never skips safety gates', () => {
  const state = {}
  const expected = [
    'review_request', 'review_request', 'freeze_writes', 'archive_others',
    'archive_others', 'remove_media', 'remove_media', 'remove_media',
    'remove_media', 'remove_media', 'verify_data', 'revoke_sessions',
    'await_manual_review', 'auth_final',
  ]
  const keys = ACCOUNT_DELETION_REQUIREMENTS
  assert.equal(keys.length+1,expected.length)
  expected.forEach((phase, i) => {
    assert.equal(proposeNextPhase(state),phase)
    if (i < keys.length) state[keys[i]] = true
  })
  assert.ok(ACCOUNT_DELETION_SEQUENCE.includes('auth_final'))
  assert.equal(ACCOUNT_DELETION_SEQUENCE.at(-1),'auth_final')
})
test('CAS lease checks require same job, token, version and non-expired lease', () => {
  const a = {jobId:'a', token:'one', version:2, expiresAtMs:3000}
  assert.equal(matchesActiveLease(a,a,2999),true)
  assert.equal(matchesActiveLease(a,a,3000),false)
  assert.equal(matchesActiveLease(null,a,0),false)
  assert.equal(matchesActiveLease(a,{...a,jobId:'b'},1000),false)
  assert.equal(matchesActiveLease(a,{...a,token:'two'},1000),false)
  assert.equal(matchesActiveLease(a,{...a,version:1},1000),false)
  assert.equal(matchesActiveLease(a,{...a,expiresAtMs:4000},1000),false)
  assert.equal(matchesActiveLease({...a,version:0},{...a,version:0},1000),false)
})
