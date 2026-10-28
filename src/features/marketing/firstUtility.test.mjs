import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {createHash} from 'node:crypto'
fs.mkdirSync(path.resolve('node_modules/.cache'),{recursive:true})
const cache=fs.mkdtempSync(path.resolve('node_modules/.cache/first-utility-'))
const calls=[]
let session={user:{id:'owner'},access_token:'pinned-synthetic'},response={data:true,error:null},sessionRead,reply
globalThis.__UTILITY_DB__={auth:{getSession:()=>sessionRead?sessionRead():Promise.resolve({data:{session}})},rpc(name,body){calls.push({name,body});return {setHeader(name,value){calls.at(-1).header=[name,value];return reply?reply():Promise.resolve(response)}}}}
let source=fs.readFileSync('src/features/marketing/firstUtility.ts','utf8').replace(/import \{ supabase \} from '[^']+'/,'const supabase=globalThis.__UTILITY_DB__')
const f=path.join(cache,'utility.mjs');fs.writeFileSync(f,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText)
const {recordFirstUtility,parseUtilitySummary,utilityMetrics}=await import(pathToFileURL(f).href)
test('utility SQL retains its immutable digest and authorized targeted installation record',()=>{
 const manifest=JSON.parse(fs.readFileSync('docs/evidence/marketing-e2e-20261026/prepared-migrations.json','utf8'))
 const row=manifest.installedRecords.find(r=>r.version==='20261028075145')
 assert.equal(row.status,'HOSTED_TARGETED_APPLIED');assert.equal(row.productionPushAllowed,false)
 assert.equal(manifest.productionPushAllowed,false)
 assert.equal(row.hostedVersion,'20261028185856')
 assert.equal(row.hostedStatementMd5,'f3b0162099ab76020db1bebee1942310')
 assert.equal(row.authorization,'https://github.com/DigitalAppcorp/pazo-app/issues/147#issuecomment-6477690521')
 assert.equal(row.utilityEnabledAtInstallation,false)
 assert.equal(manifest.pendingRecords.length,0)
 assert.equal(manifest.historicalPreparedRecords.find(r=>r.version===row.version).status,'PREPARED_NOT_APPLIED')
 assert.equal(createHash('sha256').update(fs.readFileSync(row.path,'utf8').replace(/\r\n/g,'\n')).digest('hex'),row.sha256)
})
test.beforeEach(()=>{calls.length=0;session={user:{id:'owner'},access_token:'pinned-synthetic'};response={data:true,error:null};sessionRead=null;reply=null})
test.after(()=>{delete globalThis.__UTILITY_DB__;fs.rmSync(cache,{recursive:true,force:true})})
test('QR sends only enum/pet with pinned authorization and no UTM/content',async()=>{
 await recordFirstUtility('qr_visible','pet-1','owner')
 assert.deepEqual(calls,[{name:'pazo_marketing_record_utility_v1',body:{p_pet:'pet-1',p_event:'qr_visible'},header:['Authorization','Bearer pinned-synthetic']}])
})
test('caller cannot declare persisted care or attach arbitrary payload',async()=>{
 await recordFirstUtility('care_created','pet-2','owner');await recordFirstUtility('https://example.com/private','pet-2','owner');assert.equal(calls.length,0)
})
test('another session cannot inherit a pending outcome',async()=>{
 session={user:{id:'other'},access_token:'other-token'};await recordFirstUtility('qr_visible','pet-3','owner');assert.equal(calls.length,0)
})
test('concurrent sends deduplicate without changing the tool operation',async()=>{
 let resolve;reply=()=>new Promise(r=>resolve=r)
 const first=recordFirstUtility('qr_visible','pet-4','owner');await Promise.resolve()
 await recordFirstUtility('qr_visible','pet-4','owner');assert.equal(calls.length,1)
 resolve({data:true,error:null});await first;await recordFirstUtility('qr_visible','pet-4','owner');assert.equal(calls.length,1)
})
test('network failure and paused backend remain retryable and never reject caller',async()=>{
 reply=()=>Promise.reject(Error('offline'));await recordFirstUtility('qr_visible','pet-5','owner')
 reply=null;response={data:false,error:null};await recordFirstUtility('qr_visible','pet-5','owner')
 response={data:true,error:null};await recordFirstUtility('qr_visible','pet-5','owner');assert.equal(calls.length,3)
})
test('a session read completing with another account is discarded',async()=>{
 let resolve;sessionRead=()=>new Promise(r=>resolve=r)
 const pending=recordFirstUtility('qr_share_confirmed','pet-6','owner')
 resolve({data:{session:{user:{id:'other'},access_token:'other'}}});await pending;assert.equal(calls.length,0)
})
const group=()=>Object.assign(Object.fromEntries(utilityMetrics.map(k=>[k,0])),{segment:'organic',verified_registrations:2,first_pet_accounts:1,first_utility_accounts:1,care_created_accounts:1})
const summary=()=>({status:'collecting',period_days:30,effective_days:14,coverage_since:new Date().toISOString(),as_of:new Date().toISOString(),minimum_observational_sample:10,groups:[group()]})
test('aggregate allows neutral cohort and explicit limited retention window',()=>assert.equal(parseUtilitySummary(summary()).effective_days,14))
for(const [name,change]of [
 ['PII in envelope',s=>s.email='private'],['PII in row',s=>s.groups[0].owner_id='private'],
 ['unknown campaign',s=>s.groups[0].segment='care_unapproved'],['duplicate cohort',s=>s.groups.push(group())],
 ['negative counter',s=>s.groups[0].qr_visible_accounts=-1],['impossible numerator',s=>s.groups[0].first_utility_accounts=2],
 ['immature return',s=>s.groups[0].d7_return_accounts=1],['misleading 90 day coverage',s=>s.effective_days=90],
 ['arbitrary threshold',s=>s.minimum_observational_sample=1],['invalid as-of',s=>s.as_of='unknown'],
])test('rejects '+name,()=>{const s=summary();change(s);assert.throws(()=>parseUtilitySummary(s))})
