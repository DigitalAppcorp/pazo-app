import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
const root=new URL('../',import.meta.url)
const archive=JSON.parse(readFileSync(new URL('docs/PAZO_F17_PREHISTORY_ARCHIVE_MANIFEST_20261023.json',root),'utf8'))
const hosted=JSON.parse(readFileSync(new URL('docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_INTEGRITY_20261023.json',root),'utf8'))
const active=new URL('supabase/migrations/',root)
const prepared=JSON.parse(readFileSync(new URL('docs/review/f18/NOT_APPLIED_MIGRATIONS.json',root),'utf8'))
function sha(buffer) {
 const prefix=Buffer.concat([Buffer.from('blob '+buffer.length),Buffer.from([0])])
 return createHash('sha1').update(prefix).update(buffer).digest('hex')
}
test('legacy prehistory originals preserved byte-for-byte outside executable directory',()=>{
 assert.equal(archive.records.length,8)
 assert.equal(new Set(archive.records.map(r=>r.version)).size,8)
 for(const r of archive.records){
  assert.ok(r.original_path.startsWith('supabase/migrations/'))
  assert.equal(r.archived_path,r.original_path.replace('supabase/migrations/','supabase/history/pre_migration_untracked/'))
  assert.equal(existsSync(new URL(r.original_path,root)),false,'unrecorded local-only SQL remains executable: '+r.original_path)
  assert.equal(sha(readFileSync(new URL(r.archived_path,root))),r.original_git_blob_sha,'historical SQL mutated: '+r.archived_path)
 }
})
test('historical migration versions equal hosted snapshot; new F18 source is explicitly unapplied, never proof of safe db push',()=>{
 const names=readdirSync(active).filter(n=>/^20[0-9]{12}_[^/]+[.]sql$/.test(n))
 const actual=names.map(x=>x.slice(0,14)).sort()
 const expected=hosted.hosted_entries.map(x=>x.version).sort()
 assert.equal(prepared.productionPushAllowed,false)
 assert.equal(prepared.status,'PREPARED_NOT_APPLIED')
 assert.deepEqual(actual.filter(v=>!prepared.versions.includes(v)),expected,'historical hosted version inventory changed')
 assert.deepEqual(actual,expected.concat(prepared.versions).sort(),'unexpected new executable SQL source')
 assert.equal(new Set(actual).size,122+prepared.versions.length)
 assert.ok(hosted.hosted_entries.every(r=>existsSync(new URL(r.path,root))))
})
test('archive is deliberately non-deployable and remains fenced',()=>{
 const README=readFileSync(new URL('supabase/history/pre_migration_untracked/README.md',root),'utf8')
 assert.match(README,/NO_GO_DB_PUSH/)
 assert.match(README,/DO_NOT_EXECUTE_ARCHIVED_SQL/)
 assert.match(README,/SOURCE_BASELINE_PRE_20261005_UNAVAILABLE/)
})


test('GitHub workflows never automatically push or repair hosted migration history',()=>{
 const dir=new URL('.github/workflows/',root)
 const names=readdirSync(dir).filter(n=>/\.ya?ml$/.test(n))
 assert.ok(names.length>=10,'workflow coverage unexpectedly shrank')
 for(const name of names){
  const workflow=readFileSync(new URL(name,dir),'utf8')
  // Scope: direct Supabase CLI commands in GitHub Actions. Indirect deployments,
  // local operators and external host Git integrations need separate controls.
  assert.doesNotMatch(workflow,/\bsupabase\s+db\s+(?:push|reset)\b/i,'unsafe automatic database command in '+name)
  assert.doesNotMatch(workflow,/\bsupabase\s+migration\s+(?:repair|up)\b/i,'unsafe automatic migration command in '+name)
 }
})
