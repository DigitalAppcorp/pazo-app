import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { backupStorage } from './storage-backup-core.mjs'

// Operator-only READ operations. Never log paths, provider bodies or credentials.
const projectUrl = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
try {
  const key = process.env.PAZO_SUPABASE_SECRET_KEY ?? ''
  let serverKey = /^sb_secret_[A-Za-z0-9_-]+$/.test(key)
  if (key.startsWith('eyJ')) {
    try { serverKey = JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role === 'service_role' } catch { /* reject */ }
  }
  if (process.env.PAZO_SUPABASE_URL !== projectUrl || !serverKey || !process.argv[2] || !process.env.PAZO_STORAGE_INVENTORY_FILE) {
    throw new Error('CONFIGURATION_REQUIRED')
  }
  const outputRoot = path.resolve(process.argv[2])
  const parent = await fs.realpath(path.dirname(outputRoot))
  const forbidden = [path.resolve('.'), process.env.OneDrive, process.env.OneDriveConsumer,
    process.env.OneDriveCommercial, process.env.PAZO_DRIVE_SYNC_ROOT].filter(Boolean)
  for (const root of forbidden) {
    const relative = path.relative(path.resolve(root), parent)
    if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('PRIVATE_UNSYNCED_DESTINATION_REQUIRED')
    }
  }
  await fs.mkdir(outputRoot, { mode: 0o700 })
  const client = createClient(projectUrl, process.env.PAZO_SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } })
  const expected = JSON.parse(await fs.readFile(process.env.PAZO_STORAGE_INVENTORY_FILE,'utf8'))
  const result = await backupStorage(client.storage, outputRoot, expected)
  console.log(JSON.stringify({ storageExport: 'PASS', objects: result.totals.objects,
    bytes: result.totals.bytes, offsite: 'NOT_TESTED', restore: 'NOT_TESTED' }))
} catch {
  console.error('Storage export FAIL. No backup certification; preserve partial files privately for diagnosis.')
  process.exitCode = 1
}
