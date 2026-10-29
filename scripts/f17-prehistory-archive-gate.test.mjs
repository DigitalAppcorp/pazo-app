import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,readdirSync,existsSync} from 'node:fs'
const root=new URL('../',import.meta.url)
const archive=JSON.parse(readFileSync(new URL('docs/PAZO_F17_PREHISTORY_ARCHIVE_MANIFEST_20261023.json',root),'utf8'))
const hosted=JSON.parse(readFileSync(new URL('docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_INTEGRITY_20261023.json',root),'utf8'))
const active=new URL('supabase/migrations/',root)
const prepared=JSON.parse(readFileSync(new URL('docs/review/f18/NOT_APPLIED_MIGRATIONS.json',root),'utf8'))
const additional=prepared.additionalInstalledVersions??[]
const marketing=JSON.parse(readFileSync(new URL('../docs/evidence/marketing-e2e-20261026/prepared-migrations.json',import.meta.url),'utf8'))
const pendingMarketing=[...new Set([...marketing.records,...(marketing.pendingRecords??[]),...(marketing.installedRecords??[])].map(r=>r.version))]
const intelligence=JSON.parse(readFileSync(new URL('docs/product-intelligence/PREPARED_MIGRATIONS.json',root),'utf8'))
const pendingIntelligence=intelligence.records.map(r=>r.version)
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
test('historical migration versions equal hosted snapshot; F18 individually installed; db push still forbidden',()=>{
 const names=readdirSync(active).filter(n=>/^20[0-9]{12}_[^/]+[.]sql$/.test(n))
 const actual=names.map(x=>x.slice(0,14)).sort()
 const expected=hosted.hosted_entries.map(x=>x.version).sort()
 assert.equal(prepared.productionPushAllowed,false)
 assert.equal(prepared.status,'APPLIED_HOSTED')
 assert.equal(prepared.installedVersion,'20261025073311')
 assert.equal(intelligence.productionPushAllowed,false)
 assert.equal(intelligence.status,'PREPARED_NOT_APPLIED')
 assert.deepEqual(actual.filter(v=>v!==prepared.installedVersion&&!additional.includes(v)&&!prepared.versions.includes(v)&&!pendingMarketing.includes(v)&&!pendingIntelligence.includes(v)),expected,'historical hosted version inventory changed')
 assert.deepEqual(actual,expected.concat([prepared.installedVersion],additional,prepared.versions,pendingMarketing,pendingIntelligence).sort(),'unexpected new executable SQL source')
 assert.equal(new Set(actual).size,123+additional.length+prepared.versions.length+pendingMarketing.length+pendingIntelligence.length)
 assert.ok(hosted.hosted_entries.every(r=>existsSync(new URL(r.path,root))))
})
test('archive is deliberately non-deployable and remains fenced',()=>{
 const README=readFileSync(new URL('supabase/history/pre_migration_untracked/README.md',root),'utf8')
 assert.match(README,/NO_GO_DB_PUSH/)
 assert.match(README,/DO_NOT_EXECUTE_ARCHIVED_SQL/)
 assert.match(README,/SOURCE_BASELINE_PRE_20261005_UNAVAILABLE/)
})

test('reviewed marketing source bytes match their explicitly recorded targeted API installations',()=>{
 assert.equal(marketing.status,'HOSTED_TARGETED_MAPPED')
 assert.equal(marketing.productionPushAllowed,false)
 assert.deepEqual(marketing.records.map(r=>r.version),['20261024020632','20261024034549','20261026233828','20261026234503','20261027000301'])
 for(const r of marketing.records){
  assert.match(r.path,new RegExp('^supabase/migrations/'+r.version+'_pazo_marketing_[a-z_]+[.]sql$'))
  assert.equal(createHash('sha256').update(readFileSync(new URL(r.path,root))).digest('hex'),r.sha256)
  assert.match(r.hostedVersion,/^\d{14}$/)
  assert.ok(['','\r\n'].includes(r.transportSuffix))
  assert.equal(createHash('md5').update(Buffer.concat([readFileSync(new URL(r.path,root)),Buffer.from(r.transportSuffix)])).digest('hex'),r.hostedStatementMd5)
 }
})

test('first-utility targeted installation is byte-exact and additively mapped without enabling bulk push',()=>{
 assert.ok(!marketing.pendingRecords.some(r=>r.version==='20261028075145'),'installed utility cannot remain pending')
 for(const row of marketing.pendingRecords){
  assert.equal(row.status,'PREPARED_NOT_APPLIED');assert.equal(row.productionPushAllowed,false)
  assert.equal(createHash('sha256').update(readFileSync(new URL(row.path,root),'utf8').replace(/\r\n/g,'\n')).digest('hex'),row.sha256)
 }
 assert.deepEqual(marketing.installedRecords.map(r=>r.version),['20261028075145','20261028210000'])
 for(const r of marketing.installedRecords){
  assert.equal(r.status,'HOSTED_TARGETED_APPLIED');assert.equal(r.productionPushAllowed,false)
  if(r.version==='20261028075145'){
   assert.equal(r.utilityEnabledAtInstallation,false)
   assert.match(r.authorization,/issues\/147#issuecomment-6477690521$/)
  }else{
   assert.equal(r.behaviorEnabledAtInstallation,false)
   assert.match(r.authorization,/issues\/150$/)
  }
  assert.match(r.hostedVersion,/^\d{14}$/)
  const source=readFileSync(new URL(r.path,root))
  assert.equal(createHash('sha256').update(source).digest('hex'),r.sha256)
  assert.equal(createHash('md5').update(Buffer.concat([source,Buffer.from(r.transportSuffix)])).digest('hex'),r.hostedStatementMd5)
 }
 assert.equal(marketing.historicalPreparedRecords.find(r=>r.version==='20261028075145').status,'PREPARED_NOT_APPLIED')
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
