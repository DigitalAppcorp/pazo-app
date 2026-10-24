import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
const root=new URL('../',import.meta.url)
const archive=JSON.parse(readFileSync(new URL('docs/PAZO_F17_PREHISTORY_ARCHIVE_MANIFEST_20261023.json',root),'utf8'))
const hosted=JSON.parse(readFileSync(new URL('docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_INTEGRITY_20261023.json',root),'utf8'))
const active=new URL('supabase/migrations/',root)
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
test('active migration versions exactly equal read-only hosted snapshot; never proof of safe db push',()=>{
 const names=readdirSync(active).filter(n=>/^20[0-9]{12}_[^/]+[.]sql$/.test(n))
 const actual=names.map(x=>x.slice(0,14)).sort()
 const expected=hosted.hosted_entries.map(x=>x.version).sort()
 assert.equal(actual.length,122)
 assert.deepEqual(actual,expected,'active migrations differ from historical hosted version inventory')
 assert.equal(new Set(actual).size,122)
 assert.ok(hosted.hosted_entries.every(r=>existsSync(new URL(r.path,root))))
})
test('archive is deliberately non-deployable and remains fenced',()=>{
 const README=readFileSync(new URL('supabase/history/pre_migration_untracked/README.md',root),'utf8')
 assert.match(README,/NO_GO_DB_PUSH/)
 assert.match(README,/DO_NOT_EXECUTE_ARCHIVED_SQL/)
 assert.match(README,/SOURCE_BASELINE_PRE_20261005_UNAVAILABLE/)
})
