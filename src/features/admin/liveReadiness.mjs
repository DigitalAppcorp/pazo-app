export const LIVE_READINESS_CHECKS=Object.freeze([
 'termsReady','ownerRecoverySchemaReady','benefitsSchemaReady','financeSchemaReady',
 'releaseControlsReady','credentialsStored','providerResourcesVerified','workerHealthy'
])
const BLOCKERS=Object.freeze(['terms_unavailable','account_backend_unavailable',
 'benefits_backend_unavailable','finance_backend_unavailable','controlled_release_pending',
 'live_credentials_pending','provider_verification_pending','private_worker_unavailable'])
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)
export function parsePazoLiveReadiness(raw){
 if(!object(raw)||Object.keys(raw).sort().join(',')!==
  'asOf,blockers,checkoutActive,checks,mayActivate,mayCharge,phase,source'||
  raw.source!=='pazo_live_admin_readiness_v1'||raw.mayCharge!==false||raw.mayActivate!==false||
  !['engineering_pending','credentials_pending','canary_pending','active'].includes(raw.phase)||
  typeof raw.asOf!=='string'||!Number.isFinite(Date.parse(raw.asOf))||
  typeof raw.checkoutActive!=='boolean'||(raw.phase==='active')!==raw.checkoutActive||
  !object(raw.checks)||Object.keys(raw.checks).sort().join(',')!==[...LIVE_READINESS_CHECKS].sort().join(',')||
  LIVE_READINESS_CHECKS.some(k=>typeof raw.checks[k]!=='boolean')||
  !Array.isArray(raw.blockers)||raw.blockers.length>BLOCKERS.length||
  raw.blockers.some((v,i)=>!BLOCKERS.includes(v)||raw.blockers.indexOf(v)!==i))return null
 const expected=LIVE_READINESS_CHECKS.flatMap((name,index)=>raw.checks[name]?[]:[BLOCKERS[index]])
 if(raw.blockers.join(',')!==expected.join(','))return null
 const engineering=['termsReady','ownerRecoverySchemaReady','benefitsSchemaReady',
  'financeSchemaReady','releaseControlsReady','workerHealthy'].every(k=>raw.checks[k])
 const phase=raw.checkoutActive?'active':!engineering?'engineering_pending':
  !raw.checks.credentialsStored||!raw.checks.providerResourcesVerified?'credentials_pending':'canary_pending'
 if(raw.phase!==phase)return null
 return raw
}
