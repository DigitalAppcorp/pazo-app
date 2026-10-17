import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {auditP05RetentionDecisionRegister as audit,
 P05_REQUIRED_RETENTION_CATEGORIES as CODES}
 from './p05RetentionDecisionRegisterAudit.mjs'
const file=new URL('../../../../docs/PAZO_F16_P05_RETENTION_DECISION_REGISTER_20261015.json',
 import.meta.url)
const base=()=>JSON.parse(readFileSync(file,'utf8'))
const secure=r=>{
 for(const flag of [
  'policyEffective','privacyRetentionApproved','signedApprovalVerified',
  'disputeCaptureApproved','mayStoreDisputeReferences','mayDeleteRecords',
  'mayInstallHostedSql','mayDeployWorker','mayGrantBenefits','mayRecordPayment'
 ])assert.equal(r[flag],false,flag)
 assert.equal(r.paidThrough,null)
 assert.equal(r.dbWrites,0);assert.equal(r.providerRequests,0)
 const raw=JSON.stringify(r)
 for(const token of ['buyer@example.com','PRIVATE_SECRET','I-PRIVATE-SUB'])
  assert.equal(raw.includes(token),false)
 return r
}
const run=fn=>{const d=base();fn?.(d);return secure(audit(d))}
test('real machine-readable register has 8 distinct required record categories',()=>{
 const d=base()
 assert.equal(d.records.length,CODES.length)
 assert.deepEqual(d.records.map(x=>x.code).sort(),[...CODES].sort())
 const r=run()
 assert.equal(r.phase,'REVIEW_PACKET_PREPARED_NOT_APPROVED')
 assert.equal(r.missingApprovals.length,5)
})
test('flags supplied by policy author cannot enable capture, deletion or membership',()=>{
 for(const key of ['disputeCaptureApproved','financialDeletionApproved',
  'bulkDisputeImportApproved','retentionPolicyEffective',
  'serviceRoleDeploymentApproved','mayGrantBenefits']){
  const r=run(d=>{d.controls[key]=true})
  assert.equal(r.phase,'BLOCKED')
  assert.equal(r.reason,'unauthorized_release_flag_or_paid_period')
 }
 assert.equal(run(d=>{d.controls.paidThrough='2026-11-15T00:00:00Z'}).phase,
  'BLOCKED')
})
test('unknown reviewer state or fake approval is not a legal decision',()=>{
 for(const role of ['legal','taxAccounting','privacy','productOwnerClassApproval',
  'providerBackups']){
  assert.equal(run(d=>{d.review[role]='approved'}).phase,'INVALID')
  assert.equal(run(d=>{delete d.review[role]}).phase,'INVALID')
 }
})
test('CCPA and California renewal minima are conditional, never universalized',()=>{
 assert.equal(run(d=>{
  d.records.find(r=>r.code==='P01').minimum='three_years_all_records'
 }).phase,'INVALID')
 assert.equal(run(d=>{
  d.records.find(r=>r.code==='P06').minimum='twenty_four_months_all_accounts'
 }).phase,'INVALID')
})
test('cross-merchant dispute scope cannot become catch-all collection',()=>{
 const r=run(d=>{
  d.records.find(r=>r.code==='P03').scope='all_paypal_merchant_disputes'
 })
 assert.equal(r.phase,'INVALID')
 assert.equal(r.reason,'statutory_scope_or_merchant_boundary_changed')
})
test('no bulk deletion or permanent retention is silently approved',()=>{
 for(const erase of ['auto_purge','retain_forever','manual_delete_without_review']){
  const r=run(d=>{d.records.find(x=>x.code==='P02').erasure=erase})
  assert.equal(r.phase,'INVALID')
 }
 for(const duration of ['3years_all','7years_all','retain_forever']){
  const r=run(d=>{d.records.find(x=>x.code==='P03').durationDecision=duration})
  assert.equal(r.phase,'INVALID')
 }
})
test('missing, duplicate, malformed or extra categories are denied',()=>{
 for(const alter of [
  d=>d.records.pop(),
  d=>{d.records[1].code='P01'},
  d=>{d.records[1].code='P08'},
  d=>{d.records[0].payerEmail='buyer@example.com'},
  d=>{d.records[2].purpose='Bearer PRIVATE_SECRET'},
  d=>{d.payerName='PRIVATE'},
 ]){
  assert.equal(run(alter).phase,'INVALID')
 }
})
test('only Sandbox draft with no release effect is inspectable',()=>{
 for(const change of [
  d=>d.environment='live',d=>d.effect='ACTIVE',
  d=>d.schemaVersion='v2',
 ]){
  assert.equal(run(change).phase,'INVALID')
 }
})
test('under_review flags still never attest independent review',()=>{
 const r=run(d=>{for(const k of Object.keys(d.review))d.review[k]='under_review'})
 assert.equal(r.phase,'REVIEW_PACKET_PREPARED_NOT_APPROVED')
 assert.deepEqual(r.missingApprovals,[
  'legal','taxAccounting','privacy','productOwnerClassApproval',
  'providerBackups',
 ])
})
test('adversarial states never authorize money, privacy collection or erasure',()=>{
 let count=0
 for(const review of ['pending','under_review','approved'])
 for(const capture of [false,true])
 for(const deletion of [false,true])
 for(const merchantScope of ['pazo_attributed_only','all_paypal_merchant_disputes'])
 for(const auditEffect of ['DRAFT_REVIEW_ONLY','ACTIVE']){
  const result=run(d=>{
   d.review.legal=review
   d.controls.disputeCaptureApproved=capture
   d.controls.financialDeletionApproved=deletion
   d.records.find(x=>x.code==='P03').scope=merchantScope
   d.effect=auditEffect
  })
  assert.ok(['INVALID','BLOCKED','REVIEW_PACKET_PREPARED_NOT_APPROVED']
   .includes(result.phase))
  count++
 }
 assert.equal(count,48)
})
