import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {isSupporterAccountHash,normalizeSupporterPaypalCallback,
 supporterPaypalReturnKind,leaveSupporterAccountRoute} from '../supporterAccountRoute.mjs'
const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
const parent=readFileSync(new URL('../components/SupporterAccountManagement.tsx',import.meta.url),'utf8')
const child=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
const app=readFileSync(new URL('../../../App.tsx',import.meta.url),'utf8')

test('PayPal approval and cancellation callbacks return to supporter view, not My Pet',()=>{
 for(const [path,kind] of [['/paypal/return','return'],['/paypal/cancel','cancel']]){
  let result='',state={safe:true}
  const history={state,replaceState:(s,title,url)=>{
   assert.equal(s,state);assert.equal(title,'');result=url
  }}
  assert.equal(normalizeSupporterPaypalCallback({pathname:path,search:'?token=SECRET'},history),true)
  assert.equal(result,'/#/account/supporter?paypal='+kind)
  const hash=result.slice(1)
  assert.equal(isSupporterAccountHash(hash),true)
  assert.equal(supporterPaypalReturnKind(hash),kind)
  const nav={hash}
  assert.equal(leaveSupporterAccountRoute(nav),true)
  assert.equal(nav.hash,'')
  assert.equal(result.includes('SECRET'),false)
 }
 assert.equal(normalizeSupporterPaypalCallback({pathname:'/fake/paypal/return'},
  {state:null,replaceState:()=>{throw Error('untrusted path must not redirect')}}),false)
 assert.equal(supporterPaypalReturnKind('#/account/supporter'),null)
 assert.ok(app.includes('normalizeSupporterPaypalCallback(window.location,window.history)'))
 assert.ok(parent.includes('Regresaste de PayPal sin completar el pago'))
 assert.ok(parent.includes('la membresía solo se activará si se verifica el pago'))
 assert.ok(edge.includes("const returnUrl=QA_ORIGIN+'/paypal/return'"))
 assert.ok(edge.includes("const cancelUrl=QA_ORIGIN+'/paypal/cancel'"))
})

test('recovery always sends exact owner-bound intent into financial preflight',()=>{
 assert.ok(edge.includes('runtime.canAbandonPending(qaOwner,account.intentId)'))
 assert.ok(!edge.includes('runtime.canAbandonPending(qaOwner)'))
 const step=edge.slice(edge.indexOf("if(data.action==='recover_retry')"),
   edge.indexOf('// Recover only the original PayPal approval'))
 assert.ok(step.includes("merchant.status==='APPROVAL_PENDING'"))
 assert.ok(step.includes('runtime.cancellation.cancelPending({'))
 assert.ok(step.includes("cancelled.status!=='CANCELLED'"))
 assert.ok(step.includes('runtime.retryMerchantProof.verify({'))
 assert.ok(step.includes('runtime.retryConsentStore.approveReconciled({'))
 assert.ok(!step.includes('retryCheckout.begin('))
 assert.ok(child.includes("'pending_cancellation_preflight_blocked'"))
 assert.ok(child.includes("'retry_merchant_reconciliation_pending'"))
 assert.ok(parent.includes("qaPayAction==='reconciliation_needed'"))
 assert.ok(parent.includes('No se inició otro cobro'))
})
