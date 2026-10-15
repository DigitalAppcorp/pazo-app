// PAZO F16-P05 — OFFLINE signature verification for a future retention
// review packet. Cryptographic proof of signatures is NOT legal approval.
// No trusted keyring or approved policy is provisioned; not wired to Edge.
// NEVER use this return value as verifyDisputeRetentionRelease().
const ROLES=Object.freeze(['legal','taxAccounting','privacy',
 'productOwnerClassApproval','providerBackups'])
const EVENTS=Object.freeze(['CUSTOMER.DISPUTE.CREATED',
 'CUSTOMER.DISPUTE.UPDATED','CUSTOMER.DISPUTE.RESOLVED'])
const FIELDS=['schemaVersion','environment','purpose','policyVersion',
 'policySha256','validFrom','validUntil','eventTypes','signatures']
const SIGNER=['role','keyId','signature']
const HEX64=/^[a-f0-9]{64}$/
const ID=/^[a-z][a-z0-9._-]{4,63}$/
const B64=/^[A-Za-z0-9_-]{16,180}$/
const same=(x,k)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===k.slice().sort().join('|')
const result=(phase,reason)=>Object.freeze({
 environment:'sandbox',step:'f16_p05_retention_signatures_offline',
 phase,reason,cryptographicSignaturesVerified:phase==='SIGNATURES_VERIFIED_REVIEW_ONLY',
 independentLegalApprovalConfirmed:false,
 currentNonrevocationConfirmed:false,policyOperationallyApproved:false,
 mayReleaseCapture:false,mayCollectDispute:false,mayDeleteFinancialRecords:false,
 mayRecordPayment:false,mayGrantBenefits:false,paidThrough:null,
 dbWrites:0,providerCalls:0,
})
const parseTime=x=>typeof x==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x.replace('Z','.000Z')
function decodeSignature(x){
 if(typeof x!=='string'||!B64.test(x))return null
 try {
  const binary=atob(x.replace(/-/g,'+').replace(/_/g,'/'))
  if(binary.length!==64)return null
  return Uint8Array.from(binary,c=>c.charCodeAt(0))
 }catch{return null}
}
const message=(p,role)=>new TextEncoder().encode(
 'PAZO-F16-P05-RETENTION-REVIEW-v1\n'+JSON.stringify([
  role,p.schemaVersion,p.environment,p.purpose,p.policyVersion,
  p.policySha256,p.validFrom,p.validUntil,p.eventTypes,
 ]))
export const P05_RETENTION_SIGNATURE_ROLES=ROLES
export async function inspectP05SignedRetentionReview({
 packet,trustedKeyring,expectedPolicySha256,nowMs,cryptoApi=globalThis.crypto,
}={}){
 // A human-supplied packet cannot supply its own trust anchors, reference
 // digest or clock in a production system. THIS API IS OFFLINE AUDIT ONLY.
 if(!same(packet,FIELDS)||packet.schemaVersion!=='retention-review-signatures-v1'||
  packet.environment!=='sandbox'||packet.purpose!=='dispute_intake_minimal'||
  !ID.test(packet.policyVersion||'')||
  !HEX64.test(packet.policySha256||'')||
  !HEX64.test(expectedPolicySha256||'')||
  packet.policySha256!==expectedPolicySha256||
  !Array.isArray(packet.eventTypes)||
  packet.eventTypes.join('|')!==EVENTS.join('|'))
  return result('INVALID','untrusted_policy_scope_or_digest')
 const from=parseTime(packet.validFrom),to=parseTime(packet.validUntil)
 if(from===null||to===null||!Number.isSafeInteger(nowMs)||
  nowMs<from||nowMs>=to||to<=from||to-from>30*86400000)
  return result('EXPIRED_OR_UNTRUSTED','validity_window_not_verified')
 if(!Array.isArray(packet.signatures)||packet.signatures.length!==ROLES.length||
  !trustedKeyring||typeof trustedKeyring!=='object'||
  typeof cryptoApi?.subtle?.importKey!=='function'||
  typeof cryptoApi?.subtle?.verify!=='function')
  return result('INVALID','review_signers_or_crypto_missing')
 const seen=new Set()
 for(const signer of packet.signatures){
  if(!same(signer,SIGNER)||!ROLES.includes(signer.role)||
   seen.has(signer.role))return result('INVALID','review_signer_duplicate_or_missing')
  seen.add(signer.role)
  const trust=Object.getOwnPropertyDescriptor(trustedKeyring,signer.role)?.value
  if(!same(trust,['keyId','rawPublicKey'])||
    !ID.test(signer.keyId||'')||trust.keyId!==signer.keyId||
    !(trust.rawPublicKey instanceof Uint8Array)||
    trust.rawPublicKey.byteLength!==32)
   return result('INVALID','untrusted_signing_key')
  const sig=decodeSignature(signer.signature)
  if(!sig)return result('INVALID','invalid_signature_encoding')
  let verified=false
  try {
   const key=await cryptoApi.subtle.importKey('raw',trust.rawPublicKey,
    {name:'Ed25519'},false,['verify'])
   verified=await cryptoApi.subtle.verify({name:'Ed25519'},key,sig,
    message(packet,signer.role))
  }catch{return result('INVALID','signature_verification_unavailable')}
  if(verified!==true)return result('INVALID','signature_does_not_match_policy')
 }
 if(seen.size!==ROLES.length)return result('INVALID','required_signer_missing')
 // Even five cryptographically valid signatures prove only possession of
 // registered private keys, NOT professional capacity, approval of the law,
 // absence of revocation, or runtime permission. No active policy exists.
 return result('SIGNATURES_VERIFIED_REVIEW_ONLY',
  'independent_legal_provenance_revocation_and_runtime_go_not_attested')
}
