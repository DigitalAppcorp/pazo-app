// PAZO F16-P05 — offline audit of proposed retention categories.
// NEVER authorizes intake, deletion, ledger entries, checkout or benefits.
// Source is a human-review register; NO authenticated legal approval system.
export const P05_REQUIRED_RETENTION_CATEGORIES=Object.freeze([
 'P01','P02','P03','P04','P05','P06','P07','P09',
])
const REVIEW=['legal','taxAccounting','privacy','productOwnerClassApproval','providerBackups']
const CONTROLS=['disputeCaptureApproved','financialDeletionApproved',
 'bulkDisputeImportApproved','retentionPolicyEffective',
 'serviceRoleDeploymentApproved','mayGrantBenefits']
const PURPOSE=/^[a-z][a-z0-9_]{2,80}$/
const META=/^[a-z][a-z0-9_]{2,100}$/
const SAFE=Object.freeze({
 environment:'sandbox',step:'f16_p05_retention_policy_offline_audit',
 policyEffective:false,privacyRetentionApproved:false,
 signedApprovalVerified:false,disputeCaptureApproved:false,
 mayStoreDisputeReferences:false,mayDeleteRecords:false,
 mayInstallHostedSql:false,mayDeployWorker:false,
 mayGrantBenefits:false,mayRecordPayment:false,paidThrough:null,
 dbWrites:0,providerRequests:0,
})
function response(phase,reason,missing=[]){
 return Object.freeze({...SAFE,phase,reason,
  missingApprovals:Object.freeze([...missing])})
}
const plain=o=>o!==null&&typeof o==='object'&&
 !Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype
const sameKeys=(o,keys)=>plain(o)&&
 Object.keys(o).sort().join('|')===keys.slice().sort().join('|')
export function auditP05RetentionDecisionRegister(register){
 if(!sameKeys(register,['schemaVersion','environment','effect','review','records','controls']))
  return response('INVALID','unexpected_register_fields')
 if(register.schemaVersion!=='f16-p05-retention-decision-register-v1'||
  register.environment!=='sandbox'||register.effect!=='DRAFT_REVIEW_ONLY')
  return response('INVALID','untrusted_register_scope')
 if(!sameKeys(register.review,REVIEW)||
  REVIEW.some(k=>register.review[k]!=='pending'&&
   register.review[k]!=='under_review'))
  return response('INVALID','review_attestations_are_not_provider_verified')
 if(!sameKeys(register.controls,[...CONTROLS,'paidThrough'])||
  CONTROLS.some(k=>register.controls[k]!==false)||
  register.controls.paidThrough!==null)
  return response('BLOCKED','unauthorized_release_flag_or_paid_period')
 if(!Array.isArray(register.records)||
  register.records.length!==P05_REQUIRED_RETENTION_CATEGORIES.length)
  return response('INVALID','retention_category_count_mismatch')
 const shape=['code','category','purpose','scope','minimum','durationDecision','hold','erasure']
 const seen=new Set()
 for(const record of register.records){
  if(!sameKeys(record,shape)||
   !P05_REQUIRED_RETENTION_CATEGORIES.includes(record.code)||
   seen.has(record.code))return response('INVALID','retention_category_missing_or_duplicate')
  seen.add(record.code)
  if(!PURPOSE.test(record.category)||!META.test(record.scope)||
   !META.test(record.minimum)||!META.test(record.hold)||
   record.erasure!=='manual_class_review_only'||
   !['pending','conditional_minimum_identified'].includes(record.durationDecision)||
   typeof record.purpose!=='string'||
   record.purpose.length<20||record.purpose.length>180||
   /[@<>]|https?:|\b(token|password|bearer|jwt|email)\b/i.test(record.purpose))
   return response('INVALID','retention_category_unreviewed_or_sensitive')
 }
 const byCode=new Map(register.records.map(x=>[x.code,x]))
 if(byCode.get('P01')?.minimum!=='ca_bpc_17602_a6_if_applicable'||
  byCode.get('P06')?.minimum!=='ccpa_11_ccr_7101_if_applicable'||
  byCode.get('P03')?.scope!=='pazo_attributed_only')
  return response('INVALID','statutory_scope_or_merchant_boundary_changed')
 return response('REVIEW_PACKET_PREPARED_NOT_APPROVED',
  'legal_tax_privacy_po_and_provider_decisions_remain_unverified',REVIEW)
}
