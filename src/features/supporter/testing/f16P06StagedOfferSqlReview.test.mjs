import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {F16_P06_SANDBOX_QA_COPY_LOCALES as locales,
 F16_P06_SANDBOX_QA_COPY_REVIEW_ONLY as scope} from '../sandboxQaOfferCopyP06.mjs'

const sql=readFileSync(new URL('../../../../supabase/drafts/f16_p06_sandbox_qa_approved_offer_REQUIRES_NEW_PUBLISH_GO.sql',import.meta.url),'utf8')
const sqlQuote=value=>"'"+value.replaceAll("'","''")+"'"

test('The approved bilingual SQL must match the ES/EN copy byte-for-byte',()=>{
 assert.equal(scope.status,'QA_COPY_REVIEW_ONLY_NOT_PUBLISHED')
 assert.equal(scope.mayPublish,false)
 assert.equal(scope.mayEnableLive,false)
 assert.match(sql,/-- PAZO F16-P06: PREPARED Sandbox QA offer publication/)
 for(const locale of ['es','en']){
  const item=locales[locale]
  assert.equal(typeof item.exactCopy,'string')
  const tuple="("+sqlQuote(scope.version)+","+sqlQuote(locale)+","+sqlQuote(item.exactCopy)
  assert.equal(sql.includes(tuple),true,
    'SQL exact_copy for '+locale+' diverged from approved source')
 }
})
test('Publication is gated, atomic and confined to two QA offer rows',()=>{
 assert.match(sql,/pazo\.f16_p06_qa_publish_go/)
 assert.match(sql,/PO_EXPLICIT_QA_OFFER_PUBLISH_AFTER_OWNER_GATE/)
 assert.match(sql,/IF EXISTS \(SELECT 1 FROM supporter_private\.paypal_p06_offers\)/)
 assert.match(sql,/IF EXISTS \(SELECT 1 FROM supporter_private\.paypal_p06_checkout_attempts\)/)
 assert.match(sql,/^BEGIN;$/m)
 assert.match(sql,/^COMMIT;$/m)
 assert.equal((sql.match(/\bINSERT INTO\b/g)||[]).length,1)
 assert.equal((sql.match(/\bUPDATE\b/g)||[]).length,0)
 assert.equal((sql.match(/\bDELETE\b/g)||[]).length,0)
 assert.match(sql,/INSERT INTO supporter_private\.paypal_p06_offers/)
 assert.doesNotMatch(sql,/PAZO_F16_P06_QA_OWNER_ID\s*=/)
 assert.doesNotMatch(sql,/\b(?:paypal_payment_entries|paypal_verified_activation_bindings)\b/)
})
