import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {verifyRecoverySupplement} from './verify-recovery-supplement.mjs'
const sha=b=>createHash('sha256').update(b).digest('hex')
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pazo-recovery-synthetic-'))
 t.after(()=>fs.rm(root,{recursive:true,force:true}))
 const file=`data-${sha(Buffer.from('public.synthetic'))}.bin`
 const binary=Buffer.concat([Buffer.from('PGCOPY\n\xff\r\n\0','binary'),Buffer.alloc(8),Buffer.from([0xff,0xff])])
 const payload={
  [file]:binary,
  'source-catalog.private.json':JSON.stringify({tables:[{nspname:'public',relname:'synthetic',evidence:'rows=0'},{nspname:'supporter_private',relname:'p42_activation_signing_keys',evidence:'rows=0'}]}),
  'source-extra.private.json':JSON.stringify({columns:[{nspname:'public',relname:'synthetic',attname:'id',ordinal:1,attgenerated:''}]}),
  'data-inventory.json':JSON.stringify([{schema:'public',table:'synthetic',file,excluded:false,columns:['id']},{schema:'supporter_private',table:'p42_activation_signing_keys',file:null,excluded:true,columns:[]}]),
  'restore.sql':'-- synthetic only\n'
 }
 const files=[]
 for(const [name,value] of Object.entries(payload)){const bytes=Buffer.from(value);await fs.writeFile(path.join(root,name),bytes);files.push({file:name,bytes:bytes.length,sha256:sha(bytes)})}
 const manifest={version:1,project:'mrybvqdebbgcayuvgkkr',kind:'READ_ONLY_REPEATABLE_READ_BINARY_DATA',p42RowsExcluded:true,tables:2,dataFiles:1,sequences:0,files}
 const save=()=>fs.writeFile(path.join(root,'recovery-manifest.json'),JSON.stringify(manifest))
 await save()
 return {root,file,manifest,save}
}
test('complete synthetic supplement verifies hashes, COPY and explicit P42 exclusion',async t=>{
 const {root}=await fixture(t)
 const r=await verifyRecoverySupplement(root)
 assert.equal(r.dataFiles,1);assert.equal(r.restoreVerified,false)
})
test('tampered data is rejected',async t=>{
 const {root,file}=await fixture(t);await fs.appendFile(path.join(root,file),'changed')
 await assert.rejects(()=>verifyRecoverySupplement(root))
})
test('P42 exclusion cannot be removed or hidden by a rehash',async t=>{
 const {root,manifest,save}=await fixture(t)
 manifest.p42RowsExcluded=false;await save()
 await assert.rejects(()=>verifyRecoverySupplement(root))
})
test('unexpected files and traversal manifest entries are rejected',async t=>{
 const {root,manifest,save}=await fixture(t)
 await fs.writeFile(path.join(root,'unexpected'),'extra')
 await assert.rejects(()=>verifyRecoverySupplement(root))
 await fs.rm(path.join(root,'unexpected'))
 manifest.files[0].file='../outside.bin';await save()
 await assert.rejects(()=>verifyRecoverySupplement(root))
})
test('malformed binary COPY rejected even with a matching hash',async t=>{
 const {root,file,manifest,save}=await fixture(t)
 const bytes=Buffer.from('invalid COPY')
 await fs.writeFile(path.join(root,file),bytes)
 const entry=manifest.files.find(x=>x.file===file);entry.bytes=bytes.length;entry.sha256=sha(bytes);await save()
 await assert.rejects(()=>verifyRecoverySupplement(root))
})
