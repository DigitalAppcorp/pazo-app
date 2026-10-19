import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=name=>readFileSync(new URL('../../../../supabase/functions/f16-paypal-sandbox-sale-review/'+name,import.meta.url),'utf8')
test('read-only Sandbox sale-review source contains deployed helpers, with no Live enablement',()=>{
 const names=['index.ts','intentStoreAdapter.mjs','p06CheckoutConsentStore.mjs',
  'paypalSandboxTransactions.mjs','f16SandboxSaleWebhookComparator.mjs']
 for(const name of names)assert.ok(read(name).length>200,'missing file: '+name)
 const source=read('index.ts')
 assert.match(source,/P44 ONE-OWNER READ-ONLY merchant diagnostic/)
 assert.match(source,/payload\.action!=='review'/)
 assert.match(source,/PAZO_F16_PAYPAL_ENV/)
 assert.match(source,/PAZO_F16_P06_QA_OWNER_ID/)
 assert.doesNotMatch(source,/LIVE_CHECKOUT_RELEASED\s*=\s*true/)
})
