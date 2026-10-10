import test from 'node:test'
import assert from 'node:assert/strict'
import { A3Rejected, runSupervisedA3Candidate } from './core.ts'

const media = () => ({
  bucket: 'pet-avatars',
  path: 'test-account/avatar.webp',
  objectVersion: 'generation-1',
  objectVerified: true,
  ownershipVerified: true,
  totalReferences: 1,
  referencesOwnedByRequester: 1,
  accountWritesFrozen: true,
  workerLeaseValidated: true,
})

function factory(overrides = {}) {
  const calls = []
  const yes = async () => true
  const methods = {
    authorize: yes, verifyLease: yes,
    freezeAccountWrites: yes, verifyWritesFrozen: yes,
    preserveOthers: yes, verifyOthersPreserved: yes,
    manifest: async () => [],
    removeExactObject: async () => {},
    verifyMediaRemoved: async () => ({
      originObjectMissing: true, oldPublicUrlUnavailable: true,
      storageNoLongerReferencesObject: true, cdnResponseVerified: true,
    }),
    cleanAccountData: yes, verifyDataGoneAndOtherUsersIntact: yes,
    revokeSessions: yes, verifySessionsRevoked: yes,
    verifyRetention: yes,
    deleteAuthUser: async () => {},
    verifyAuthUserAbsent: yes,
    markCompleted: async () => {},
    ...overrides,
  }
  const ports = Object.fromEntries(
    Object.entries(methods).map(([name, fn]) => [name, async (...args) => {
      calls.push(name)
      return await fn(...args)
    }]),
  )
  return {calls, ports}
}

const expectBlocked = async (ports, code) => {
  await assert.rejects(runSupervisedA3Candidate(ports, true),
    error => error instanceof A3Rejected && error.code === code)
}

test('immutable deployment gate prevents even reads when OFF', async () => {
  const { calls, ports } = factory()
  await assert.rejects(runSupervisedA3Candidate(ports, false),
    error => error.code === 'not_approved')
  assert.deepEqual(calls, [])
})

test('verified empty-account path orders Auth last and completion after proof', async () => {
  const { calls, ports } = factory()
  assert.deepEqual(await runSupervisedA3Candidate(ports, true), { completed: true })
  assert.ok(calls.indexOf('verifyWritesFrozen') < calls.indexOf('preserveOthers'))
  assert.ok(calls.indexOf('preserveOthers') < calls.indexOf('cleanAccountData'))
  assert.ok(calls.indexOf('cleanAccountData') < calls.indexOf('revokeSessions'))
  assert.ok(calls.indexOf('revokeSessions') < calls.indexOf('deleteAuthUser'))
  assert.ok(calls.indexOf('deleteAuthUser') < calls.indexOf('verifyAuthUserAbsent'))
  assert.equal(calls.at(-1), 'markCompleted')
})

test('rejects missing operator, lease, frozen writers and third-party archive', async () => {
  const cases = [
    ['authorize', 'not_authorized'],
    ['verifyLease', 'lease_invalid'],
    ['freezeAccountWrites', 'writes_not_frozen'],
    ['verifyWritesFrozen', 'writes_not_frozen'],
    ['preserveOthers', 'third_party_unverified'],
    ['verifyOthersPreserved', 'third_party_unverified'],
  ]
  for (const [method,code] of cases) {
    const {ports,calls} = factory({[method]: async () => false})
    await expectBlocked(ports,code)
    assert.ok(!calls.includes('deleteAuthUser'),method)
    assert.ok(!calls.includes('markCompleted'),method)
  }
})

test('unsafe, shared or duplicate Storage manifest blocks deletion', async () => {
  for (const objects of [
    [{...media(),totalReferences:2}],
    [media(),media()],
    [{...media(),objectVersion:null}],
    [{...media(),workerLeaseValidated:false}],
  ]) {
    const {ports,calls} = factory({manifest: async () => objects})
    await expectBlocked(ports, 'media_unverified')
    assert.ok(!calls.includes('removeExactObject'))
    assert.ok(!calls.includes('cleanAccountData'))
  }
})

test('actual media API call must be verified before database deletion', async () => {
  const {ports,calls} = factory({
    manifest: async () => [media()],
    verifyMediaRemoved: async () => ({
      originObjectMissing:true,oldPublicUrlUnavailable:false,
      storageNoLongerReferencesObject:true,cdnResponseVerified:true,
    }),
  })
  await expectBlocked(ports,'media_unverified')
  assert.ok(calls.includes('removeExactObject'))
  assert.ok(!calls.includes('cleanAccountData'))
})

test('does not reach Auth deletion after data, session or retention failure', async () => {
  for (const [method, code] of [
    ['cleanAccountData','data_unverified'],
    ['verifyDataGoneAndOtherUsersIntact','data_unverified'],
    ['revokeSessions','sessions_unverified'],
    ['verifySessionsRevoked','sessions_unverified'],
    ['verifyRetention','retention_unverified'],
  ]) {
    const {ports,calls}=factory({[method]:async()=>false})
    await expectBlocked(ports,code)
    assert.ok(!calls.includes('deleteAuthUser'),method)
    assert.ok(!calls.includes('markCompleted'),method)
  }
})

test('never marks completed if Auth deletion was not verified', async () => {
  const {ports,calls}=factory({verifyAuthUserAbsent:async()=>false})
  await expectBlocked(ports,'auth_unverified')
  assert.ok(calls.includes('deleteAuthUser'))
  assert.ok(!calls.includes('markCompleted'))
})

test('a throwing Storage call cannot skip ahead to mark completed', async () => {
  const {ports,calls}=factory({
    manifest:async()=>[media()],
    removeExactObject:async()=>{throw new Error('Storage unavailable')},
  })
  await assert.rejects(runSupervisedA3Candidate(ports,true),/Storage unavailable/)
  assert.ok(!calls.includes('cleanAccountData'))
  assert.ok(!calls.includes('deleteAuthUser'))
  assert.ok(!calls.includes('markCompleted'))
})
