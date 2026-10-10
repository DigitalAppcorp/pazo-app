import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  A3_TERMINAL_EVIDENCE_KEYS, A3_TERMINAL_STEPS, A3_TERMINAL_SCHEMA_BLOCKERS,
  inspectA3TerminalPlan,
} from './terminalPlan.ts'

const allTrue = () => Object.fromEntries(A3_TERMINAL_EVIDENCE_KEYS.map(x => [x,true]))

test('A3 terminal planning never grants destructive permission, even with all claimed evidence',()=>{
  const p=inspectA3TerminalPlan(allTrue())
  assert.equal(p.mode,'planning_only')
  assert.equal(p.authDeleteAllowed,false)
  assert.equal(p.destructiveExecutionAllowed,false)
  assert.equal(p.schemaBlockers.length,2)
  assert.ok(p.schemaBlockers.includes('frozen_profile_cascade_rejected'))
  assert.ok(p.schemaBlockers.includes('deletion_job_auth_fk_restrict'))
  assert.equal(p.nextUnverifiedStep,null)
})

test('all absent, malformed or truthy-but-not-true evidence fails each exact requirement',()=>{
  const missing=inspectA3TerminalPlan(null)
  assert.equal(missing.nextUnverifiedStep,'verify_job_and_lease')
  const requirements=[...new Set(A3_TERMINAL_STEPS.flatMap(x=>x.requires))]
  assert.deepEqual(requirements.slice().sort(),A3_TERMINAL_EVIDENCE_KEYS.slice().sort())
  for(const key of requirements){
    const p=inspectA3TerminalPlan({...allTrue(),[key]:'true'})
    assert.ok(p.stages.some(stage=>stage.missing.includes(key)),key)
    assert.equal(p.authDeleteAllowed,false)
  }
})

test('order locks: third parties and media before DB rows, FK/retention before sessions and Auth',()=>{
  const ids=A3_TERMINAL_STEPS.map(x=>x.id)
  const index=id=>ids.indexOf(id)
  assert.equal(new Set(ids).size,ids.length)
  assert.ok(index('verify_job_and_lease')<index('freeze_writers'))
  assert.ok(index('freeze_writers')<index('preserve_other_users'))
  assert.ok(index('preserve_other_users')<index('unpublish_owned_data'))
  assert.ok(index('unpublish_owned_data')<index('reconcile_storage'))
  assert.ok(index('reconcile_storage')<index('resolve_dependent_rows'))
  assert.ok(index('resolve_dependent_rows')<index('reconcile_retention'))
  assert.ok(index('reconcile_retention')<index('revoke_sessions'))
  assert.ok(index('revoke_sessions')<index('auth_final'))
  assert.ok(index('auth_final')<index('verify_auth_absence'))
  assert.equal(ids.at(-1),'complete_audit')
})

test('media and third-party failures cannot be masked by downstream evidence',()=>{
  const p=inspectA3TerminalPlan({...allTrue(),legacy_authorship_reconciled:false,
    storage_origin_absent:'true',all_restrictive_foreign_keys_cleared:null})
  assert.equal(p.nextUnverifiedStep,'preserve_other_users')
  assert.deepEqual(p.stages.find(s=>s.step==='reconcile_storage').missing,['storage_origin_absent'])
  assert.deepEqual(p.stages.find(s=>s.step==='resolve_dependent_rows').missing,['all_restrictive_foreign_keys_cleared'])
})

test('untrusted or future keys cannot bypass structural blockers',()=>{
  const p=inspectA3TerminalPlan({...allTrue(), enableAuthDelete:true, 
    frozen_profile_cascade_rejected:false, deletion_job_auth_fk_restrict:false})
  assert.deepEqual(p.schemaBlockers,[...A3_TERMINAL_SCHEMA_BLOCKERS])
  assert.equal(p.destructiveExecutionAllowed,false)
})

test('planning module has no imports, network/SQL/Admin/Storage side effects',()=>{
  const src=readFileSync(new URL('./terminalPlan.ts',import.meta.url),'utf8')
  assert.doesNotMatch(src,/^\s*import\s|\bfetch\s*\(|\.rpc\s*\(|\.remove\s*\(|\.deleteUser\s*\(/m)
  assert.match(src,/authDeleteAllowed: false/)
  assert.match(src,/destructiveExecutionAllowed: false/)
  const worker=readFileSync(new URL('./worker.ts',import.meta.url),'utf8')
  assert.doesNotMatch(worker,/^\s*import[^\n]*terminalPlan|auth\.admin\.deleteUser\s*\(|storage\.from\s*\(/m)
})
