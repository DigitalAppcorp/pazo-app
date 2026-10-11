import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { backupStorage, verifyStorageExport } from './storage-backup-core.mjs'

// Synthetic SDK responses exercise exporter failure handling, not hosted backup PASS.
function fixture({ count=1, hidden=false, badSize=false, failure=false, changes=false }={}) {
  let scans = 0
  const objects = Array.from({length:count},(_,i)=>({bucket:'private-documents',path:`folder/CON:${i}.pdf`,id:`synthetic-${i}`,size:3}))
  const expected = {project:'mrybvqdebbgcayuvgkkr',buckets:[{id:'private-documents',public:false}],objects}
  return { expected, sdk: {
    listBuckets: async()=>{ scans++; return {data:expected.buckets,error:null} },
    from:()=>({
      list:async(prefix,{offset})=>({data:hidden?[]:prefix===''
        ? [{name:'folder',id:null,metadata:null}]
        : objects.slice(offset,offset+100).map(o=>({name:o.path.split('/')[1],id:o.id,
          metadata:{size:badSize?4:o.size},updated_at:changes&&scans>1?'changed':'stable'})),error:null}),
      download:async()=>failure?{data:null,error:{message:'synthetic-secret-never-logged'}}:{data:new Blob(['abc']),error:null}
    })
  } }
}
async function directory(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pazo-backup-synthetic-'))
  // Delete only this generated local test folder; no provider calls or user files.
  t.after(()=>fs.rm(root,{recursive:true,force:true}))
  return root
}
test('nested pagination exports 101 synthetic objects with hashes and Windows-safe names',async t=>{
  const root=await directory(t), {sdk,expected}=fixture({count:101})
  const manifest=await backupStorage(sdk,root,expected)
  assert.equal(manifest.objects.length,101)
  assert.deepEqual(await verifyStorageExport(root),{objects:101,bytes:303})
  assert.match(manifest.objects[0].file,/^objects\/[a-f0-9]{64}\.bin$/)
})
for(const [name,options] of Object.entries({hidden:{hidden:true},bytes:{badSize:true},download:{failure:true},drift:{changes:true}})) {
  test(`${name} failure cannot write a success manifest`,async t=>{
    const root=await directory(t), {sdk,expected}=fixture(options)
    await assert.rejects(()=>backupStorage(sdk,root,expected))
    await assert.rejects(()=>fs.stat(path.join(root,'storage-manifest.json')))
  })
}
test('cross-project administrative inventory is rejected',async t=>{
  const root=await directory(t),{sdk,expected}=fixture()
  await assert.rejects(()=>backupStorage(sdk,root,{...expected,project:'another-project'}))
})

for (const size of [null, '']) {
  test(`missing administrative size ${JSON.stringify(size)} cannot certify a zero-byte object`,async t=>{
    const root=await directory(t),{sdk,expected}=fixture()
    expected.objects[0].size=size
    await assert.rejects(()=>backupStorage(sdk,root,expected))
    await assert.rejects(()=>fs.stat(path.join(root,'storage-manifest.json')))
  })
}
test('modified downloaded bytes fail integrity verification',async t=>{
  const root=await directory(t),{sdk,expected}=fixture()
  const m=await backupStorage(sdk,root,expected)
  await fs.writeFile(path.join(root,m.objects[0].file),'xyz')
  await assert.rejects(()=>verifyStorageExport(root))
})
test('tampered manifest path cannot escape destination',async t=>{
  const root=await directory(t),{sdk,expected}=fixture()
  const m=await backupStorage(sdk,root,expected)
  m.objects[0].file='../outside.bin'
  await fs.writeFile(path.join(root,'storage-manifest.json'),JSON.stringify(m))
  await assert.rejects(()=>verifyStorageExport(root))
})
test('existing export cannot be overwritten',async t=>{
  const root=await directory(t),{sdk,expected}=fixture()
  await backupStorage(sdk,root,expected)
  await assert.rejects(()=>backupStorage(sdk,root,expected))
  assert.deepEqual(await verifyStorageExport(root),{objects:1,bytes:3})
})
