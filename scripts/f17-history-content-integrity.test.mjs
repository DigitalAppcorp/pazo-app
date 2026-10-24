import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,existsSync} from 'node:fs'
const root=new URL('../',import.meta.url)
const evidence=JSON.parse(readFileSync(new URL('docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_INTEGRITY_20261023.json',root),'utf8'))
function gitBlobSha(contents){
 const head=Buffer.concat([Buffer.from('blob '+contents.length),Buffer.from([0])])
 return createHash('sha1').update(Buffer.concat([head,contents])).digest('hex')
}
test('historical migration SQL catalog has 96 exact, 24 lexical and 2 metadata-only, all 122 versions identified',()=>{
 assert.equal(evidence.hosted_entries.length,122)
 assert.equal(evidence.local_unrecorded.length,8)
 assert.equal(new Set(evidence.hosted_entries.map(x=>x.version)).size,122)
 assert.equal(evidence.hosted_entries.filter(x=>x.classification==='byte_exact').length,96)
 assert.equal(evidence.hosted_entries.filter(x=>x.classification==='lexical_equivalent_not_byte_exact').length,24)
 assert.deepEqual(evidence.hosted_entries.filter(x=>x.classification==='metadata_only_hosted_statement').map(x=>x.version).sort(),['20261022220000','20261022222000'])
})
test('all 130 historical sources remain accounted for: 8 archived, one active one-time SQL safely redacted',()=>{
 const all=[...evidence.hosted_entries,...evidence.local_unrecorded]
 assert.equal(all.length,130)
 for(const file of all){
  const p=new URL(evidence.local_unrecorded.some(x=>x.path===file.path) ? file.path.replace('supabase/migrations/','supabase/history/pre_migration_untracked/') : file.path,root)
  assert.ok(existsSync(p),'missing SQL source: '+file.path)
  const src=readFileSync(p)
  if(file.path==='supabase/migrations/20261010043307_f14_media_jwt_claim_compat_single_test.sql'){
   // An explicitly reviewed safety substitution; original Git blob and original
   // hosted SQL checksums remain recorded by the immutable historical manifest.
   const redacted=readFileSync(new URL('supabase/history/f14_applied/20261010043307_f14_media_jwt_claim_compat_single_test.REDACTED.sql',root))
   assert.deepEqual(src,redacted,'unsafe one-time historical row mutation reintroduced')
   assert.notEqual(gitBlobSha(src),file.git_blob_sha,'redaction unexpectedly reverted')
  }else{
   assert.equal(gitBlobSha(src),file.git_blob_sha,'unreviewed historical SQL change: '+file.path)
  }
 }
 assert.ok(evidence.hosted_entries.every(x=>x.classification!=='byte_exact'||x.git_blob_sha===x.hosted_record_blob_sha))
 assert.ok(evidence.hosted_entries.filter(x=>x.classification!=='byte_exact').every(x=>x.git_blob_sha!==x.hosted_record_blob_sha))
})

test('two historical descriptors were deliberately inserted by executable Git SQL',()=>{
 const expected=[
  ['20261022220000','F17 PO GO: guarded canonical origin cutover; see versioned SQL'],
  ['20261022222000','Authenticated pet creation now marks onboarding; historical verified owners reconciled.']
 ]
 for(const [version,marker] of expected){
  const entry=evidence.hosted_entries.find(x=>x.version===version)
  assert.equal(entry.classification,'metadata_only_hosted_statement')
  const source=readFileSync(new URL(entry.path,root),'utf8')
  assert.ok(source.includes('INSERT INTO supabase_migrations.schema_migrations'),'missing marker INSERT: '+version)
  assert.ok(source.includes(marker),'hosted descriptor was not deliberately recorded: '+version)
  assert.ok(source.length>2000,'executable SQL unexpectedly replaced by descriptor: '+version)
 }
})
