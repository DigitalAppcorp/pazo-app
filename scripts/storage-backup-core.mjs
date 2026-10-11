import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

const hash = value => createHash('sha256').update(value).digest('hex')
const fail = () => { throw new Error('STORAGE_EXPORT_NOT_VERIFIED') }
const objectSize = value => {
  if (!(typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))) fail()
  const size = Number(value)
  if (!Number.isSafeInteger(size) || size < 0) fail()
  return size
}
const unwrap = response => {
  if (response.error || response.data == null) fail()
  return response.data
}
async function inventory(storage) {
  const buckets = unwrap(await storage.listBuckets())
  if (!Array.isArray(buckets)) fail()
  const seen = new Set()
  const objects = []
  const directories = new Set()
  for (const bucket of buckets) {
    if (typeof bucket.id !== 'string' || !bucket.id || seen.has(bucket.id)) fail()
    seen.add(bucket.id)
    async function walk(prefix) {
      const identity = JSON.stringify([bucket.id, prefix])
      if (directories.has(identity) || directories.size > 10000) fail()
      directories.add(identity)
      for (let offset = 0; ; offset += 100) {
        const page = unwrap(await storage.from(bucket.id).list(prefix,
          { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }))
        if (!Array.isArray(page) || page.length > 100 || offset > 1000000) fail()
        for (const entry of page) {
          if (typeof entry.name !== 'string' || !entry.name || /[/\\\x00]/.test(entry.name) || ['.','..'].includes(entry.name)) fail()
          const name = prefix ? `${prefix}/${entry.name}` : entry.name
          if (entry.id == null && entry.metadata == null) { await walk(name); continue }
          const size = objectSize(entry.metadata?.size)
          if (typeof entry.id !== 'string' || !Number.isSafeInteger(size) || size < 0) fail()
          objects.push({ bucket: bucket.id, path: name, id: entry.id, size,
            updated_at: entry.updated_at ?? null })
        }
        if (page.length < 100) break
      }
    }
    await walk('')
  }
  const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0
  objects.sort((a,b) => compare(JSON.stringify([a.bucket,a.path]),JSON.stringify([b.bucket,b.path])))
  const identities = objects.map(o => JSON.stringify([o.bucket,o.path]))
  if (new Set(identities).size !== objects.length) fail()
  return { buckets: buckets.map(b => ({ id: b.id, public: b.public })).sort((a,b)=>compare(a.id,b.id)), objects }
}
export async function backupStorage(storage, outputRoot, expected) {
  const before = await inventory(storage)
  // Cross-check against the administrative READ ONLY catalog export, not just
  // API totals: a restricted/empty listing must never certify an empty backup.
  if (!expected || expected.project !== 'mrybvqdebbgcayuvgkkr' || !Array.isArray(expected.objects) || !Array.isArray(expected.buckets)) fail()
  const canonical = list => list.map(o=>JSON.stringify(o)).sort()
  if (JSON.stringify(canonical(before.buckets)) !== JSON.stringify(canonical(expected.buckets.map(b=>({id:b.id,public:b.public})))) ||
      JSON.stringify(canonical(before.objects.map(o=>({bucket:o.bucket,path:o.path,id:o.id,size:o.size})))) !==
      JSON.stringify(canonical(expected.objects.map(o=>({bucket:o.bucket,path:o.path,id:o.id,size:objectSize(o.size)}))))) fail()
  await fs.mkdir(path.join(outputRoot,'objects'), { mode: 0o700 })
  const objects = []
  for (const object of before.objects) {
    const blob = unwrap(await storage.from(object.bucket).download(object.path))
    const bytes = Buffer.from(await blob.arrayBuffer())
    if (bytes.length !== object.size) fail()
    // Bucket/path remains in the PRIVATE manifest. Hash filenames avoid Windows
    // traversal, device names, colons, alternate streams and case collisions.
    const file = `objects/${hash(JSON.stringify([object.bucket,object.path]))}.bin`
    await fs.writeFile(path.join(outputRoot,file), bytes, { flag: 'wx', mode: 0o600 })
    const reread = await fs.readFile(path.join(outputRoot,file))
    if (hash(reread) !== hash(bytes)) fail()
    objects.push({ ...object, file, sha256: hash(bytes) })
  }
  const after = await inventory(storage)
  if (JSON.stringify(before) !== JSON.stringify(after)) fail()
  const manifest = { version: 1, generated_at_utc: new Date().toISOString(),
    result: 'VERIFIED_EXPORT', buckets: before.buckets, objects,
    totals: { objects: objects.length, bytes: objects.reduce((total,o)=>total+o.size,0) },
    limits: 'Not an atomic DB+Storage snapshot; does not certify offsite or restoration.' }
  await fs.writeFile(path.join(outputRoot,'storage-manifest.json'), JSON.stringify(manifest,null,2)+'\n',
    { flag: 'wx', mode: 0o600 })
  return manifest
}
export async function verifyStorageExport(outputRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(outputRoot,'storage-manifest.json'),'utf8'))
  if (manifest.version !== 1 || manifest.result !== 'VERIFIED_EXPORT' || !Array.isArray(manifest.objects)) fail()
  const seen = new Set()
  let total = 0
  for (const object of manifest.objects) {
    const expectedFile = `objects/${hash(JSON.stringify([object.bucket,object.path]))}.bin`
    if (object.file !== expectedFile || seen.has(expectedFile) || !Number.isSafeInteger(object.size) || object.size < 0 ||
        !/^[a-f0-9]{64}$/.test(object.sha256)) fail()
    seen.add(expectedFile)
    const filename = path.join(outputRoot,expectedFile)
    if ((await fs.lstat(filename)).isSymbolicLink()) fail()
    const real = await fs.realpath(filename)
    if (path.relative(await fs.realpath(outputRoot),real) !== expectedFile.split('/').join(path.sep)) fail()
    const bytes = await fs.readFile(filename)
    if (bytes.length !== object.size || hash(bytes) !== object.sha256) fail()
    total += bytes.length
  }
  if (manifest.totals.objects !== seen.size || manifest.totals.bytes !== total) fail()
  return { objects: seen.size, bytes: total }
}
