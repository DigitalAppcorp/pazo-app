import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=new URL('../',import.meta.url)
const active=readFileSync(new URL('supabase/migrations/20261010043307_f14_media_jwt_claim_compat_single_test.sql',root))
const safe=readFileSync(new URL('supabase/history/f14_applied/20261010043307_f14_media_jwt_claim_compat_single_test.REDACTED.sql',root))
const snapshot=JSON.parse(readFileSync(new URL('docs/PAZO_F17_MIGRATION_HISTORY_CONTENT_INTEGRITY_20261023.json',root),'utf8'))
test('F14 one-time target mutation never sits in executable migrations',()=>{
 assert.deepEqual(active,safe,'F14 one-time SQL must remain structural-only (original source preserved as an audited hosted record)')
 const content=active.toString('utf8')
 assert.doesNotMatch(content,/DO\s+\$f14_single_test_claim_extension\$/i)
 assert.doesNotMatch(content,/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i)
 const original=snapshot.hosted_entries.find(x=>x.version==='20261010043307')
 assert.ok(original&&original.classification==='byte_exact')
 const digest=createHash('sha256').update(active).digest('hex')
 assert.notEqual(digest,'9fead53510c8d5d41376c4157396a6f6ddadc6a4635620d57e5c0812f1837b44',
 'hosted one-time SQL unexpectedly reintroduced')
})
