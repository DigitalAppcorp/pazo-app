import fs from 'node:fs/promises'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'
const fail=()=>{throw Error('RECOVERY_SUPPLEMENT_NOT_VERIFIED')}
const load=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''))
const dataName=/^data-[a-f0-9]{64}\.bin$/
const metadata=['source-catalog.private.json','source-extra.private.json','data-inventory.json','restore.sql']
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function verifyRecoverySupplement(directory){
 const root=await fs.realpath(directory)
 if((await fs.lstat(directory)).isSymbolicLink())fail()
 const manifestPath=path.join(root,'recovery-manifest.json'),manifestStat=await fs.lstat(manifestPath)
 if(!manifestStat.isFile()||manifestStat.isSymbolicLink()||await fs.realpath(manifestPath)!==manifestPath)fail()
 const m=await load(manifestPath)
 if(m.version!==1||m.project!=='mrybvqdebbgcayuvgkkr'||m.kind!=='READ_ONLY_REPEATABLE_READ_BINARY_DATA'||m.p42RowsExcluded!==true||!Array.isArray(m.files))fail()
 const seen=new Set()
 for(const entry of m.files){
  if(!entry||(!metadata.includes(entry.file)&&!dataName.test(entry.file))||seen.has(entry.file)||!Number.isSafeInteger(entry.bytes)||entry.bytes<=0||!/^[a-f0-9]{64}$/.test(entry.sha256))fail()
  seen.add(entry.file)
  const file=path.join(root,entry.file),stat=await fs.lstat(file)
  if(!stat.isFile()||stat.isSymbolicLink()||await fs.realpath(file)!==file)fail()
  const bytes=await fs.readFile(file)
  if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)fail()
 }
 if(metadata.some(name=>!seen.has(name)))fail()
 const actual=(await fs.readdir(root)).filter(name=>name!=='recovery-manifest.json').sort()
 if(JSON.stringify(actual)!==JSON.stringify([...seen].sort()))fail()
 const inv=await load(path.join(root,'data-inventory.json'))
 const catalog=await load(path.join(root,'source-catalog.private.json'))
 const extra=await load(path.join(root,'source-extra.private.json'))
 if(!Array.isArray(inv)||!Array.isArray(catalog.tables)||!Array.isArray(extra.columns))fail()
 const key=x=>`${x.schema}.${x.table}`
 const keys=inv.map(key).sort()
 const expected=catalog.tables.filter(x=>!x.evidence.includes('<last_value>')).map(x=>`${x.nspname}.${x.relname}`).sort()
 if(new Set(keys).size!==keys.length||JSON.stringify(keys)!==JSON.stringify(expected)||m.tables!==inv.length)fail()
 const excluded=inv.filter(x=>x.excluded)
 if(excluded.length!==1||key(excluded[0])!=='supporter_private.p42_activation_signing_keys'||excluded[0].file!==null)fail()
 let files=0
 for(const item of inv){
  if(item.excluded)continue
  const filename=`data-${hash(Buffer.from(key(item)))}.bin`
  if(item.file!==filename||!seen.has(filename)||!Array.isArray(item.columns))fail()
  const columns=extra.columns.filter(x=>x.nspname===item.schema&&x.relname===item.table).sort((a,b)=>a.ordinal-b.ordinal).filter(x=>!x.attgenerated).map(x=>x.attname)
  if(JSON.stringify(columns)!==JSON.stringify(item.columns))fail()
  const bytes=await fs.readFile(path.join(root,filename))
  if(bytes.length<21||bytes.subarray(0,11).toString('hex')!=='5047434f50590aff0d0a00'||bytes.readInt32BE(11)!==0)fail()
  let pos=19+bytes.readInt32BE(15)
  for(;;){
   if(pos<19||pos+2>bytes.length)fail()
   const count=bytes.readInt16BE(pos);pos+=2
   if(count===-1)break
   if(count!==columns.length)fail()
   for(let i=0;i<count;i++){
    if(pos+4>bytes.length)fail()
    const length=bytes.readInt32BE(pos);pos+=4
    if(length < -1)fail()
    if(length>=0)pos+=length
    if(pos>bytes.length)fail()
   }
  }
  if(pos!==bytes.length)fail()
  files++
 }
 if(files!==m.dataFiles||seen.size!==metadata.length+files||m.sequences!==catalog.tables.filter(x=>x.evidence.includes('<last_value>')).length)fail()
 return {recoverySupplementIntegrity:'PASS',tables:m.tables,dataFiles:files,sequences:m.sequences,p42RowsExcluded:true,restoreVerified:false}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{if(process.argv.length!==3)fail();console.log(JSON.stringify(await verifyRecoverySupplement(process.argv[2])))}
 catch{console.error('Recovery supplement integrity FAIL; private details withheld.');process.exitCode=1}
}
