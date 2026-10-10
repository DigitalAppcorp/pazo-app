import test from 'node:test'
import assert from 'node:assert/strict'
import { isExactStoragePath, inspectMediaManifest, inspectMediaRemovalVerification } from './mediaManifest.ts'

const row = () => ({
  bucket: 'post-photos', path: 'test-user/post-123.jpg',
  objectVersion: 'v1', objectVerified: true, ownershipVerified: true,
  totalReferences: 1, referencesOwnedByRequester: 1,
  accountWritesFrozen: true, workerLeaseValidated: true,
})
test('only exact paths in existing buckets qualify for human review', () => {
  for (const bad of ['', '/../', 'a/../b', 'a/./b', '../file', 'a//b', '/absolute',
    'a\\b', 'a%2Fb', 'a?download=1', 'a#frag', 'file\nname']) {
    assert.equal(isExactStoragePath(bad), false, bad)
  }
  assert.equal(isExactStoragePath('uuid/IMG 1 (2).jpeg'), true)
  assert.equal(isExactStoragePath('uuid/cat/second.png'), true)
})
test('owned, single-reference object may be reviewed but cannot be deleted from this module', () => {
  const r=inspectMediaManifest([row()])
  assert.equal(r.safeCandidates.length,1)
  assert.equal(r.blocked.length,0)
  assert.equal(r.deletionAuthorized,false)
})
test('shared, duplicate, unknown and raced objects fail closed', () => {
  const cases=[
    {bucket:'unreviewed'}, {objectVersion:null}, {objectVerified:false},
    {ownershipVerified:false}, {totalReferences:2},
    {totalReferences:null}, {totalReferences:1,referencesOwnedByRequester:2},
    {accountWritesFrozen:false}, {workerLeaseValidated:false},
  ]
  for (const change of cases) {
    const out=inspectMediaManifest([{...row(),...change}])
    assert.equal(out.safeCandidates.length,0,JSON.stringify(change))
    assert.ok(out.blocked[0].issues.length > 0)
    assert.equal(out.deletionAuthorized,false)
  }
  const dup=inspectMediaManifest([row(),row()])
  assert.equal(dup.safeCandidates.length,0)
  assert.equal(dup.blocked.length,2)
  assert.ok(dup.blocked.every(x=>x.issues.includes('duplicate_object')))
})
test('verification requires origin, references, old URL and CDN evidence', () => {
  const flags={originObjectMissing:true,oldPublicUrlUnavailable:true,
    storageNoLongerReferencesObject:true,cdnResponseVerified:true}
  const ok=inspectMediaRemovalVerification(flags)
  assert.equal(ok.passed,true)
  assert.equal(ok.accountDeleteAuthorized,false)
  for (const key of Object.keys(flags)) {
    const result=inspectMediaRemovalVerification({...flags,[key]:false})
    assert.equal(result.passed,false)
    assert.ok(result.missing.includes(key))
  }
})
