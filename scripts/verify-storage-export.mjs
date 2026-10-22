import { verifyStorageExport } from './storage-backup-core.mjs'
try {
  if (!process.argv[2]) throw new Error('DIRECTORY_REQUIRED')
  console.log(JSON.stringify({ localStorageIntegrity: 'PASS', ...await verifyStorageExport(process.argv[2]),
    hostedRestore: 'NOT_TESTED' }))
} catch {
  console.error('Local Storage integrity FAIL; no private manifest or provider response logged.')
  process.exitCode = 1
}
