import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
const root=new URL('../supabase/tests/f14/',import.meta.url)
const expected=JSON.parse(readFileSync(new URL('catalog-expected-hashes.json',root)))
const queries=JSON.parse(readFileSync(new URL('catalog-queries.json',root)))
const psql=process.env.F14_PSQL||'psql'
const order=(a,b)=>a<b?-1:a>b?1:0
function norm(x,k=''){
 if(Array.isArray(x)){const a=x.map(y=>norm(y));return ['acl','roles'].includes(k)?a.sort((a,b)=>order(JSON.stringify(a),JSON.stringify(b))):a}
 if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,norm(x[k],k)]))
 return typeof x==='string'?x.replaceAll('\r\n','\n'):x
}
const changed=new Set(['f14_media_probe','f14_moderation_media_gate','f14_local_url_points_to_object','f14_guard_held_media_reference','f14_guard_held_storage_mutation','f14_finalize_one_object_reconciliation'])
for(const [kind,q] of Object.entries(queries)){
 const query=kind==='sequences'?q.replace('s.seqmax,','s.seqmax::text AS seqmax,'):q
 const rows=JSON.parse(execFileSync(psql,['-X','-h','127.0.0.1','-p','55441','-U','f14_admin','-d','f14_synthetic','-Atq','-v','ON_ERROR_STOP=1','-c',`SELECT coalesce(json_agg(t),'[]') FROM (${query}) t`],{encoding:'utf8',maxBuffer:4e6,timeout:15000}))
 const actual=rows.filter(r=>kind==='functions'?!changed.has(r.proname):kind==='roles'?r.rolname!=='f14_admin':kind==='triggers'?!['f14_guard_held_media_reference','f14_guard_held_storage_mutation'].includes(r.tgname):true).map(r=>{
  r={...r}
  // Restoration compacts previously dropped column slots; compare by name.
  if(kind==='columns')delete r.attnum
  // Administrative grantors differ; ADMIN/INHERIT/SET must remain exact.
  if(kind==='memberships')delete r.grantor
  return norm(r)
 }).sort((a,b)=>order(JSON.stringify(a),JSON.stringify(b)))
 assert.equal(actual.length,expected[kind].count,kind+' object count')
 assert.equal(createHash('sha256').update(JSON.stringify(actual)).digest('hex'),expected[kind].sha256,kind+' semantic source catalog mismatch')
 console.log('PASS catalog '+kind+': '+actual.length)
}
