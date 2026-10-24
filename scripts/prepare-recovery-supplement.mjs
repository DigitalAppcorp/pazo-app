import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
const dir=process.argv[2],mountName=path.basename(dir)
if(!/^recovery(?:-attempt[1-9]|-final)?$/.test(mountName))throw Error('Unexpected recovery root')
const read=async f=>JSON.parse((await fs.readFile(path.join(dir,f),'utf8')).replace(/^\uFEFF/,''))
const inv=await read('data-inventory.json'),catalog=await read('source-catalog.private.json'),extra=await read('source-extra.private.json')
const restoredExtra=JSON.parse((await fs.readFile(path.join(process.argv[3],'restored-extra.private.json'),'utf8')).replace(/^\uFEFF/,''))
const q=n=>{if(typeof n!=='string'||!n||n.includes('\0'))throw Error('Unexpected identifier');return '"'+n.replaceAll('"','""')+'"'}
const identity=x=>`${x.schema}.${x.table}`
const dataKeys=catalog.tables.filter(x=>!x.evidence.includes('<last_value>')).map(x=>`${x.nspname}.${x.relname}`).sort()
if(JSON.stringify(dataKeys)!==JSON.stringify(inv.map(identity).sort()))throw Error('Table inventory drift')
if(inv.filter(x=>x.excluded).length!==1||!inv.some(x=>identity(x)==='supporter_private.p42_activation_signing_keys'&&x.excluded&&x.file===null))throw Error('P42 exclusion missing')
const sql=['\\set ON_ERROR_STOP on','BEGIN;','SET LOCAL session_replication_role=replica;',`TRUNCATE TABLE ${inv.map(x=>`${q(x.schema)}.${q(x.table)}`).join(',')};`]
for(const x of inv){
 if(x.excluded)continue
 if(!/^data-[a-f0-9]{64}\.bin$/.test(x.file))throw Error('Unexpected data file')
 const columns=x.columns?` (${x.columns.map(q).join(',')})`:''
 sql.push(`\\copy ${q(x.schema)}.${q(x.table)}${columns} FROM '/evidence/${mountName}/${x.file}' WITH (FORMAT binary)`)
}
let sequences=0
for(const x of catalog.tables){
 if(!x.evidence.includes('<last_value>'))continue
 const value=x.evidence.match(/<last_value>(-?\d+)<\/last_value>/)?.[1]
 const called=x.evidence.match(/<is_called>(true|false|t|f)<\/is_called>/)?.[1]
 if(!value||!called)throw Error('Sequence evidence unavailable')
 sql.push(`SELECT pg_catalog.setval('${q(x.nspname)}.${q(x.relname)}',${value},${['true','t'].includes(called)});`)
 sequences++
}
// pg_dump can omit initial schema grants tracked by pg_init_privs. Reapply
// source grants with their actual grantor; final equality detects any extras.
for(const schema of extra.schemas){
 const restoredSchema=restoredExtra.schemas.find(x=>x.nspname===schema.nspname)
 if(!restoredSchema||restoredSchema.owner!==schema.owner)throw Error('Schema ownership drift')
 for(const acl of schema.acl){
  if(restoredSchema.acl.includes(acl))continue
  const m=acl.match(/^([^=]*)=([UC*]*)\/([^/]+)$/)
  if(!m)throw Error('Unexpected schema ACL')
  const [,grantee,privileges,grantor]=m
  for(const [code,privilege] of [['U','USAGE'],['C','CREATE']]){
   if(!privileges.includes(code))continue
   sql.push(`SET ROLE ${q(grantor)};`,`GRANT ${privilege} ON SCHEMA ${q(schema.nspname)} TO ${grantee?q(grantee):'PUBLIC'}${privileges.includes(code+'*')?' WITH GRANT OPTION':''};`,'RESET ROLE;')
  }
 }
}
sql.push('SET LOCAL session_replication_role=origin;','COMMIT;')
await fs.writeFile(path.join(dir,'restore.sql'),sql.join('\n')+'\n',{flag:'wx'})
const names=(await fs.readdir(dir)).sort(),files=[]
for(const name of names){
 const p=path.join(dir,name),st=await fs.lstat(p)
 if(!st.isFile()||st.isSymbolicLink())throw Error('Unexpected supplement entry')
 const bytes=await fs.readFile(p)
 files.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
}
const manifest={version:1,project:'mrybvqdebbgcayuvgkkr',kind:'READ_ONLY_REPEATABLE_READ_BINARY_DATA',generated_at_utc:new Date().toISOString(),tables:inv.length,dataFiles:inv.filter(x=>!x.excluded).length,sequences,p42RowsExcluded:true,files,
 limits:'Base dump supplies schema. Binary COPY snapshot supplies all table data including extension internals. Sequences are observed independently of MVCC. No atomic DB+Storage or service recovery claim.'}
await fs.writeFile(path.join(dir,'recovery-manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({recoveryPrepared:true,tables:inv.length,dataFiles:manifest.dataFiles,sequences,p42RowsExcluded:true}))
