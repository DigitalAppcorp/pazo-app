import test from 'node:test'
import assert from 'node:assert/strict'
import { classifySignUpResult, signUpConfirmationRedirectUrl } from './signupFlow.ts'
import { readFileSync } from 'node:fs'

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

test('signup confirmation returns to the same localhost origin or future production origin', () => {
  assert.equal(signUpConfirmationRedirectUrl('http://127.0.0.1:5173/foo?bar=1'), 'http://127.0.0.1:5173')
  assert.equal(signUpConfirmationRedirectUrl('https://pazo.example/account'), 'https://pazo.example')
  const source=readFileSync(new URL('../../context/AuthContext.tsx', import.meta.url), 'utf8')
  assert.match(source,/emailRedirectTo: signUpConfirmationRedirectUrl\(window\.location\.origin\)/)
  assert.match(source,/supabase\.auth\.signUp/)
})
