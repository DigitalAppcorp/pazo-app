import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
const folder=new URL('../supabase/migrations/',import.meta.url)
const info=JSON.parse(readFileSync(new URL('../docs/PAZO_HISTORICAL_MIGRATION_PHASE2_MANIFEST_20261023.json',import.meta.url),'utf8'))
const unpaired=['20261005101300','20261005110000','20261005114500','20261005123000','20261005134000','20261005150000','20261005154500','20261005165500']
test('25 canonical hosted SQL files match SHA-256 snapshot digests',()=>{
  assert.equal(info.records.length,25)
  assert.equal(info.records.filter(r=>r.kind==='hosted_only_reconstructed').length,20)
  assert.equal(info.records.filter(r=>r.kind==='token_equivalent_replacement').length,5)
  for(const r of info.records){
    assert.match(r.path,/^20[0-9]{12}_[a-z0-9_]+[.]sql$/)
    const p=new URL(r.path,folder)
    assert.ok(existsSync(p),'missing hosted migration: '+r.path)
    if(r.version==='20261010043307'){
      // Hosted SQL included a one-time row-specific trial; executable source is the
      // pre-reviewed structural redaction. Original remote digest is kept in the
      // immutable evidence manifest and must NOT be treated as executable replay.
      const safe=new URL('../supabase/history/f14_applied/20261010043307_f14_media_jwt_claim_compat_single_test.REDACTED.sql',import.meta.url)
      assert.deepEqual(readFileSync(p),readFileSync(safe),'one-time historical DML has reappeared in executable migration')
      assert.notEqual(createHash('sha256').update(readFileSync(p)).digest('hex'),r.sha256,'one-time hosted SQL must not be replayed in active directory')
    }else{
      assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),r.sha256,'unexpected SQL edit: '+r.path)
    }
  }
})
test('original five local-only names no longer conflict with hosted versions',()=>{
  assert.equal(info.comparisons.length,5)
  for(const pair of info.comparisons){
    assert.equal(existsSync(new URL(pair.old,folder)),false,'obsolete filename: '+pair.old)
    assert.ok(existsSync(new URL(pair.target,folder)))
    assert.match(pair.originalBlob,/^[a-f0-9]{40}$/)
  }
})
test('eight prehistory SQL sources preserved in non-executable archive only (production push still BLOCKED)',()=>{
  assert.deepEqual(info.unresolved_local_versions,unpaired)
  const all=readdirSync(folder).filter(n=>/^20[0-9]{12}_.+[.]sql$/.test(n))
  const archived=new URL('../supabase/history/pre_migration_untracked/',import.meta.url)
  assert.equal(new Set(all.map(n=>n.slice(0,14))).size,all.length)
  assert.equal(all.length,122)
  for(const version of unpaired){
    assert.ok(!all.some(n=>n.startsWith(version+'_')),'old SQL remains deployable: '+version)
    assert.ok(readdirSync(archived).some(n=>n.startsWith(version+'_')),'missing preserved historical SQL: '+version)
  }
})
