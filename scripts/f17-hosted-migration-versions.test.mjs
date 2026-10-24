import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'

const base=new URL('../supabase/migrations/',import.meta.url)
const contracts=[
 {source:'20261023211315',hosted:'20261023224519',name:'pazo_f16_gradual_live_event_rollout',sha256:'9130baee7e02f81a8bfacc25e56e23b0c56deff2cf7c6f1db1c41c589b59bf4d'},
 {source:'20261023234845',hosted:'20261023235424',name:'pazo_f16_qa_original_read_audit',sha256:'c3af403f0b5b7f264869ebe572c15653227a9bd6fedc633f073ebd4234780740'},
 {source:'20261023235247',hosted:'20261024001615',name:'pazo_f16_real_cohort_initial_invitation_budget',sha256:'2d36b14512ab1646828d83be3b8788cb181776cb7303b693400f16aaf152b026'},
 {source:'20261024000800',hosted:'20261024003716',name:'pazo_f16_original_qa_recheck_and_hosted_gate_certificate',sha256:'37c98176d659b0de94a47b94b6bb1c5178edb3985d840c6fbd2b3c2e8e52cde8'}
]

test('the four previously applied Live L1 migrations have their exact Supabase-hosted version as filename',()=>{
 const seen=new Set()
 for(const {source,hosted,name,sha256} of contracts){
  const old=source+'_'+name+'.sql'
  const filename=hosted+'_'+name+'.sql'
  const url=new URL(filename,base)
  assert.ok(!existsSync(new URL(old,base)),old+' must not be replayed by db push')
  assert.ok(existsSync(url),filename+' missing from versioned source')
  assert.ok(!seen.has(hosted),'duplicate migration version')
  seen.add(hosted)
  const digest=createHash('sha256').update(readFileSync(url)).digest('hex')
  assert.equal(digest,sha256,filename+' changed from hosted-approved bytes')
 }
})

test('filenames are unique and preserve the dependency sequence of gradual cohort gates',()=>{
 const migrationFiles=readdirSync(base).filter(name=>/^\d{14}_.+\.sql$/.test(name))
 assert.equal(new Set(migrationFiles.map(p=>p.slice(0,14))).size,migrationFiles.length,
  'duplicate 14-digit migration versions')
 assert.deepEqual(contracts.map(c=>c.hosted),[...contracts].map(c=>c.hosted).sort())
})
