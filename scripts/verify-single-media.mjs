import { createClient } from '@supabase/supabase-js'
import { storageObjectExists } from '../supabase/functions/f14-moderation-purge/storageInfo.ts'

// Read-only verifier for an independently authorized operator trial. No remove,
// SQL, RPC, claims or status writes. Never print credentials, paths or URLs.
const stage = process.argv[2]
const bucket = process.env.PAZO_VERIFY_MEDIA_BUCKET
const path = process.env.PAZO_VERIFY_MEDIA_PATH
const key = process.env.PAZO_VERIFY_STORAGE_READ_KEY
const origin = 'https://mrybvqdebbgcayuvgkkr.supabase.co'
if (!['before','after'].includes(stage) || !['post-photos','community-post-photos'].includes(bucket)
  || !path || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)+$/.test(path)
  || path.includes('..') || path.length>400 || !key) {
  console.error('BLOCKED: stage, exact allowed bucket/path and authorized Storage read credential required.')
  process.exitCode=2
} else {
  const client=createClient(origin,key,{auth:{persistSession:false,autoRefreshToken:false}})
  try {
    const info=await client.storage.from(bucket).info(path)
    const exists=storageObjectExists(info)
    const url=`${origin}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`
    const original=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)})
    const fresh=await fetch(`${url}?pazo_verify=${crypto.randomUUID()}`,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)})
    await original.body?.cancel();await fresh.body?.cancel()
    const inaccessible=original.status===404 && fresh.status===404
    const passed=stage==='before' ? exists && original.ok && fresh.ok : !exists && inaccessible
    console.log(JSON.stringify({stage,originObjectPresent:exists,originalStatus:original.status,freshStatus:fresh.status,trialResult:passed?'PASS':'FAIL'}))
    process.exitCode=passed?0:1
  } catch {
    console.error('BLOCKED: object absence or URL response could not be verified. No removal is confirmed.')
    process.exitCode=2
  }
}
