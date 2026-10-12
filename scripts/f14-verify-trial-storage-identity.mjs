import { createClient } from '@supabase/supabase-js'
import {
  F14_TRIAL_SCOPE,
  assertTrialStorageIdentity,
} from '../supabase/functions/f14-moderation-purge/trialScope.ts'
import { storageObjectExists } from '../supabase/functions/f14-moderation-purge/storageInfo.ts'

// F14 preflight ONLY. Uses the operator's existing authorized read credential.
// No remove, upload, SQL, RPC, claims, status changes or secret/path logging.
// Run from an authorized runtime with Node's --experimental-strip-types flag.
const path = process.env.PAZO_VERIFY_MEDIA_PATH
const key = process.env.PAZO_VERIFY_STORAGE_READ_KEY
const origin = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
if (process.argv.length !== 2 ||
  !path || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)+$/.test(path) ||
  path.includes('..') || path.length > 400 || !key) {
  console.error('BLOCKED: authorized Storage read key and exact trial path are required.')
  process.exitCode = 2
} else {
  try {
    const client = createClient(origin, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const info = await client.storage.from(F14_TRIAL_SCOPE.bucket).info(path)
    if (!storageObjectExists(info)) {
      throw new Error('trial_origin_absent')
    }
    assertTrialStorageIdentity(info)
    console.log('PASS: Storage.info() returned the exact immutable trial object ID.')
  } catch {
    console.error('BLOCKED: Storage.info() identity not verified; do not enable purge.')
    process.exitCode = 2
  }
}
