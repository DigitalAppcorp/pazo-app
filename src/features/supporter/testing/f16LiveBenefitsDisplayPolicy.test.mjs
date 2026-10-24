import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const release=readFileSync(new URL('../supporterUiRelease.ts',import.meta.url),'utf8')
const status=readFileSync(new URL('../useSupporterMembershipStatus.ts',import.meta.url),'utf8')
const themes=readFileSync(new URL('../components/SupporterThemePreviewPanel.tsx',import.meta.url),'utf8')

test('L1 verified benefits remain visible when the production build flag is absent',()=>{
 assert.match(release,/export const supporterBenefitsUiEnabled\s*=\s*import\.meta\.env\.VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED !== 'false'\s*\|\|\s*supporterSandboxUi/)
 assert.ok(!release.includes("VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'"))
})

test('explicit operator presentation opt-out remains possible without granting benefits',()=>{
 assert.match(release,/VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED !== 'false'/)
 assert.match(status,/if \(!enabled \|\| !benefitsEnabled\)/)
 assert.match(themes,/const liveBenefitsUI = supporterBenefitsUiEnabled/)
})

test('backend owner and pet RPCs, not a PayPal return or local flag, determine badges and themes',()=>{
 assert.match(status,/supabase\.rpc\('pazo_supporter_my_account_status'\)/)
 assert.match(status,/supabase\.rpc\('pazo_supporter_public_pet_benefits'/)
 assert.match(status,/if\(authError \|\| !UUID\.test/)
 assert.doesNotMatch(status,/(localStorage|sessionStorage)\s*\./)
})
