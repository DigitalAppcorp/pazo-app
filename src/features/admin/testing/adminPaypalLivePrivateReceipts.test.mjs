import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const migration=readFileSync(new URL('../../../../supabase/migrations/20261019235000_pazo_f16_live_verified_binding_and_receipts_private_staging.sql',import.meta.url),'utf8')
const lab=readFileSync(new URL('../../../../scripts/f16-live-binding-receipt-disposable-lab.sql',import.meta.url),'utf8')
test('Live subscription, signed event and completed sale are separate private operations',()=>{
 for(const name of ['pazo_live_bind_verified_subscription',
  'pazo_live_queue_verified_event','pazo_live_record_verified_sale']){
  assert.match(migration,new RegExp('CREATE FUNCTION supporter_private\\.'+name+'\\('))
  assert.match(migration,new RegExp('REVOKE ALL ON FUNCTION\\s+supporter_private\\.'+name+'\\('))
 }
 assert.doesNotMatch(migration,/GRANT (?:EXECUTE|ALL)\b/)
 assert.doesNotMatch(migration,/CREATE FUNCTION public\./)
 assert.doesNotMatch(migration,/PAYPAL_(?:CLIENT_SECRET|TOKEN)|payer_email|raw_payload/i)
})
test('event owner foreign key and exact linkage protect cross-account signed receipts',()=>{
 assert.match(migration,/ADD COLUMN linked_intent_id text/)
 assert.match(migration,/FOREIGN KEY\(linked_intent_id,merchant_generation\)/)
 assert.match(migration,/linked_intent_id=p_intent/)
 assert.match(migration,/RETURN 'event_owner_conflict'/)
 assert.match(migration,/RETURN 'signed_completed_sale_event_required'/)
 assert.match(lab,/Cross-owner signed event credited a sale/)
 assert.match(lab,/Signed event transferred across owners/)
})
test('binding requires claimed consent and original generation, with single subscription',()=>{
 assert.match(migration,/i\.provider_create_claimed_at IS NULL/)
 assert.match(migration,/i\.state='bound'/)
 assert.match(migration,/RETURN 'subscription_already_bound_elsewhere'/)
 assert.match(lab,/Unclaimed subscription bound/)
 assert.match(lab,/Cross-owner subscription hijack/)
})
test('sale period is not derived from mere subscription ACTIVE or from redirect',()=>{
 assert.match(migration,/event_type='PAYMENT\.SALE\.COMPLETED'/)
 assert.match(migration,/p_amount_minor IS DISTINCT FROM 299/)
 assert.match(migration,/p_currency IS DISTINCT FROM 'USD'/)
 assert.match(migration,/FOR UPDATE/)
 assert.match(migration,/overlapping_service_period/)
 assert.match(migration,/duplicate_sale_or_cycle_conflict/)
 assert.match(migration,/already_recorded/)
 assert.doesNotMatch(migration,/net\.http|paypal\.com/)
})
