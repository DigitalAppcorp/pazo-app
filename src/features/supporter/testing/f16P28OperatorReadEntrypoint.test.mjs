import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../../../../supabase/functions/f16-paypal-operator-read/index.ts',import.meta.url),'utf8')
test('P28 server entry is hard-disabled without runtime flag override',()=>{
 assert.match(source,/const enabled=false/)
 assert.match(source,/if\(!enabled\)return new Response/)
 assert.doesNotMatch(source,/enabled\s*=\s*env\(/)
 assert.doesNotMatch(source,/PAZO_F16_OPERATOR_READ_ENABLED/)
})
test('P28 operator assembly has no financial writer or checkout',()=>{
 assert.match(source,/createP28HostedLeaseReader/)
 assert.match(source,/createP05SandboxClaimScopedMerchantReaders/)
 assert.doesNotMatch(source,/insertIfAbsent|recordPayment|grantBenefits|commitClaimedSale|createSubscription/)
})
