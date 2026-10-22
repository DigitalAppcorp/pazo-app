import test from 'node:test'
import assert from 'node:assert/strict'
import { isRecoveryReturn, recoveryRedirectUrl, isValidPazoPassword, isVerifiedRecoverySession } from './recoveryFlow.ts'

test('recovery marker is distinct from ordinary routes and links', () => {
  assert.equal(isRecoveryReturn('?auth=recovery'), true)
  assert.equal(isRecoveryReturn('?foo=1&auth=recovery'), true)
  assert.equal(isRecoveryReturn(''), false)
  assert.equal(isRecoveryReturn('?auth=login'), false)
  assert.equal(isRecoveryReturn('?auth=recovery-other'), false)
})

test('password reset redirect uses only the origin and a marker', () => {
  assert.equal(recoveryRedirectUrl('https://pazo.example:443/other?q=1'), 'https://pazo.example/?auth=recovery')
  assert.equal(recoveryRedirectUrl('http://localhost:5173'), 'http://localhost:5173/?auth=recovery')
})

test('password policy matches signup requirements', () => {
  for (const password of ['', 'abcD123', 'abcdefgh1', 'ABCDEFGH1', 'Abcdefgh', 'Abcdefgh1']) {
    assert.equal(isValidPazoPassword(password), password === 'Abcdefgh1')
  }
})

test('URL marker or ordinary login cannot authorize password reset; recovery event and user required', () => {
  assert.equal(isVerifiedRecoverySession(false, false), false)
  assert.equal(isVerifiedRecoverySession(false, true), false)
  assert.equal(isVerifiedRecoverySession(true, false), false)
  assert.equal(isVerifiedRecoverySession(true, true), true)
})
