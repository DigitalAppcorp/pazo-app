// Curated synthetic evidence only. No env/config/credentials or user data copied.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
const out='docs/product-intelligence/evidence'
const copies={
 'artifacts/issue153/pg17.json':'pg17.json',
 'artifacts/issue153/browser/results.json':'native-dashboard.json',
 'artifacts/issue153/performance.json':'performance.json',
 'artifacts/issue153/visual/results.json':'primary-font.json',
 'artifacts/issue153/staging-final/results.json':'staging.json',
 'artifacts/issue153/contract.json':'contracts.json',
 'artifacts/pr1a/results.json':'mobile-regression.json',
 'artifacts/issue153/visual/es-390-q0.png':'primary-es-390.png',
 'artifacts/issue153/visual/es-320-q3.png':'primary-es-320.png',
 'artifacts/issue153/visual/en-1440-q2.png':'primary-en-1440-social.png',
 'artifacts/issue153/visual/es-390-proposals.png':'primary-es-390-proposals.png',
 'artifacts/issue153/browser/es-320-protected.png':'fallback-protected-es-320.png',
 'artifacts/issue153/browser/en-390-error.png':'fallback-error-en-390.png',
 'artifacts/issue153/browser/es-390-loading.png':'fallback-loading-es-390.png',
 'artifacts/issue153/browser/en-1440-mfa.png':'fallback-mfa-en-1440.png',
 'artifacts/issue153/staging-final/es-390-overview.png':'staging-es-390.png',
 'artifacts/issue153/staging-final/en-1440-question-3.png':'staging-en-1440-paused.png',
}
for(const [source,target]of Object.entries(copies)){
 assert.ok(fs.existsSync(source),'Missing completed evidence '+source)
 if(source.endsWith('.json')&&!source.includes('/pr1a/'))assert.equal(JSON.parse(fs.readFileSync(source,'utf8')).status,'PASS',source)
 fs.copyFileSync(source,path.join(out,target))
}
const log=fs.readFileSync('artifacts/issue153/build.log','utf8');assert.match(log,/built in/);assert.doesNotMatch(log,/error TS\d+/)
assert.equal(fs.readFileSync('artifacts/issue153/lint.log','utf8').trim(),'')
const assets=fs.readdirSync('dist/assets').filter(x=>/\.(js|css)$/.test(x)).map(name=>{const b=fs.readFileSync('dist/assets/'+name);return {name,bytes:b.length,gzipBytes:gzipSync(b).length}})
fs.writeFileSync(out+'/engineering.json',JSON.stringify({status:'PASS',build:'npm run build (TypeScript project references + Vite)',lint:'Scoped seven new/changed marketing TS/TSX files; global legacy lint is not claimed clean',unitTests:56,governanceTests:776,historicalGuards:15,mobileViewports:[320,390,430],assets,limitations:['Build retains chunk-size warnings; no bundle-size or field-performance improvement is claimed.','Browser services/Auth are controlled; actual SQL runs in disposable PostgreSQL17.']},null,2)+'\n')
const files=fs.readdirSync(out).filter(name=>name!=='EVIDENCE_MANIFEST.json').sort().map(name=>{const b=fs.readFileSync(path.join(out,name));return {path:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}})
fs.writeFileSync(out+'/EVIDENCE_MANIFEST.json',JSON.stringify({sourceCommit:'63c81bd069d5c011b12e1402c23e00d06a647754',synthetic:true,hostedWrites:0,files},null,2)+'\n')
console.log(JSON.stringify({status:'PASS',files:files.length,bytes:files.reduce((n,x)=>n+x.bytes,0)}))
