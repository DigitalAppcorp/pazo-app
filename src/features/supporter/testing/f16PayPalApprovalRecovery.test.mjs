import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPaypalSandboxSubscriptionReader} from '../../../../supabase/functions/f16-paypal-webhook/paypalSandboxTransactions.mjs'

const id='I-PAYPAL-TEST-123'
const plan='P-14V25407JP6850922NLHMDKI'
const intent='intent-00000000-0000-4000-8000-000000000001'
const link='https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001'
const fake=({status='APPROVAL_PENDING',links=[{rel:'approve',method:'GET',href:link}],planId=plan,custom= intent}={})=>{
 const requests=[]
 const client=createPaypalSandboxSubscriptionReader({clientId:'sandbox-client-123',clientSecret:'sandbox-secret-456',
  fetchImpl:async(url,opts)=>{
   requests.push({url,method:opts.method})
   const body=url.endsWith('/v1/oauth2/token')
     ? {token_type:'Bearer',access_token:'test-token'}
     : {id,plan_id:planId,custom_id:custom,status,links,
        subscriber:{email_address:'NOT-FOR-CLIENT@example.invalid'}}
   return {ok:true,json:async()=>body}
  }})
 return {client,requests}
}
test('F16 abandoned PayPal approval recovers same merchant link via GET only',async()=>{
 const {client,requests}=fake()
 const result=await client.readSubscription(id,{includeApprovalLink:true})
 assert.equal(result.approvalUrl,link)
 assert.equal(result.status,'APPROVAL_PENDING')
 assert.equal(result.plan_id,plan)
 assert.equal(result.custom_id,intent)
 assert.deepEqual(requests.map(x=>x.method),['POST','GET'],
  'Only OAuth token and merchant detail GET; NEVER POST a subscription')
 assert.ok(requests[1].url.endsWith('/v1/billing/subscriptions/'+id))
 assert.ok(!JSON.stringify(result).includes('email_address'))
 const normal=await client.readSubscription(id)
 assert.equal(Object.hasOwn(normal,'approvalUrl'),false,
  'Standard verification reads never leak buyer approval links')
})
test('F16 never offers a PayPal approval link once buyer approved, cancelled or expired',async()=>{
 for(const status of ['ACTIVE','APPROVED','CANCELLED','EXPIRED','SUSPENDED']){
  const {client}=fake({status})
  const x=await client.readSubscription(id,{includeApprovalLink:true})
  assert.equal(x.approvalUrl,null,status)
 }
})
test('F16 no link from merchant means no fabricated URL and no new subscription',async()=>{
 for(const links of [[],[{rel:'self',method:'GET',href:'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/'+id}]]){
  const {client}=fake({links})
  assert.equal((await client.readSubscription(id,{includeApprovalLink:true})).approvalUrl,null)
 }
})
test('F16 rejects hostile, forged, duplicate or invalid PayPal approval links',async()=>{
 const bad=[
  'http://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001',
  'https://www.paypal.com/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001',
  'https://www.sandbox.paypal.com.evil.test/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001',
  'https://www.sandbox.paypal.com.evil.test/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001',
  'https://user@www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001',
  'https://www.sandbox.paypal.com:444/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001',
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?subscription_id='+id,
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001&next=evil',
  'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-ONLYEXISTING001#pay',
 ]
 for(const href of bad){
  const {client}=fake({links:[{rel:'approve',method:'GET',href}]})
  const response=await client.readSubscription(id,{includeApprovalLink:true})
  assert.equal(response.approvalUrl,null,'Untrusted URL is never returned')
  assert.equal(response.approvalLinkState,'rejected')
  assert.equal(response.status,'APPROVAL_PENDING','Status remains independently readable')
 }
 for(const links of [
   [{rel:'approve',method:'POST',href:link}],
   [{rel:'approve',method:'GET',href:link},{rel:'approve',method:'GET',href:link}],
   'unexpected'
 ]){
  const {client}=fake({links})
  const response=await client.readSubscription(id,{includeApprovalLink:true})
  assert.equal(response.approvalUrl,null)
  assert.equal(response.approvalLinkState,'rejected')
 }
})
test('F16 V2 recovery server requires authenticated owner + linked original + plan match, never grants payment',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const panel=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 const checkout=readFileSync(new URL('../components/SandboxCheckoutQaPanel.tsx',import.meta.url),'utf8')
 for(const clause of [
  "data.action==='resume_approval'",
  "'sandbox_admission_unavailable'",
  "'private_account_read_unavailable'",
  "'paypal_subscription_read_unavailable'",
  "'approval_link_rejected'",
  "runtime.v2AccountStore.readForOwner({ownerId:qaOwner})",
  "account.state!=='bound'||!account.externalSubscriptionId",
  'includeApprovalLink:true',
  'merchant.plan_id!==PLAN||merchant.custom_id!==account.intentId',
  "merchant.status==='APPROVAL_PENDING'",
  'entitlement:false,mayRecordPayment:false,mayGrantBenefits:false',
  "QA_CHECKOUT_RELEASE_APPROVED",
  "runtime.canBuy(qaOwner)"
 ])assert.ok(edge.includes(clause),clause)
 assert.ok(!edge.includes('subscriptionCreator.create({intent:a}'))
 assert.ok(panel.includes("providerStatus===null||providerStatus==='APPROVAL_PENDING'"),'Pending buyer can resume directly without an unreliable preliminary status call')
 assert.ok(panel.includes("t('Retomar en PayPal'"))
 assert.ok(panel.includes("call({action:'resume_approval'})"))
 assert.ok(!panel.includes("call({action:'status'"),'Read-only merchant verification uses the v4 owner-bound path')
 assert.ok(panel.includes("!['APPROVED','ACTIVE'].includes(providerStatus||'')"),'Do not offer paid-cycle verification before approval')
 assert.ok(panel.includes("call({action:'resume_approval'})"))
 assert.ok(panel.includes('safeSandboxApprovalUrl(result.approvalUrl)'))
 assert.ok(panel.includes('window.location.assign(url)'))
 assert.ok(panel.includes("recoveryMessage==='unavailable'"))
 assert.ok(checkout.includes('attempted.current=true'))
 assert.ok(!checkout.includes('attempted.current=false'))
})

