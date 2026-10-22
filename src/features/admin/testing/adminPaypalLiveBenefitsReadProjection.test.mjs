import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../../../../supabase/migrations/20261021174836_pazo_f16_live_verified_benefit_projection.sql',import.meta.url),'utf8')

test('only confirmed Live paid periods activate real membership benefits',()=>{
 assert.match(source,/supporter_private\.pazo_live_project_paid_periods/)
 assert.match(source,/v_live->>'active'='true'/)
 assert.match(source,/completedCycles/)
 assert.match(source,/pazo_supporter_my_account_status/)
 assert.match(source,/pazo_supporter_public_pet_benefits/)
 assert.match(source,/WHEN v_months>=12 THEN 12/)
 assert.match(source,/WHEN v_months>=6 THEN 6/)
 assert.match(source,/WHEN v_months>=3 THEN 3/)
 assert.doesNotMatch(source,/subscription_status\s*=\s*'ACTIVE'|APPROVAL_PENDING|provider_status\s*=\s*'ACTIVE'/)
})

test('Live pets cannot inherit Sandbox-only paid themes or activate from checkout',()=>{
 const liveBranch=source.split("IF v_live->>'active'='true' THEN")
 assert.equal(liveBranch.length,3)
 assert.match(liveBranch[2],/RETURN pg_catalog\.jsonb_build_object\('badge',true,'theme',NULL/)
 assert.match(source,/f16_sandbox_qa_pet_themes/)
 assert.doesNotMatch(source,/UPDATE public\.pets|INSERT INTO supporter_private\.pazo_paypal_live_paid_periods|pazo_paypal_new_checkout_switch/)
})

test('preserves confirmed-auth gating and QA fallback without leaking owner IDs',()=>{
 assert.match(source,/v_owner uuid:=auth\.uid\(\)/)
 assert.match(source,/email_confirmed_at IS NOT NULL/)
 assert.match(source,/is_anonymous IS DISTINCT FROM true/)
 assert.match(source,/f16_sandbox_qa_projection/)
 assert.doesNotMatch(source,/clientSecret|merchantFingerprint|paypal_access_token|RAISE NOTICE/)
})
