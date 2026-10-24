import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {verifyPazoRecoveryPackage} from './f17-local-backup-preflight.mjs'
const sha=x=>createHash('sha256').update(x).digest('hex')
const payloads={
 'database.dump':Buffer.from('PGDMP synthetic fixture not a real restorable database'),
 'roles.sql':Buffer.from('-- synthetic roles only\n'),
 'storage-inventory.json':Buffer.from(JSON.stringify({project:'mrybvqdebbgcayuvgkkr',buckets:[],objects:[]})),
 'archive-toc.private.txt':Buffer.from('; synthetic pg_restore list\n'),
 'extension-owners.json':Buffer.from(JSON.stringify([{name:'pgcrypto',owner:'postgres',schema:'extensions',version:'1.3'}]))
}
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pazo-backup-integrity-synthetic-'))
 t.after(async()=>fs.rm(root,{recursive:true,force:true}))
 const files=[]
 for(const [name,data] of Object.entries(payloads)){
  await fs.writeFile(path.join(root,name),data)
  files.push({file:name,bytes:data.length,sha256:sha(data)})
 }
 const manifest={database_export:'EXPORTED_NOT_RESTORED',at_utc:new Date().toISOString(),
  files,offsite:'NOT_TESTED',restore:'NOT_TESTED'}
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await fs.mkdir(path.join(root,'storage'))
 await fs.writeFile(path.join(root,'storage','storage-manifest.json'),JSON.stringify({
  version:1,result:'VERIFIED_EXPORT',buckets:[],objects:[],totals:{objects:0,bytes:0}
 }))
 return {root,manifest}
}
test('valid five-part manifest + empty synthetic Storage passes content integrity ONLY',async t=>{
 const {root}=await fixture(t)
 const result=await verifyPazoRecoveryPackage(root)
 assert.equal(result.status,'PAZO_LOCAL_BACKUP_INTEGRITY_PASS_ONLY')
 assert.equal(result.databaseFilesChecked,5)
 assert.equal(result.storageObjectsChecked,0)
 for(const field of ['restoreVerified','offsiteVerified','currentHostedStateVerified',
  'authServiceVerified','fullMigrationReplayVerified','productionReady'])assert.equal(result[field],false)
})
test('Windows PowerShell UTF-8 BOM manifest is accepted without changing hashed files',async t=>{
 const {root}=await fixture(t)
 const filename=path.join(root,'database-manifest.json')
 const data=await fs.readFile(filename)
 await fs.writeFile(filename,Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),data]))
 const result=await verifyPazoRecoveryPackage(root)
 assert.equal(result.status,'PAZO_LOCAL_BACKUP_INTEGRITY_PASS_ONLY')
 assert.equal(result.restoreVerified,false)
})
test('mismatched SHA/bytes blocks package',async t=>{
 const {root}=await fixture(t)
 await fs.appendFile(path.join(root,'roles.sql'),'tampered')
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('invalid custom pg_dump header blocks even with matching checksum',async t=>{
 const {root,manifest}=await fixture(t)
 const bytes=Buffer.from('invalid database file')
 await fs.writeFile(path.join(root,'database.dump'),bytes)
 const entry=manifest.files.find(x=>x.file==='database.dump')
 entry.bytes=bytes.length;entry.sha256=sha(bytes)
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('unexpected file name/path traversal blocks even with valid hashes',async t=>{
 const {root,manifest}=await fixture(t)
 manifest.files[0].file='../data.dump'
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('missing required DB piece blocks',async t=>{
 const {root}=await fixture(t)
 await fs.rm(path.join(root,'extension-owners.json'))
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('symlinked DB piece blocks',async t=>{
 const {root}=await fixture(t)
 await fs.rename(path.join(root,'roles.sql'),path.join(root,'original.sql'))
 try { await fs.symlink(path.join(root,'original.sql'),path.join(root,'roles.sql')) }
 catch(error) {
  if(process.platform!=='win32'||error.code!=='EPERM')throw error
  t.skip('Windows account cannot create file symlinks; directory junction rejection is tested separately')
  return
 }
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('storage inventory must match Storage export, even after rehash',async t=>{
 const {root,manifest}=await fixture(t)
 const data=Buffer.from(JSON.stringify({project:'mrybvqdebbgcayuvgkkr',
  buckets:[{id:'private',public:false}],objects:[]}))
 await fs.writeFile(path.join(root,'storage-inventory.json'),data)
 const entry=manifest.files.find(x=>x.file==='storage-inventory.json')
 entry.bytes=data.length;entry.sha256=sha(data)
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('cross-project package rejected',async t=>{
 const {root,manifest}=await fixture(t)
 const data=Buffer.from(JSON.stringify({project:'other-project',buckets:[],objects:[]}))
 await fs.writeFile(path.join(root,'storage-inventory.json'),data)
 const entry=manifest.files.find(x=>x.file==='storage-inventory.json')
 entry.bytes=data.length;entry.sha256=sha(data)
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})
test('future timestamp and absent Storage each block',async t=>{
 const {root,manifest}=await fixture(t)
 manifest.at_utc=new Date(Date.now()+86400000).toISOString()
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
 manifest.at_utc=new Date().toISOString()
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 await fs.rm(path.join(root,'storage'),{recursive:true})
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})

test('non-empty synthetic Storage object matches administrative inventory and hash',async t=>{
 const {root,manifest}=await fixture(t)
 const bucket='pet-documents',objectPath='nested/synthetic.txt',id='synthetic-object-id'
 const binary=Buffer.from('fixture-private-bytes')
 const filename=sha(Buffer.from(JSON.stringify([bucket,objectPath])))+'.bin'
 await fs.mkdir(path.join(root,'storage','objects'))
 await fs.writeFile(path.join(root,'storage','objects',filename),binary)
 const obj={bucket,path:objectPath,id,size:binary.length,
  file:'objects/'+filename,sha256:sha(binary)}
 const stored={version:1,result:'VERIFIED_EXPORT',
  buckets:[{id:bucket,public:false}],objects:[obj],
  totals:{objects:1,bytes:binary.length}}
 await fs.writeFile(path.join(root,'storage','storage-manifest.json'),JSON.stringify(stored))
 const inv=Buffer.from(JSON.stringify({project:'mrybvqdebbgcayuvgkkr',
  buckets:[{id:bucket,public:false}],
  objects:[{bucket,path:objectPath,id,size:String(binary.length)}]}))
 await fs.writeFile(path.join(root,'storage-inventory.json'),inv)
 const entry=manifest.files.find(x=>x.file==='storage-inventory.json')
 entry.bytes=inv.length;entry.sha256=sha(inv)
 await fs.writeFile(path.join(root,'database-manifest.json'),JSON.stringify(manifest))
 const pass=await verifyPazoRecoveryPackage(root)
 assert.equal(pass.storageObjectsChecked,1)
 assert.equal(pass.storageBytesChecked,binary.length)
 assert.equal(pass.restoreVerified,false)
 await fs.writeFile(path.join(root,'storage','objects',filename),'tampered')
 await assert.rejects(()=>verifyPazoRecoveryPackage(root))
})

test('Windows canonical casing accepts the same real directory', {skip:process.platform!=='win32'},async t=>{
 const {root}=await fixture(t)
 const alias=root.replace(/^[A-Z]:/,drive=>drive.toLowerCase())
 assert.notEqual(alias,await fs.realpath(alias))
 const result=await verifyPazoRecoveryPackage(alias)
 assert.equal(result.databaseFilesChecked,5)
})

test('linked backup root is rejected before canonicalization',async t=>{
 const {root}=await fixture(t)
 const alias=root+'-linked'
 await fs.symlink(root,alias,process.platform==='win32'?'junction':'dir')
 t.after(()=>fs.rm(alias,{recursive:true,force:true}))
 await assert.rejects(()=>verifyPazoRecoveryPackage(alias))
})