import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const storage=readFileSync(
  new URL('../supabase/functions/f14-account-deletion/storageRemoval.ts',import.meta.url),
  'utf8',
)
const auth=readFileSync(
  new URL('../supabase/functions/f14-account-deletion/authFinal.ts',import.meta.url),
  'utf8',
)
const edge=readFileSync(
  new URL('../supabase/functions/f14-account-deletion/index.ts',import.meta.url),
  'utf8',
)

test('Supabase Storage adapter uses documented info/remove API',()=>{
  assert.match(storage,/await bucket\.info\(path\)/)
  assert.match(storage,/await bucket\.remove\(\[row\.path\]\)/)
  assert.doesNotMatch(storage,/\.exists\(/)
  assert.doesNotMatch(storage,/\.emptyBucket\(|\.removeBuckets\(/)
  assert.match(storage,/error\.status === 404/)
  assert.match(storage,/throw new A3StorageBlocked\(\)/)
})

test('Auth admin hard-delete is last and failure cannot mark completed',()=>{
  assert.match(auth,/admin\.auth\.admin\.getUserById\(subjectId\)/)
  assert.match(auth,/admin\.auth\.admin\.deleteUser\(subjectId, false\)/)
  assert.match(auth,/verifyStorageAndUrlsGone\(subjectId\)/)
  assert.match(auth,/verifyOtherUsersPreserved\(subjectId\)/)
  assert.match(auth,/verifySessionsRevoked\(subjectId\)/)
  assert.match(auth,/verifyRetentionReviewed\(subjectId\)/)
  assert.match(auth,/verifyFinalIntent\(subjectId\)/)
  assert.match(auth,/await requireAuthAbsence\(admin, subjectId\)/)
  assert.match(auth,/await checkGate\(ports\.markCompleted\(subjectId\)\)/)
  assert.match(auth,/result\.error\.status === 404/)
})

test('shipped Edge function cannot call either candidate or delete users',()=>{
  assert.match(edge,/const A3_ACCOUNT_DELETION_RELEASE_APPROVED = false as const/)
  assert.match(edge,/account_deletion_disabled/)
  assert.doesNotMatch(edge,/storageRemoval|authFinal|deleteUser\(|\.remove\(/)
})
