// Package only aggregate synthetic evidence and sanitized provider metadata.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {sql} from './marketing-sql-lab.mjs'
const root='docs/evidence/issue150';fs.mkdirSync(root,{recursive:true})
fs.writeFileSync(root+'/.gitattributes','*.json text eol=lf\n*.md text eol=lf\n')
for(const source of ['browser','staging','enabled']){
 const folder='artifacts/issue150/'+source,target=root+'/'+source;fs.mkdirSync(target,{recursive:true})
 for(const name of fs.readdirSync(folder)){
  const chosen=source==='browser'?name==='results.json'||/^gallery-.*\.png$/.test(name):source==='enabled'?name==='results.json':name==='results.json'||name==='assets.json'||/^(es|en)-(390|1440)-(overview|funnel|return)\.png$/.test(name)
  if(chosen)fs.copyFileSync(folder+'/'+name,target+'/'+name)
 }
}
const source='supabase/migrations/20261028210000_pazo_behavior_observation.sql',bytes=fs.readFileSync(source,'utf8').replace(/\r\n/g,'\n')
const digest=createHash('sha256').update(bytes).digest('hex'),mapping=JSON.parse(fs.readFileSync('docs/evidence/marketing-e2e-20261026/prepared-migrations.json')).pendingRecords.find(r=>r.version==='20261028210000')
if(mapping.sha256!==digest||mapping.status!=='PREPARED_NOT_APPLIED'||mapping.collectionEnabled!==false)throw Error('prepared SQL mapping invalid')
fs.writeFileSync(root+'/migration.json',JSON.stringify({...mapping,bytes:Buffer.byteLength(bytes),hostedVersion:null,notApplied:true},null,2)+'\n')
const example=JSON.parse(sql(`SET ROLE authenticated;SET "request.jwt.claim.sub"='96000000-0000-4000-8000-000000000031';SET "request.jwt.claims"='{"aal":"aal2"}';SELECT public.pazo_admin_behavior_summary_v1(30,'paid_attributed','qr_es')`))
fs.writeFileSync(root+'/example-synthetic.json',JSON.stringify({dataKind:'SYNTHETIC_ISOLATED_PG17_NOT_PAZO_USERS',source:'scripts/behavior-pg17.mjs',report:example},null,2)+'\n')
fs.writeFileSync(root+'/verification.json',JSON.stringify({frontendSource:'2b623bb84a0956f765b4d475fb4697a68d221e3a',sqlSha256:digest,newUnitTests:18,postgresChecks:64,postgresDdlAtomicityAssertions:2,uiMatrixCases:48,uiMatrixChecks:144,hostedFrontendCases:4,enabledBrowserCases:3,enabledBrowserRequests:14,enabledBrowserGpcZeroWrites:true,hostedWrites:0,hostedCollectionCalls:0,designGate:'DESIGN_QA_PASS',poVisualAccepted:'NOT_REQUESTED',releaseAuthorized:false,sourceScopes:{matrix:'Native Admin, controlled Auth and actual isolated PG17 RPC; visual matrix/frontend source2b. Final continuation semantics verified by PostgreSQL and final hosted captures.',staging:'Immutable hosted frontend, intercepted Auth/domain services, actual final isolated PG17 RPC.',enabled:'Actual local App/hook/RPC with release flag replaced only in isolated test transport; GPC and withdrawal included.'}},null,2)+'\n')
const paths=[]
function walk(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,e.name);if(e.isDirectory())walk(f);else if(e.name!=='hashes.json')paths.push(f.replaceAll('\\','/'))}}
walk(root)
const files=paths.sort().map(file=>{const bytes=fs.readFileSync(file);return{path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}})
fs.writeFileSync(root+'/hashes.json',JSON.stringify({algorithm:'SHA256',scope:'Sanitized evidence only; original runtime PNGs and LF text. No tokens, sessions or real-user rows.',files},null,2)+'\n')
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),sqlSha256:digest}))
