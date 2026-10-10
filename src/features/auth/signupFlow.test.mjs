import test from 'node:test'
import assert from 'node:assert/strict'
import { classifySignUpResult } from './signupFlow.ts'

test('valid signup session can advance to pet creation', () => {
  assert.equal(classifySignUpResult(null, { access_token: 'synthetic' }), 'authenticated')
})
test('email confirmation with no session must not advance to pet creation', () => {
  assert.equal(classifySignUpResult(null, null), 'verify_email')
})
test('signup errors must never advance', () => {
  assert.equal(classifySignUpResult({ message: 'synthetic' }, null), 'failed')
  assert.equal(classifySignUpResult({ message: 'synthetic' }, { access_token: 'synthetic' }), 'failed')
})
