import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.PAZO_SUPABASE_URL
const secretKey = process.env.PAZO_SUPABASE_SECRET_KEY
const outputRoot = path.resolve(process.argv[2] || 'pazo-storage-backup')

if (!supabaseUrl || !secretKey) {
  console.error(
    'Missing PAZO_SUPABASE_URL or PAZO_SUPABASE_SECRET_KEY. ' +
      'Set them only in the current shell/session before running this script.'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const ensureSafeDestination = (base, objectPath) => {
  const destination = path.resolve(base, ...objectPath.split('/'))
  const relative = path.relative(base, destination)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Unsafe Storage object path: ${objectPath}`)
  }

  return destination
}

const listDirectory = async (bucket, prefix = '') => {
  const entries = []
  const limit = 100
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      throw new Error(
        `Could not list bucket "${bucket}" at "${prefix || '/'}": ${error.message}`
      )
    }

    entries.push(...(data || []))

    if (!data || data.length < limit) break
    offset += limit
  }

  return entries
}

const collectObjects = async (bucket, prefix = '') => {
  const entries = await listDirectory(bucket, prefix)
  const objects = []

  for (const entry of entries) {
    const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name
    const isFolder = entry.id == null && entry.metadata == null

    if (isFolder) {
      objects.push(...await collectObjects(bucket, objectPath))
      continue
    }

    objects.push({
      path: objectPath,
      size: Number(entry.metadata?.size || 0),
      created_at: entry.created_at || null,
      updated_at: entry.updated_at || null,
    })
  }

  return objects
}

const downloadObject = async (bucket, objectPath, bucketRoot) => {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath)

  if (error || !data) {
    throw new Error(
      `Could not download "${bucket}/${objectPath}": ${error?.message || 'empty response'}`
    )
  }

  const destination = ensureSafeDestination(bucketRoot, objectPath)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, Buffer.from(await data.arrayBuffer()))
}

await fs.mkdir(outputRoot, { recursive: true })

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

if (bucketError) {
  throw new Error(`Could not list Storage buckets: ${bucketError.message}`)
}

const manifest = {
  generated_at_utc: new Date().toISOString(),
  supabase_url_origin: new URL(supabaseUrl).origin,
  buckets: [],
  totals: {
    buckets: 0,
    objects: 0,
    bytes_reported: 0,
  },
}

for (const bucket of buckets || []) {
  const bucketRoot = path.join(outputRoot, bucket.name)
  await fs.mkdir(bucketRoot, { recursive: true })

  const objects = await collectObjects(bucket.name)
  let downloaded = 0
  let bytesReported = 0

  for (const object of objects) {
    await downloadObject(bucket.name, object.path, bucketRoot)
    downloaded += 1
    bytesReported += object.size

    console.log(`[${bucket.name}] ${downloaded}/${objects.length}: ${object.path}`)
  }

  manifest.buckets.push({
    name: bucket.name,
    public: bucket.public,
    object_count: downloaded,
    bytes_reported: bytesReported,
  })

  manifest.totals.buckets += 1
  manifest.totals.objects += downloaded
  manifest.totals.bytes_reported += bytesReported
}

await fs.writeFile(
  path.join(outputRoot, 'storage-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
)

console.log(
  `Storage backup PASS: ${manifest.totals.objects} objects across ` +
    `${manifest.totals.buckets} buckets -> ${outputRoot}`
)
