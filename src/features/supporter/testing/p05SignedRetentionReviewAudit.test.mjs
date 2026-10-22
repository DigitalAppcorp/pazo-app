import {test,before} from 'node:test'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
import {inspectP05SignedRetentionReview as inspect,
 P05_RETENTION_SIGNATURE_ROLES as ROLES}
 from './p05SignedRetentionReviewAudit.mjs'
const DIGEST='a'.repeat(64)
const NOW=Date.parse('2026-10-16T12:00:00Z')
const EVENTS=['CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED',
 'CUSTOMER.DISPUTE.RESOLVED']
const PRIVATE=Object.create(null)
const RING=Object.create(null)
before(async()=>{
 for(const role of ROLES){
  const kp=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify'])
  PRIVATE[role]=kp.privateKey
  RING[role]={keyId:'approved-key-'+role.toLowerCase(),
   rawPublicKey:new Uint8Array(await webcrypto.subtle.exportKey('raw',kp.publicKey))}
 }
})
const payload=()=>({
 schemaVersion:'retention-review-signatures-v1',
 environment:'sandbox',purpose:'dispute_intake_minimal',
 policyVersion:'pazo-policy-review-v1',policySha256:DIGEST,
 validFrom:'2026-10-15T00:00:00Z',validUntil:'2026-10-25T00:00:00Z',
 eventTypes:EVENTS.slice(),signatures:[],
})
const bytes=(p,role)=>new TextEncoder().encode(
 'PAZO-F16-P05-RETENTION-REVIEW-v1\n'+JSON.stringify([
  role,p.schemaVersion,p.environment,p.purpose,p.policyVersion,
  p.policySha256,p.validFrom,p.validUntil,p.eventTypes,
 ]))
async function signed(){
 const p=payload()
 for(const role of ROLES){
  const signature=new Uint8Array(await webcrypto.subtle.sign('Ed25519',
   PRIVATE[role],bytes(p,role)))
  p.signatures.push({role,keyId:RING[role].keyId,
   signature:Buffer.from(signature).toString('base64url')})
 }
 return p
}
const verify=async(p,other={})=>inspect({
 packet:p,trustedKeyring:RING,expectedPolicySha256:DIGEST,
 nowMs:NOW,cryptoApi:webcrypto,...other,
})
function safe(r){
 for(const key of [
  'independentLegalApprovalConfirmed','currentNonrevocationConfirmed',
  'policyOperationallyApproved','mayReleaseCapture','mayCollectDispute',
  'mayDeleteFinancialRecords','mayRecordPayment','mayGrantBenefits',
 ])assert.equal(r[key],false,key)
 assert.equal(r.paidThrough,null)
 assert.equal(r.dbWrites,0);assert.equal(r.providerCalls,0)
 assert.equal(JSON.stringify(r).includes('PRIVATE_SECRET'),false)
 return r
}
test('five genuine ephemeral Ed25519 signatures prove signatures ONLY, no operational GO',async()=>{
 const r=safe(await verify(await signed()))
 assert.equal(r.phase,'SIGNATURES_VERIFIED_REVIEW_ONLY')
 assert.equal(r.cryptographicSignaturesVerified,true)
 assert.equal(r.reason,'independent_legal_provenance_revocation_and_runtime_go_not_attested')
})
test('no real keys, absent policy digest, or no cryptographic API denies',async()=>{
 const p=await signed()
 for(const x of [
  {trustedKeyring:null},
  {expectedPolicySha256:null},
  {expectedPolicySha256:'b'.repeat(64)},
  {cryptoApi:{}},
 ]){
  const r=safe(await verify(p,x))
  assert.equal(r.cryptographicSignaturesVerified,false)
 }
})
test('tamper any signed condition and verification is rejected',async()=>{
 const mutations=[
  p=>p.policyVersion='pazo-policy-other-v2',
  p=>p.purpose='refund_approval',
  p=>p.environment='live',
  p=>p.eventTypes.push('PAYMENT.SALE.COMPLETED'),
  p=>p.eventTypes.reverse(),
  p=>p.validFrom='2026-10-14T00:00:00Z',
  p=>p.validUntil='2026-10-26T00:00:00Z',
  p=>p.policySha256='b'.repeat(64),
  p=>p.schemaVersion='retention-signatures-v2',
  p=>p.sellerId='BUYER_PRIVATE_SECRET',
 ]
 for(const mutate of mutations){
  const p=await signed();mutate(p)
  const r=safe(await verify(p))
  assert.notEqual(r.phase,'SIGNATURES_VERIFIED_REVIEW_ONLY')
 }
})
test('prevent substituted signer role, duplicate, and missing accounting/privacy approval',async()=>{
 for(const mutate of [
  p=>p.signatures.pop(),
  p=>{p.signatures[1].role='legal'},
  p=>{p.signatures[0].role='productOwnerClassApproval'},
  p=>{p.signatures[2].keyId='attacker-key'},
  p=>{p.signatures[4].signature='invalid'},
  p=>{p.signatures[0].signature=p.signatures[1].signature},
  p=>{p.signatures[0].payer='PRIVATE_SECRET'},
 ]){
  const p=await signed();mutate(p)
  const r=safe(await verify(p))
  assert.equal(r.cryptographicSignaturesVerified,false)
 }
})
test('valid signed packet expires and cannot be replayed in distant future',async()=>{
 const p=await signed()
 for(const t of [
  Date.parse('2026-10-14T23:59:59Z'),
  Date.parse('2026-10-25T00:00:00Z'),
  Date.parse('2027-10-15T00:00:00Z'),
 ]){
  const r=safe(await verify(p,{nowMs:t}))
  assert.equal(r.phase,'EXPIRED_OR_UNTRUSTED')
 }
})
test('invalid clock, malformed or lengthy validity periods fail closed',async()=>{
 for(const t of [undefined,null,NaN,'2026-10-16T12:00:00Z',Infinity,-1]){
  const r=safe(await verify(await signed(),{nowMs:t}))
  assert.equal(r.cryptographicSignaturesVerified,false)
 }
 for(const mutate of [
  p=>p.validFrom='2026-02-30T00:00:00Z',
  p=>p.validFrom='2026-10-15T00:00:00-07:00',
  p=>p.validUntil='2026-12-25T00:00:00Z',
  p=>p.validUntil='2026-10-15T00:00:00Z',
 ]){
  const p=await signed();mutate(p)
  assert.equal(safe(await verify(p)).cryptographicSignaturesVerified,false)
 }
})
test('untrusted public key replaced or unsigned signer never matches trusted keyring',async()=>{
 const p=await signed()
 const wrong={}
 for(const role of ROLES)wrong[role]={...RING[role]}
 wrong.privacy={...RING.privacy,
  rawPublicKey:new Uint8Array(RING.legal.rawPublicKey)}
 assert.equal(safe(await verify(p,{trustedKeyring:wrong}))
  .cryptographicSignaturesVerified,false)
 const noPrivacy={...RING}
 delete noPrivacy.privacy
 assert.equal(safe(await verify(p,{trustedKeyring:noPrivacy}))
  .cryptographicSignaturesVerified,false)
})
test('crypto verification errors are redacted, not treated as approval',async()=>{
 const p=await signed()
 const broken={subtle:{
  importKey:async()=>{throw Error('PRIVATE_SECRET from provider')},
  verify:async()=>true,
 }}
 const r=safe(await verify(p,{cryptoApi:broken}))
 assert.equal(r.reason,'signature_verification_unavailable')
})
