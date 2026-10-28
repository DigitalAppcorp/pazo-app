// Authenticated, read-only Vercel transport. Tokens remain inside CLI memory.
import assert from 'node:assert/strict'
import path from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
export function hostedAssetTransport(origin) {
 assert.match(origin,/^https:\/\/pazo-[a-z0-9]+-digitalapp\.vercel\.app$/,'immutable staging origin required')
 const execute=promisify(execFile),cache=new Map()
 const cli=process.env.PAZO_VERCEL_CLI_ENTRY||path.join(process.env.APPDATA,'npm/node_modules/vercel/dist/index.js')
 return async url=>{
  assert.equal(new URL(url).origin,origin)
  if(!cache.has(url))cache.set(url,(async()=>{
   const {stdout}=await execute(process.execPath,[cli,'curl',url,'--scope','digitalapp','--','--silent','--show-error','--include'],{encoding:'buffer',maxBuffer:12e6,timeout:90000})
   let body=stdout,header=''
   while(body.subarray(0,5).toString()==='HTTP/'){
    const end=body.indexOf('\r\n\r\n');assert.ok(end>=0)
    header=body.subarray(0,end).toString();body=body.subarray(end+4)
   }
   assert.equal(Number(header.match(/^HTTP\/\S+ (\d+)/)?.[1]),200,'authenticated hosted response')
   return {body,contentType:header.match(/content-type:\s*([^\r\n]+)/i)?.[1]||'application/octet-stream'}
  })())
  return cache.get(url)
 }
}
