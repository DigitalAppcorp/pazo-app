import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createPazoF18AdminOriginalAuditHandler}
 from '../../functions/pazo-admin-paypal-original-audit/handler.mjs'
const PATH='https://mrybvqdebbgcayuvgkkr.supabase.co/functions/v1/pazo-admin-paypal-original-audit'
const ORIGIN='https://pazo-app.vercel.app'
const ADMIN={id:'12345678-1234-4234-8234-123456789abc',isAdmin:true,freshSession:true}
const body={action:'read_original',confirmation:'CONSULTAR EVIDENCIA ORIGINAL'}
const request=({url=PATH,origin=ORIGIN,method='POST',payload=body,headers={}}={})=>new Request(url,{
 method,headers:{...(origin?{origin}:{}),'content-type':'application/json',...headers},
 ...(method==='POST'?{body:typeof payload==='string'?payload:JSON.stringify(payload)}:{})
})
const sample={source:'original_qa_provider_audit_v1',complete:false,
 code:'qa_provider_read_subscription_get_unavailable',originalPlanVerified:true,
 eventReadable:true,signedEventMatches:true,providerHttpStatus:404,
 providerErrorName:'RESOURCE_NOT_FOUND',providerFailure:'http',
 subscriptionId:'I-PRIVATE-ORIGINAL',intentId:'intent-PRIVATE',
 providerDebugId:'0123456789abcdef',credentials:'SECRET_DO_NOT_LEAK',
 paymentIdentity:'PII_DO_NOT_LEAK',transactionsComplete:false,
 mayCharge:true,mayCancel:true,mayGrantBenefits:true}
function harness({released=true,admin=ADMIN,audit=sample,throws=false}={}){
 const calls=[]
 const handler=createPazoF18AdminOriginalAuditHandler({released,
  authenticateAdmin:async(req)=>{calls.push('auth');return admin},
  readOriginalAudit:async()=>{calls.push('audit');if(throws)throw Error('PRIVATE_ERROR');return audit}
 })
 return {calls,handler}
}
test('release OFF and requests from arbitrary origins never access admin proof or PayPal',async()=>{
 const off=harness({released:false})
 assert.equal((await off.handler(request())).status,503)
 assert.deepEqual(off.calls,[])
 const wrong=harness()
 for(const req of [request({origin:'https://evil.example'}),request({origin:null}),
  request({url:PATH+'?id=I-FORGED'}),request({url:PATH+'/other'}),
  request({method:'GET'}),request({payload:{...body,subscriptionId:'I-FORGED'}})])
  assert.ok((await wrong.handler(req)).status>=400)
 assert.deepEqual(wrong.calls,['auth'])
})
test('fresh signed in administrator MFA is mandatory; caller cannot inject provider ID',async()=>{
 for(const admin of [null,{...ADMIN,isAdmin:false},{...ADMIN,freshSession:false},
  {...ADMIN,id:'not-uuid'}]){
  const f=harness({admin})
  const r=await f.handler(request())
  assert.equal(r.status,403);assert.deepEqual(f.calls,['auth'])
 }
 const f=harness()
 for(const payload of [{action:'read_original'}, {action:'qa_reconcile',confirmation:body.confirmation},
  {action:'read_original',confirmation:'wrong'},
  {...body,merchantGeneration:22},{...body,providerEventId:'WH-FAKE'}]){
  assert.equal((await f.handler(request({payload}))).status,400)
 }
 assert.equal(f.calls.includes('audit'),false)
})
test('404 returns only typed original signed-event evidence, never a conclusion that no payment exists',async()=>{
 const f=harness()
 const reply=await f.handler(request())
 assert.equal(reply.status,200)
 const data=await reply.json()
 assert.equal(data.code,'original_evidence_checked')
 assert.equal(data.audit.evidenceComplete,false)
 assert.equal(data.audit.providerHttpStatus,404)
 assert.equal(data.audit.providerErrorName,'RESOURCE_NOT_FOUND')
 assert.equal(data.audit.eventReadable,true)
 assert.equal(data.audit.signedEventMatches,true)
 assert.equal(data.audit.transactionsComplete,false)
 assert.equal(data.audit.completedPayments,null)
 assert.deepEqual(f.calls,['auth','audit'])
 assert.equal(data.mayCharge,false)
 assert.equal(data.mayCancel,false)
 assert.equal(data.mayGrantBenefits,false)
 const serialized=JSON.stringify(data)
 for(const value of ['I-PRIVATE-ORIGINAL','intent-PRIVATE','0123456789abcdef',
  'PII_DO_NOT_LEAK','SECRET_DO_NOT_LEAK','providerDebugId','paymentIdentity'])
  assert.ok(!serialized.includes(value),value)
})
test('invalid original contract / provider exception fails closed without releasing money or secret details',async()=>{
 const unavailable=harness({throws:true})
 const failure=await unavailable.handler(request())
 assert.equal(failure.status,503)
 assert.ok(!(await failure.text()).includes('PRIVATE_ERROR'))
 const noScope=harness({audit:{source:'original_qa_provider_audit_v1',code:'no_original_qa_contract'}})
 assert.equal((await noScope.handler(request())).status,409)
 const malformed=harness({audit:{source:'forged_scope',complete:true}})
 assert.equal((await malformed.handler(request())).status,503)
})
test('approved admin diagnostic release retains JWT authentication and typed UI action',()=>{
 const config=readFileSync('supabase/config.toml','utf8')
 assert.match(config,/\[functions\.pazo-admin-paypal-original-audit\]\s+enabled = true\s+verify_jwt = true/)
 const ui=readFileSync('src/features/admin/components/AdminPaypalOriginalAudit.tsx','utf8')
 assert.match(ui,/PAZO_F18_ORIGINAL_ADMIN_AUDIT_RELEASED=true/)
 assert.match(ui,/confirmation:'CONSULTAR EVIDENCIA ORIGINAL'/)
 assert.ok(!ui.includes("pazo-paypal-live-checkout"))
 const entry=readFileSync('supabase/functions/pazo-admin-paypal-original-audit/index.ts','utf8')
 assert.match(entry,/createPazoLivePrivilegedAdmin/)
 assert.match(entry,/createPazoLiveVaultHistoricalVerification/)
 assert.match(entry,/createOriginalQaAudit/)
 assert.ok(!entry.includes('createSubscription'))
 assert.ok(!entry.includes('cancelSubscription'))
})
