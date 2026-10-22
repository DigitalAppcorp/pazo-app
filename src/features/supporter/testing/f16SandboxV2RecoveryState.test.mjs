import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {classifySandboxV2Recovery} from '../sandboxV2RecoveryState.mjs'

test('abandoned approval is resumable only after verified provider GET with valid link marker',()=>{
 const noStatus=classifySandboxV2Recovery({accountState:'bound'})
 assert.equal(noStatus.phase,'merchant_status_unverified')
 assert.equal(noStatus.canResumeOriginal,false)
 const resumable=classifySandboxV2Recovery({accountState:'bound',providerStatus:'APPROVAL_PENDING',providerCode:'approval_can_resume'})
 assert.equal(resumable.phase,'approval_resumable')
 assert.equal(resumable.canResumeOriginal,true)
 const noLink=classifySandboxV2Recovery({accountState:'bound',providerStatus:'APPROVAL_PENDING',providerCode:'approval_link_unavailable'})
 assert.equal(noLink.phase,'approval_link_unavailable')
 assert.equal(noLink.canResumeOriginal,false)
})
test('PayPal 404 is review needed, not cancelled or permission to bill',()=>{
 const absent=classifySandboxV2Recovery({accountState:'bound',providerError:'paypal_subscription_not_found'})
 assert.equal(absent.phase,'merchant_missing_needs_reconciliation')
 assert.equal(absent.canResumeOriginal,false)
 assert.equal(absent.mayStartNewCheckout,false)
 assert.equal(absent.paidThrough,null)
 const slow=classifySandboxV2Recovery({accountState:'bound',providerError:'paypal_network_unavailable'})
 assert.equal(slow.phase,'merchant_read_unavailable')
 assert.equal(slow.mayStartNewCheckout,false)
})
test('approval, active, suspended, cancelled and expired never imply payment',()=>{
 for(const status of ['APPROVED','ACTIVE','SUSPENDED','CANCELLED','EXPIRED']){
  const result=classifySandboxV2Recovery({accountState:'bound',providerStatus:status})
  assert.equal(result.canResumeOriginal,false,status)
  assert.equal(result.mayGrantBenefits,false,status)
  assert.equal(result.mayRecordPayment,false,status)
  assert.equal(result.mayStartNewCheckout,false,status)
  assert.equal(result.paidThrough,null,status)
 }
 assert.equal(classifySandboxV2Recovery({accountState:'bound',providerStatus:'APPROVED'}).phase,'approval_not_payment')
 assert.equal(classifySandboxV2Recovery({accountState:'bound',providerStatus:'CANCELLED'}).phase,'terminal_needs_financial_reconciliation')
 assert.equal(classifySandboxV2Recovery({accountState:'pending'}).phase,'creation_unconfirmed')
})
test('account screen inspects provider automatically via owner-bound read only API; never autocheckouts',()=>{
 const panel=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const start=panel.indexOf('const inspectAccountProvider=')
 const end=panel.indexOf('const refresh=',start)
 assert.ok(start>0&&end>start)
 const auto=panel.slice(start,end)
 assert.ok(auto.includes("action:'resume_approval'"))
 assert.ok(!auto.includes("action:'begin'"))
 assert.ok(!auto.includes("action:'retry_begin'"))
 assert.ok(!auto.includes('window.location.assign'))
 assert.ok(panel.includes('void inspectAccountProvider(found,inspection)'))
 assert.ok(panel.includes('void inspectAccountProvider(a,inspection)'))
 assert.ok(panel.includes("recoveryStage==='approval_resumable'"))
 assert.ok(panel.includes("recoveryStage==='merchant_missing_needs_reconciliation'"))
 assert.ok(panel.includes('inspectionSeq.current'))
})
