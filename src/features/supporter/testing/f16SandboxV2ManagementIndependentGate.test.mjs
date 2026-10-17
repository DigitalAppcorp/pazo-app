import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter/index.ts',import.meta.url),'utf8')
test('F16 Sandbox: cancel and download stay possible after new checkout is closed',()=>{
 assert.match(edge,/const QA_CHECKOUT_RELEASE_APPROVED = false/)
 assert.match(edge,/const QA_V2_MANAGEMENT_RELEASE_APPROVED = false/)
 assert.match(edge,/!QA_CHECKOUT_RELEASE_APPROVED && !QA_V2_MANAGEMENT_RELEASE_APPROVED/)
 assert.match(edge,/isManagement && !QA_V2_MANAGEMENT_RELEASE_APPROVED/)
 assert.match(edge,/isManagement && \['status','cancel','acknowledgement'\]\.includes\(data\.action\)/)
 assert.match(edge,/await runtime\.manage\(request\)/)
 assert.match(edge,/if\(!QA_CHECKOUT_RELEASE_APPROVED \|\|\s*Deno\.env\.get\('PAZO_F16_P06_QA_ENABLE'\)!=='true'\)/)
 const managerIndex=edge.indexOf('if(isManagement &&')
 const checkoutIndex=edge.lastIndexOf('if(!QA_CHECKOUT_RELEASE_APPROVED ||')
 assert.ok(managerIndex>0 && checkoutIndex>managerIndex,
   'Owner can manage before the new-purchase release gate is checked')
 assert.match(edge,/privateIntentStore:v2AccountStore/)
 assert.match(edge,/consentStore:v2AccountStore/)
 assert.doesNotMatch(edge,/privateIntentStore:store,\s*provider:cancellation/)
})
test('F16 Sandbox: default-off management does not silently activate PayPal',()=>{
 assert.doesNotMatch(edge,/QA_V2_MANAGEMENT_RELEASE_APPROVED = true/)
 assert.doesNotMatch(edge,/QA_CHECKOUT_RELEASE_APPROVED = true/)
 assert.match(edge,/verifiedOwnerId:qaOwner/)
 assert.match(edge,/if\(!qaOwner\)/)
})
