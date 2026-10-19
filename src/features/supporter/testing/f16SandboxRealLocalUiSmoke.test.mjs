import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8')
const edge=source('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts')
const cli=source('../../../../scripts/f16-run-real-sandbox-qa.ps1')
const checkout=source('../components/SandboxCheckoutQaPanel.tsx')
const qaAccount=source('../components/SandboxV2AccountPanel.tsx')
const original=source('../components/SupporterAccountManagement.tsx')

test('actual PAZO Vite QA uses exact localhost origin and only Sandbox provider',()=>{
 assert.match(cli,/npm run dev -- --host localhost --port 5173 --strictPort/)
 assert.match(cli,/VITE_PAZO_F16_SANDBOX_QA_UI = 'true'/)
 assert.match(cli,/VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED = 'false'/)
 assert.match(cli,/VITE_SUPABASE_URL = 'https:\/\/mrybvqdebbgcayuvgkkr.supabase.co'/)
 assert.match(edge,/new Set\(\['http:\/\/localhost:5173','http:\/\/127.0.0.1:5173'\]\)/)
 assert.match(edge,/const QA_CHECKOUT_RELEASE_APPROVED = true/)
 assert.match(edge,/const QA_V2_MANAGEMENT_RELEASE_APPROVED = true/)
 assert.match(edge,/get\('PAZO_F16_PAYPAL_ENV'\)!=='sandbox'/)
 assert.match(edge,/f16_qa_v2_owner_can_checkout/)
 assert.match(edge,/new Set\(\[QA_ORIGIN,\.\.\.QA_LOCAL_ORIGINS\]\)/)
 assert.match(edge,/const returnUrl=QA_ORIGIN\+'\/'/)
 assert.doesNotMatch(edge,/https:\/\/api-m\.paypal\.com/)
})
test('real PAZO QA displays only V2 subscriber actions, not P06 historic cancellation',()=>{
 assert.match(checkout,/functions\/v1\/f16-paypal-supporter-v2-qa/)
 assert.match(qaAccount,/functions\/v1\/f16-paypal-supporter-v2-qa/)
 assert.match(qaAccount,/action:'verify_payment'/)
 assert.match(qaAccount,/result\.mayGrantBenefits===true/)
 // In the refreshed product UX, the QA V2 and legacy P06 branches are
 // mutually exclusive. Never allow P06 historic cancellation from QA.
 assert.ok(original.includes('onAccountInspection={setQaV2AccountState}') && original.includes('onRecoveryStage={setQaRecoveryStage}') && original.includes('resumeRevision={qaResumeRevision}'),
   'QA V2 management must remain owner-only and report verified account state')
 assert.match(original,/accounts\?\.map\(account/)
 assert.match(original,/if \(!qaV2Screen\) void refresh\(\)/)
 assert.match(qaAccount,/amigo-pazo-inicio\.png/)
 assert.match(qaAccount,/amigo-pazo-3-meses\.png/)
 assert.match(qaAccount,/amigo-pazo-6-meses\.png/)
 assert.match(qaAccount,/amigo-pazo-12-meses\.png/)
 assert.match(qaAccount,/NO representan beneficios concedidos/)
})
