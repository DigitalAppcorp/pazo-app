// All cases are OFFLINE, using fabricated metadata only.
import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectP42Revocation} from './f16P42RevocationEvidenceLab.mjs'

const fixture = () => ({
  projectId:'mrybvqdebbgcayuvgkkr',
  environment:'sandbox',
  secretName:'PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX',
  keyId:'P42_V1',
  wasProvisioned:true, // synthetic fixture, NOT evidence of a real PAZO secret
  trigger:'expiry',
  window:{notBefore:'2026-10-17T12:00:00Z',notAfter:'2026-10-18T12:00:00Z'},
  revokedAt:'2026-10-18T12:00:00Z',
  observedAt:'2026-10-18T12:02:00Z',
  edge:{unsetAcknowledged:true,present:false,verifiedAt:'2026-10-18T12:01:00Z'},
  db:{removalAcknowledged:true,keyRows:0,verifiedAt:'2026-10-18T12:01:00Z',
    writerEnabled:false,writerNotBefore:null,workerEnabled:false,
    activationBindings:0,paymentEntries:0,grantPublic:false,
    grantAnon:false,grantAuthenticated:false,grantServiceRole:false}
})
const inspect = (change) => {
  const x=fixture()
  change(x)
  return inspectP42Revocation(x)
}
test('synthetic two-store clean evidence is REVIEW CANDIDATE ONLY, never actual revocation',()=>{
  const r=inspectP42Revocation(fixture())
  assert.equal(r.status,'P42_REVOCATION_METADATA_CANDIDATE_ONLY')
  assert.equal(r.reason,'METADATA_AGREES_MANUAL_OPERATOR_REVIEW_REQUIRED')
  for(const [k,v] of Object.entries(r)) if(k.startsWith('may')||k.endsWith('ByThisCode')||
    k==='actualProviderAccess') assert.equal(v,false)
})
test('no snapshot or wrong project, secret name, key ID, environment => blocked',()=>{
  assert.equal(inspectP42Revocation().status,'P42_REVOCATION_BLOCKED')
  for (const change of [
    x=>x.projectId='wrong-project',
    x=>x.secretName='OTHER',
    x=>x.keyId='P42_V2',
    x=>x.environment='live',
  ]) assert.equal(inspect(change).reason,'TARGET_MISMATCH')
})
test('cannot assert deletion of a key never provisioned',()=>{
  assert.equal(inspect(x=>x.wasProvisioned=false).reason,'NOT_PROVISIONED')
  assert.equal(inspect(x=>delete x.wasProvisioned).reason,'NOT_PROVISIONED')
})
test('only incident and expiry trigger are accepted',()=>{
  assert.equal(inspect(x=>x.trigger='automatic_magic').reason,'TRIGGER_INVALID')
})
test('24h UTC exact validity cannot be guessed or extended',()=>{
  for(const change of [
    x=>x.window.notAfter='2026-10-18T12:00:01Z',
    x=>x.window.notAfter=null,
    x=>x.window.notBefore='2026-10-17T05:00:00-07:00',
    x=>x.window.notAfter='2026-02-30T12:00:00Z',
    x=>x.revokedAt='2026-10-18T11:59:59Z',
    x=>x.observedAt='2026-10-17T23:00:00Z',
    x=>x.observedAt='2026-10-18T11:59:59Z',
    x=>x.revokedAt='2026-10-18T12:03:00Z',
  ]) assert.equal(inspect(change).reason,'WINDOW_INVALID')
})
test('incident may revoke early but never enable money or entitlements',()=>{
  const r=inspect(x=>{
    x.trigger='incident'; x.revokedAt='2026-10-17T13:00:00Z'
    x.observedAt='2026-10-17T13:02:00Z'
    x.edge.verifiedAt=x.db.verifiedAt='2026-10-17T13:01:00Z'
  })
  assert.equal(r.status,'P42_REVOCATION_METADATA_CANDIDATE_ONLY')
  assert.equal(r.mayRecordPayment,false)
})
test('stale, missing and out-of-order independent provider readbacks fail',()=>{
  for(const change of [
    x=>x.edge.verifiedAt='2026-10-18T11:59:00Z',
    x=>x.db.verifiedAt='2026-10-18T11:59:00Z',
    x=>x.edge.verifiedAt='2026-10-18T11:56:00Z',
    x=>x.db.verifiedAt='2026-10-18T12:05:00Z',
    x=>x.edge.verifiedAt='not-a-date',
    x=>delete x.db.verifiedAt,
    x=>x.observedAt='2026-10-18T12:08:00Z'
  ]) assert.equal(inspect(change).reason,'EVIDENCE_NOT_FRESH')
})
test('Edge unset acknowledgement alone is insufficient',()=>{
  assert.equal(inspect(x=>x.edge.present=true).reason,'EDGE_NOT_REMOVED')
  assert.equal(inspect(x=>x.edge.unsetAcknowledged=false).reason,'EDGE_NOT_REMOVED')
})
test('DB removal acknowledgement alone is insufficient',()=>{
  assert.equal(inspect(x=>x.db.keyRows=1).reason,'DB_KEY_NOT_REMOVED')
  assert.equal(inspect(x=>x.db.removalAcknowledged=false).reason,'DB_KEY_NOT_REMOVED')
})
test('P42 writer, P21, P40, ledger and every API privilege must stay OFF',()=>{
  const changes=[
    x=>x.db.writerEnabled=true,
    x=>x.db.writerNotBefore='2026-10-18T10:00:00Z',
    x=>x.db.workerEnabled=true,
    x=>x.db.activationBindings=1,
    x=>x.db.paymentEntries=1,
    x=>x.db.grantPublic=true,
    x=>x.db.grantAnon=true,
    x=>x.db.grantAuthenticated=true,
    x=>x.db.grantServiceRole=true,
    x=>delete x.db.grantServiceRole,
    x=>x.db.keyRows=-1
  ]
  for(const change of changes){
    const r=inspect(change)
    assert.equal(r.status,'P42_REVOCATION_BLOCKED')
    assert.equal(r.mayGrantBenefits,false)
  }
})
test('secret bytes cannot appear in result or logs; result uses fixed categories',()=>{
  const x=fixture()
  x.secretMaterial='DO_NOT_LOG_MOCK_BYTES'
  x.edge.error='SENSITIVE-TEST-LOG'
  x.db.error='SENSITIVE-TEST-LOG'
  const r=inspectP42Revocation(x)
  assert.equal(JSON.stringify(r).includes('SENSITIVE-TEST'),false)
  assert.equal(JSON.stringify(r).includes('DO_NOT_LOG'),false)
})
