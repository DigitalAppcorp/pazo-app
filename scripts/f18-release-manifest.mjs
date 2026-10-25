import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve,relative} from 'node:path'
import {createHash} from 'node:crypto'
const root=resolve('.'),hash=value=>createHash('sha256').update(value).digest('hex')
// Git stores these text sources with LF. Windows checkout conversion must not
// change the review digest; no whitespace/content other than CRLF is altered.
const gitText=path=>readFileSync(path,'utf8').replaceAll('\r\n','\n')
export function buildF18Manifest(){
 const entries=['pazo-paypal-live-checkout','pazo-paypal-live-worker','pazo-admin-public-supporter'].map(name=>{
  const seen=new Map()
  function visit(path){
   const absolute=resolve(root,path),key=relative(root,absolute).replaceAll('\\','/')
   if(!key.startsWith('supabase/functions/')||seen.has(key))return
   const source=gitText(absolute);seen.set(key,{path:key,sha256:hash(source)})
   for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))visit(resolve(dirname(absolute),match[1]))
  }
  const entrypoint=`supabase/functions/${name}/index.ts`;visit(entrypoint)
  const files=[...seen.values()].sort((a,b)=>a.path.localeCompare(b.path))
  return {entrypoint,files,sourceTreeSha256:hash(JSON.stringify(files))}
 })
 const sql='supabase/migrations/20261025073311_pazo_f18_public_supporter_invitations.sql'
 return {status:'SQL_APPLIED_EDGES_PENDING',lineEndings:'git-lf',sql:{path:sql,sha256:hash(gitText(sql))},entries}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/f18-release-manifest.mjs')){
 writeFileSync('docs/review/f18/SOURCE_MANIFEST.json',JSON.stringify(buildF18Manifest(),null,2)+'\n')
 console.log('F18 full source-closure manifest generated; no provider or hosted access')
}
