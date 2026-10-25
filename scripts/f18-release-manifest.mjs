import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve,relative} from 'node:path'
import {createHash} from 'node:crypto'
const root=resolve('.'),hash=value=>createHash('sha256').update(value).digest('hex')
export function buildF18Manifest(){
 const entries=['pazo-paypal-live-checkout','pazo-paypal-live-worker','pazo-admin-public-supporter'].map(name=>{
  const seen=new Map()
  function visit(path){
   const absolute=resolve(root,path),key=relative(root,absolute).replaceAll('\\','/')
   if(!key.startsWith('supabase/functions/')||seen.has(key))return
   const source=readFileSync(absolute,'utf8');seen.set(key,{path:key,sha256:hash(readFileSync(absolute))})
   for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(resolve(dirname(absolute),match[1]))
  }
  const entrypoint=`supabase/functions/${name}/index.ts`;visit(entrypoint)
  const files=[...seen.values()].sort((a,b)=>a.path.localeCompare(b.path))
  return {entrypoint,files,sourceTreeSha256:hash(JSON.stringify(files))}
 })
 const sql='supabase/migrations/20261025054548_pazo_f18_public_supporter_invitations.sql'
 return {status:'PREPARED_NOT_DEPLOYED',sql:{path:sql,sha256:hash(readFileSync(sql))},entries}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/f18-release-manifest.mjs')){
 writeFileSync('docs/review/f18/SOURCE_MANIFEST.json',JSON.stringify(buildF18Manifest(),null,2)+'\n')
 console.log('F18 full source-closure manifest generated; no provider or hosted access')
}