test('F16 Sandbox account recovery remains reachable after merchant status failure',()=>{
 const panel=readFileSync(new URL('../components/SandboxV2AccountPanel.tsx',import.meta.url),'utf8')
 assert.ok(panel.includes("account.state==='bound'&&!paidThrough&&!cancelled"))
 assert.ok(panel.includes("providerStatus===null||providerStatus==='APPROVAL_PENDING'"))
 assert.ok(panel.includes("call({action:'resume_approval'})"))
 assert.ok(panel.includes("setErrorKind('status')"))
 assert.ok(panel.includes("setErrorKind('payment')"))
 assert.ok(panel.includes("setRecoveryMessage('unavailable')"))
 assert.ok(panel.includes("providerStatus==='CANCELLED'")||panel.includes("result.phase==='CANCELLED'"))
 assert.ok(!panel.includes('attempted.current=false'))
})

test('F16 diagnostic codes are static and cannot leak owner, PayPal PII or raw provider messages',()=>{
 const edge=readFileSync(new URL('../../../../supabase/functions/f16-paypal-supporter-v2-qa/index.ts',import.meta.url),'utf8')
 const begin=edge.indexOf("if(data.action==='resume_approval'){")
 const end=edge.indexOf("if(data.action==='verify_payment'){",begin)
 assert.ok(begin>0&&end>begin)
 const stage=edge.slice(begin,end)
 assert.ok(stage.includes("runtime.v2AccountStore.readForOwner({ownerId:qaOwner})"))
 assert.ok(stage.includes("runtime.reader.readSubscription("))
 assert.ok(!stage.includes('subscriptionCreator.create'))
 assert.ok(!stage.includes('console.log'))
 assert.ok(!stage.includes('err.message'))
 assert.ok(!stage.includes('e.message'))
 assert.ok(!stage.includes('merchant.subscriber'))
 assert.ok(stage.includes('mayRecordPayment:false,mayGrantBenefits:false'))
})
