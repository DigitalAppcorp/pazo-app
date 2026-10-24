// Offline-only recovery package check. Never connects, restores, or uploads.
import fs from 'node:fs/promises'
import {createReadStream} from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {verifyStorageExport} from './storage-backup-core.mjs'
const REQUIRED=['database.dump','roles.sql','storage-inventory.json','archive-toc.private.txt','extension-owners.json']
const PROJECT='mrybvqdebbgcayuvgkkr'
const fail=()=>{throw Error('BACKUP_INTEGRITY_BLOCKED')}
// Windows PowerShell 5.1 Set-Content -Encoding utf8 emits a leading BOM.
// Strip it only for JSON parsing; hashes still cover the original file bytes.
const load=async file=>{try{return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''))}catch{fail()}}
async function safeFile(root,name){
 if(![...REQUIRED,'database-manifest.json'].includes(name))fail()
 const filename=path.join(root,name),st=await fs.lstat(filename)
 if(!st.isFile()||st.isSymbolicLink()||st.size<=0)fail()
 if(await fs.realpath(filename)!==filename)fail()
 return {filename,bytes:st.size}
}
async function digest(filename){
 const h=createHash('sha256')
 for await(const chunk of createReadStream(filename))h.update(chunk)
 return h.digest('hex')
}
const canon=items=>items.map(v=>JSON.stringify(v)).sort()
const size=value=>{
 if(typeof value!=='number'&&!(typeof value==='string'&&/^[0-9]+$/.test(value)))fail()
 const n=Number(value)
 if(!Number.isSafeInteger(n)||n<0)fail()
 return n
}
async function checkedRoot(dir){
 if(typeof dir!=='string'||!dir.trim())fail()
 const root=path.resolve(dir)
 let pos=root
 for(;;){
  if((await fs.lstat(pos)).isSymbolicLink())fail()
  const parent=path.dirname(pos);if(parent===pos)break;pos=parent
 }
 if(!(await fs.lstat(root)).isDirectory())fail()
 const repo=path.resolve(fileURLToPath(new URL('../',import.meta.url)))
 const rel=path.relative(repo,root)
 if(rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)))fail()
 return root
}
export async function verifyPazoRecoveryPackage(directory){
 const root=await checkedRoot(directory)
 const m=await load((await safeFile(root,'database-manifest.json')).filename)
 if(m.database_export!=='EXPORTED_NOT_RESTORED'||!Array.isArray(m.files)||m.files.length!==5)fail()
 const recorded=Date.parse(m.at_utc)
 if(!Number.isFinite(recorded)||recorded>Date.now()+300000)fail()
 const missing=new Set(REQUIRED)
 for(const e of m.files){
  if(!e||!missing.delete(e.file)||!Number.isSafeInteger(e.bytes)||e.bytes<=0||
    typeof e.sha256!=='string'||!/^[a-f0-9]{64}$/.test(e.sha256))fail()
  const local=await safeFile(root,e.file)
  if(local.bytes!==e.bytes||(await digest(local.filename))!==e.sha256)fail()
 }
 if(missing.size)fail()
 const fp=await fs.open(path.join(root,'database.dump'),'r')
 try{
  const header=Buffer.alloc(5),read=await fp.read(header,0,5,0)
  if(read.bytesRead!==5||header.toString('ascii')!=='PGDMP')fail()
 }finally{await fp.close()}
 const inv=await load(path.join(root,'storage-inventory.json'))
 const ext=await load(path.join(root,'extension-owners.json'))
 if(inv.project!==PROJECT||!Array.isArray(inv.buckets)||!Array.isArray(inv.objects)||!Array.isArray(ext))fail()
 if(ext.some(x=>!x||typeof x.name!=='string'||typeof x.owner!=='string'||typeof x.schema!=='string'))fail()
 const storageDir=path.join(root,'storage')
 if((await fs.lstat(storageDir)).isSymbolicLink()||!(await fs.lstat(storageDir)).isDirectory())fail()
 const storageManifest=await load(path.join(storageDir,'storage-manifest.json'))
 const verified=await verifyStorageExport(storageDir)
 if(!Array.isArray(storageManifest.objects)||!Array.isArray(storageManifest.buckets))fail()
 const leftB=canon(inv.buckets.map(x=>({id:x.id,public:x.public})))
 const rightB=canon(storageManifest.buckets.map(x=>({id:x.id,public:x.public})))
 if(JSON.stringify(leftB)!==JSON.stringify(rightB))fail()
 const shape=x=>({bucket:x.bucket,path:x.path,id:x.id,size:size(x.size)})
 if(JSON.stringify(canon(inv.objects.map(shape)))!==JSON.stringify(canon(storageManifest.objects.map(shape))))fail()
 if(verified.objects!==inv.objects.length)fail()
 return {status:'PAZO_LOCAL_BACKUP_INTEGRITY_PASS_ONLY',
  databaseFilesChecked:5,storageObjectsChecked:verified.objects,storageBytesChecked:verified.bytes,
  backupRecordedAtUtc:new Date(recorded).toISOString(),
  restoreVerified:false,offsiteVerified:false,currentHostedStateVerified:false,
  authServiceVerified:false,fullMigrationReplayVerified:false,productionReady:false}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--backup-dir')fail()
  console.log(JSON.stringify(await verifyPazoRecoveryPackage(process.argv[3])))
 }catch{
  console.error('PAZO_PRIVATE_BACKUP_INTEGRITY_BLOCKED (private details withheld)')
  process.exitCode=1
 }
}
