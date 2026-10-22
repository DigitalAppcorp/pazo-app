import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import {runInNewContext} from 'node:vm'

const read = (file) => readFileSync(file, 'utf8')
const manifest = JSON.parse(read('public/manifest.webmanifest'))

// Verify that every install icon exists as valid PNG bytes of its promised size.
execFileSync(process.execPath, ['scripts/generate-pwa-icons.mjs'], { stdio: 'pipe' })
test('installable PAZO manifest has real icons, scope and standalone display', () => {
  assert.equal(manifest.name.startsWith('PAZO'), true)
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.start_url, '/')
  for (const [file, size] of [
    ['pwa-icon-192.png', 192], ['pwa-icon-512.png', 512],
    ['pwa-icon-maskable-512.png', 512], ['apple-touch-icon.png', 180],
  ]) {
    const bytes = readFileSync('public/' + file)
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG', file)
    assert.equal(bytes.readUInt32BE(16), size, file)
    assert.equal(bytes.readUInt32BE(20), size, file)
  }
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'))
})

test('PWA wiring does not prevent accessibility zoom', () => {
  const html = read('index.html')
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/)
  assert.match(html, /rel="apple-touch-icon" href="\/apple-touch-icon.png"/)
  assert.match(html, /name="theme-color"/)
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/)
  assert.match(read('src/main.tsx'), /registerPazoPwa\(\)/)
  assert.match(read('package.json'), /generate-pwa-icons.mjs/)
})

test('service worker never caches user data or intercepts API calls', () => {
  const sw = read('public/sw.js')
  assert.match(sw, /event.request.mode !== 'navigate'/)
  assert.match(sw, /event.request.method !== 'GET'/)
  assert.match(sw, /url.origin !== self.location.origin/)
  assert.doesNotMatch(sw, /caches\.|cache\.put|indexedDB|localStorage/)
  const reg = read('src/features/pwa/registerPwa.ts')
  assert.match(reg, /import.meta.env.PROD/)
  assert.match(reg, /serviceWorker.register\('\/sw.js'/)
})

test('PWA registers after asynchronous bootstrap even when load has already fired',async()=>{
  const source=read('src/features/pwa/registerPwa.ts')
    .replace('export function registerPazoPwa(): void','function registerPazoPwa()')
    .replace('import.meta.env.PROD','true')
  // Execute the production function in a private test context. No browser APIs
  // or real network access are used.
  for(const initialState of ['complete','loading']){
    const calls=[]
    let onLoad=null
    const context={
      navigator:{serviceWorker:{register:async(path,options)=>{
        calls.push({path,options})
        return {scope:'/'}
      }}},
      document:{readyState:initialState},
      window:{addEventListener:(type,fn,options)=>{
        assert.equal(type,'load')
        assert.equal(options?.once,true)
        onLoad=fn
      }}
    }
    runInNewContext(source+'\nregisterPazoPwa(); registerPazoPwa();',context)
    if(initialState==='loading'){
      assert.equal(calls.length,0,'must not register before load')
      assert.equal(typeof onLoad,'function')
      onLoad()
    }else assert.equal(onLoad,null)
    await Promise.resolve()
    assert.equal(calls.length,1,'one SW registration per app boot')
    assert.equal(calls[0].path,'/sw.js')
    assert.equal(calls[0].options.scope,'/')
  }
})

test('PayPal callback URLs strip provider tokens and retain only a non-financial route marker',async()=>{
  const {normalizeSupporterPaypalCallback}=await import(
    '../src/features/supporter/supporterAccountRoute.mjs')
  for(const [path,kind] of [['/paypal/return','return'],['/paypal/cancel','cancel']]){
    const state={pazoNavigation:true}
    const replaced=[]
    const history={state,replaceState:(nextState,title,url)=>replaced.push({nextState,title,url})}
    const location={pathname:path,search:'?ba_token=SENSITIVE_DO_NOT_KEEP',
      hash:'#access_token=DO_NOT_KEEP'}
    assert.equal(normalizeSupporterPaypalCallback(location,history),true)
    assert.equal(replaced.length,1)
    assert.equal(replaced[0].nextState,state)
    assert.equal(replaced[0].url,'/#/account/supporter?paypal='+kind)
    assert.ok(!JSON.stringify(replaced).includes('SENSITIVE'))
    assert.ok(!JSON.stringify(replaced).includes('access_token'))
  }
  const history={replaceState:()=>{throw Error('must not mutate unrelated routes')}}
  assert.equal(normalizeSupporterPaypalCallback({pathname:'/dashboard'},history),false)
})
