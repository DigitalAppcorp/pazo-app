import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const paths=[
 '../supabase/queries/f14_account_cleanup_integrity_READ_ONLY.sql',
 '../supabase/queries/f14_storage_footprint_READ_ONLY.sql',
 '../supabase/queries/f14_photo_reference_footprint_READ_ONLY.sql',
]
for(const path of paths){
 test(path+' cannot mutate records or expose asset identities',()=>{
   const sql=readFileSync(new URL(path,import.meta.url),'utf8')
   const query=sql.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n')
   assert.doesNotMatch(query,/\b(?:DELETE\s+FROM|UPDATE\s+\w|INSERT\s+INTO|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE)\b/i)
   assert.match(query,/false AS may_delete_auth|false AS safe_to_delete/)
   assert.doesNotMatch(query,/\b(?:email|photo_url\s+AS\s+url_result|file_path\s+AS)\b/i)
 })
}
test('feed interaction integrity explicitly checks orphan target and pet actor',()=>{
 const sql=readFileSync(new URL(paths[0],import.meta.url),'utf8')
 assert.match(sql,/i\.target_type='post' AND p\.id IS NULL/)
 assert.match(sql,/pet\.id IS NULL/)
 assert.match(sql,/false AS may_delete_storage/)
})
test('media references require exact bucket-object suffix, never substring authorization',()=>{
 const sql=readFileSync(new URL(paths[2],import.meta.url),'utf8')
 assert.match(sql,/pg_catalog\.right\(refs\.url,pg_catalog\.length/)
 assert.match(sql,/COUNT\(\*\) FILTER\(WHERE NOT EXISTS/)
 assert.match(sql,/false AS safe_to_delete/)
})
