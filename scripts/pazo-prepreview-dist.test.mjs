// PAZO pre-preview artifact checks; offline, no external services.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,statSync} from 'node:fs'
import {resolve,join} from 'node:path'
const dist=resolve('dist')
const read=(name)=>readFileSync(join(dist,name),'utf8')
const asset=(name)=>{
 assert.ok(typeof name==='string'&&!name.includes('..')&&!name.startsWith('//'))
 const path=join(dist,name.replace(/^\//,''))
 assert.ok(existsSync(path),'missing built asset: '+name)
 assert.ok(statSync(path).size>0,'empty built asset: '+name)
 return path
}
test('installable PWA manifest, icons and SW are in the compiled output',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'))
 assert.equal(manifest.display,'standalone')
 assert.equal(manifest.start_url,'/')
 assert.equal(manifest.scope,'/')
 for(const icon of manifest.icons){
  assert.ok(icon.src.startsWith('/')&&!icon.src.startsWith('//'))
  const bytes=readFileSync(asset(icon.src))
  assert.equal(bytes.subarray(1,4).toString(),'PNG')
 }
 for(const file of ['pwa-icon-192.png','pwa-icon-512.png','pwa-icon-maskable-512.png','apple-touch-icon.png','sw.js'])asset(file)
})
test('built HTML references local JavaScript, styles and manifest',()=>{
 const html=read('index.html')
 assert.match(html,/rel="manifest" href="\/manifest\.webmanifest"/)
 assert.match(html,/rel="apple-touch-icon" href="\/apple-touch-icon\.png"/)
 const links=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)]
 assert.ok(links.some(m=>m[1].endsWith('.js')),'no Vite entry JavaScript')
 links.forEach(m=>asset(m[1]))
})
test('PayPal browser return and cancel stay inside the SPA',()=>{
 const vercel=JSON.parse(readFileSync('vercel.json','utf8'))
 const rewrites=new Map((vercel.rewrites||[]).map(row=>[row.source,row.destination]))
 assert.equal(rewrites.get('/paypal/return'),'/index.html')
 assert.equal(rewrites.get('/paypal/cancel'),'/index.html')
 assert.ok(!('redirects' in vercel),'unexpected external redirects')
})
test('worker is network-only and never caches accounts, posts or payments',()=>{
 const sw=read('sw.js')
 assert.match(sw,/request\.mode !== 'navigate'/)
 assert.match(sw,/request\.method !== 'GET'/)
 assert.doesNotMatch(sw,/\bcaches\.(?:open|match|delete)|cache\.put|indexedDB/)
})
