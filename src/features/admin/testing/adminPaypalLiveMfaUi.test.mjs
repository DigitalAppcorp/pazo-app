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

test('TOTP enrollment accepts Supabase SVG QR content and supports safe unfinished setup recovery',()=>{
 assert.ok(component.includes(';utf-8|;utf8|;base64|),'))
 assert.ok(component.includes("data?.all?.find(f=>f.factor_type==='totp'"))
 assert.ok(component.includes("f.status==='unverified'"))
 assert.ok(component.includes("supabase.auth.mfa.unenroll({"))
 assert.ok(component.includes("f.id===pendingFactorId&&"))
 assert.ok(component.includes('Reiniciar registro pendiente'))
 assert.ok(component.includes('if(busy||pendingFactorId)return'))
 assert.equal(component.includes('console.log'),false)
})
