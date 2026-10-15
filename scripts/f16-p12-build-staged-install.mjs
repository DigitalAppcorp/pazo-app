// PAZO F16-P12: pure source-to-staged-SQL builder.
// Run: node scripts/f16-p12-build-staged-install.mjs --verify
// Use the staged file ONLY after approved retention/terms/PO GO.
// This program never connects to Supabase or PayPal.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const P=[
 'supabase/drafts/f16_p06_durable_checkout_consent_DO_NOT_APPLY.sql',
 'supabase/drafts/f16_p08_read_checkout_recovery_DO_NOT_APPLY.sql',
 'supabase/drafts/f16_p10_recovered_checkout_binding_DO_NOT_APPLY.sql',
]
function extract(c){
 assert.ok(c.includes('\\set ON_ERROR_STOP on')&&
  c.includes('DO $guard$')&&c.trimEnd().endsWith('COMMIT;'))
 c=c.replace(/^\\set ON_ERROR_STOP on[ \t]*\r?\n/m,'')
 c=c.replace(/(^|\n)BEGIN;\s*\n/,'\n')
 const guard=/DO \$guard\$[\s\S]*?\$guard\$;[ \t]*\r?\n/
 assert.ok(guard.test(c))
 c=c.replace(guard,'')
 c=c.replace(/\nCOMMIT;\s*$/,'\n')
 return c.trim()+'\n'
}
const sources=P.map(p=>extract(fs.readFileSync(p,'utf8')))
const output=fs.readFileSync('supabase/drafts/f16_p12_staged_install_REQUIRES_PO_GO.sql','utf8')
const headings=[
 '-- 01 P06+P07 immutable bilingual offer, consent and single POST claim\n',
 '-- 02 P08 private read-only recovery\n',
 '-- 03 P10 review-gated recovered ID binding\n',
]
const front=output.slice(0,output.indexOf(headings[0]))
const last=output.slice(output.indexOf('\n-- Validate all grants AFTER staging'))
assert.ok(front.includes('DO $p12_gate$'))
assert.ok(last.includes('DO $p12_post$'))
const regenerated=front+sources.map((s,i)=>headings[i]+s+'\n').join('')+last
assert.equal(output,regenerated,'P12 bundle drifted from reviewed source drafts')
assert.equal((output.match(/\bBEGIN;/g)||[]).length>3,true,
 'SQL plpgsql BEGIN blocks expected; top-level transactions need human review')
assert.equal((output.match(/^\s*COMMIT;/gm)||[]).length,1)
assert.equal((output.match(/^CREATE FUNCTION public\.f16_p/gm)||[]).length,5)
for(const n of ['PAYMENT.SALE.COMPLETED','paypal_payment_entries']){
 assert.ok(!output.includes('INSERT INTO supporter_private.'+n))
}
console.log('PASS F16-P12 staged installation bundle reproducible; no network or DB writes')
