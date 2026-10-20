import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const component=readFileSync(new URL('../components/AdminPaypalMfaStepUp.tsx',import.meta.url),'utf8')
const admin=readFileSync(new URL('../components/AdminPayPalSettings.tsx',import.meta.url),'utf8')
test('admin MFA requires a new six-digit verified authenticator code, not existing aal2 alone',()=>{
 assert.ok(component.includes("supabase.auth.mfa.challengeAndVerify({"))
 assert.ok(component.includes("supabase.auth.mfa.getAuthenticatorAssuranceLevel()"))
 assert.ok(component.includes("data?.currentLevel!=='aal2'"))
 assert.ok(component.includes("!/^\\d{6}$/.test(code)"))
 assert.ok(component.indexOf("onVerified()")>component.indexOf("challengeAndVerify({"))
})
test('enrollment QR is not logged or stored in database and is hidden after successful step-up',()=>{
 assert.ok(component.includes("supabase.auth.mfa.enroll({"))
 assert.ok(component.includes("setQrCode('');setRecent(true)"))
 assert.ok(component.includes("No compartas el código QR."))
 assert.equal(component.includes("console.log"),false)
 assert.equal(component.includes("supabase.rpc("),false)
})
test('MFA enrollment is available in Live settings while credential provisioning remains disabled',()=>{
 assert.ok(admin.includes("const LIVE_EDGE_PROVISIONING_RELEASED=false"))
 assert.ok(admin.includes("env==='live'&&"))
 assert.ok(!admin.includes("env==='live'&&LIVE_EDGE_PROVISIONING_RELEASED&&"))
 assert.ok(admin.includes("<AdminPaypalMfaStepUp"))
 assert.ok(admin.includes('data-pazo-live-vault-locked="true"'))
 assert.ok(!admin.includes('LIVE_EDGE_PROVISIONING_RELEASED=true'))
})
