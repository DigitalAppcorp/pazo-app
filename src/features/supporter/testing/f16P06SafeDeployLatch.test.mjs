import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')

test('2026-10-16 first hosted checkout deploy is statically blocked even with env QA enabled',()=>{
 assert.match(source,/\bconst QA_CHECKOUT_RELEASE_APPROVED = false\b/)
 assert.match(source,/const QA_V2_MANAGEMENT_RELEASE_APPROVED = false/)
 assert.match(source,/if\(!QA_CHECKOUT_RELEASE_APPROVED && !QA_V2_MANAGEMENT_RELEASE_APPROVED\)/)
 assert.match(source,/return reply\(503,'sandbox_qa_features_not_released'\)/)
 assert.match(source,/if\(!QA_CHECKOUT_RELEASE_APPROVED \|\|[\s\S]{0,100}PAZO_F16_P06_QA_ENABLE/)
 assert.match(source,/return addCors\(reply\(503,'paid_supporter_checkout_not_released'\)/)
 const guard=source.indexOf("if(!QA_CHECKOUT_RELEASE_APPROVED")
 const compose=source.indexOf("runtime=compose()")
 assert.ok(guard>=0&&compose>guard,'deny before runtime config, secrets or PayPal adapters')
})
