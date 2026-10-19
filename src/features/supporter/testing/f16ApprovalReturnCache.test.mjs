import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {saveSandboxApproval,readSandboxApproval,clearSandboxApproval}
 from '../sandboxApprovalReturn.mjs'
const OWNER='11111111-1111-4111-8111-111111111111'
const OTHER='22222222-2222-4222-8222-222222222222'
const INTENT='intent-77777777-7777-4777-8777-777777777777'
const INTENT2='intent-88888888-8888-4888-8888-888888888888'
const APPROVAL='https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-SANDBOXTESTTOKEN77'
function store(){
 const data=new Map()
 return {getItem:key=>data.get(key)||null,setItem:(key,value)=>{data.set(key,value)},
 removeItem:key=>{data.delete(key)}}
}
test('PayPal login abandon and back returns same approval URL with zero new PayPal requests',()=>{
 const storage=store(),now=1_790_000_000_000
 assert.equal(saveSandboxApproval({ownerId:OWNER,intentId:INTENT,approvalUrl:APPROVAL,storage,now}),true)
 assert.equal(readSandboxApproval({ownerId:OWNER,intentId:INTENT,storage,now:now+90000}),APPROVAL)
 assert.equal(readSandboxApproval({ownerId:OTHER,intentId:INTENT,storage,now:now+90000}),null)
 assert.equal(readSandboxApproval({ownerId:OWNER,intentId:INTENT2,storage,now:now+90000}),null)
})
test('expired, forged, off-host, modified token or malformed local cache is ignored',()=>{
 const storage=store(),now=1_790_000_000_000
 for(const candidate of [
  'http://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-77777777',
  'https://example.com/webapps/billing/subscriptions?ba_token=BA-77777777',
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=x',
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-77777777&next=https://evil.org',
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-77777777#fragment'
 ])assert.equal(saveSandboxApproval({ownerId:OWNER,intentId:INTENT,approvalUrl:candidate,storage,now}),false)
 assert.equal(saveSandboxApproval({ownerId:OWNER,intentId:INTENT,approvalUrl:APPROVAL,storage,now}),true)
 assert.equal(readSandboxApproval({ownerId:OWNER,intentId:INTENT,storage,now:now+31*60000}),null)
 assert.equal(readSandboxApproval({ownerId:OWNER,intentId:INTENT,storage,now:now+1}),null)
 assert.equal(saveSandboxApproval({ownerId:OWNER,intentId:INTENT,approvalUrl:APPROVAL,storage,now}),true)
 clearSandboxApproval({ownerId:OWNER,storage})
 assert.equal(readSandboxApproval({ownerId:OWNER,intentId:INTENT,storage,now:now+100}),null)
})
test('do not replay an old PayPal ba_token after buyer returns from the login screen',()=>{
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 const account=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 assert.ok(!checkout.includes('saveSandboxApproval('))
 assert.ok(!account.includes('readSandboxApproval('))
 assert.ok(account.includes('clearSandboxApproval({ownerId:current.data.session.user.id})'))
 assert.ok(account.includes("action:'recover_retry'"))
 assert.ok(edge.includes("runtime.cancellation.cancelPending({"))
 assert.ok(edge.includes("runtime.canAbandonPending(qaOwner)"))
 assert.ok(edge.includes("retryMerchantProof.verify({"))
 assert.ok(edge.includes("retryConsentStore.approveReconciled({"))
 assert.ok(!checkout.includes('localStorage'))
 assert.ok(!account.includes('localStorage'))
})
