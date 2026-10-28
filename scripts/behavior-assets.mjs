import {hostedAssetTransport} from './hosted-asset-transport.mjs'
import {createHash} from 'node:crypto'
import fs from 'node:fs'
const origin=process.env.PAZO_HOSTED_ORIGIN
const get=hostedAssetTransport(origin),html=(await get(origin+'/')).body.toString()
const queue=[...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map(x=>x[1]).filter(x=>new URL(x,origin).origin===origin),seen=new Set(),assets=[]
let sources=''
while(queue.length){const url=new URL(queue.shift(),origin);if(seen.has(url.href))continue;seen.add(url.href);if(seen.size>80)throw Error('unexpected asset graph');const r=await get(url.href),source=r.body.toString();sources+=source;assets.push({path:url.pathname,bytes:r.body.length,sha256:createHash('sha256').update(r.body).digest('hex')});for(const m of source.matchAll(/["'`]((?:\.\.?\/|\/?assets\/)[^"'`]+\.js)["'`]/g)){const child=m[1].startsWith('assets/')?new URL('/'+m[1],origin):new URL(m[1],url);if(child.origin===origin&&!seen.has(child.href))queue.push(child.href)}}
const result={origin,assets,newReportPresent:sources.includes('pazo_admin_behavior_summary_v1'),newScreenMarker:sources.includes('behavior-panel'),privateNotice:sources.includes('pazo_behavior_withdraw_v1'),supabaseProject:sources.includes('https://mrybvqdebbgcayuvgkkr.supabase.co'),releaseVersions:[...new Set(sources.match(/0\.1\.\d{8}(?:\.1)?/g)||[])]}
fs.mkdirSync('artifacts/issue150/staging',{recursive:true});fs.writeFileSync('artifacts/issue150/staging/assets.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
if(!result.newReportPresent||!result.newScreenMarker||!result.supabaseProject)throw Error('expected staging code missing')
