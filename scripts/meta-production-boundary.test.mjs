import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyMetaProductionBoundary,readMetaBoundarySources,ENTRYPOINTS,OFF_FLAGS}
  from './meta-production-boundary.mjs'
test('current PAZO entrypoints contain no Meta provider, SDK or consent imports',()=>{
 const sources=readMetaBoundarySources()
 const problems=verifyMetaProductionBoundary({sources})
 assert.deepEqual(problems,[])
})
test('a database gate that starts on, or a build switch on by default, is rejected',()=>{
 for(const [path,from,to] of [
  ['supabase/migrations/20261101120000_pazo_meta_conversions.sql',' enabled boolean NOT NULL DEFAULT false',' enabled boolean NOT NULL DEFAULT true'],
  ['src/features/marketing/metaRelease.ts',"env.VITE_PAZO_META_ENABLED === 'true'","env.VITE_PAZO_META_ENABLED !== 'false'"],
 ]){
  const sources=readMetaBoundarySources()
  sources[path]=sources[path].replace(from,to)
  assert.ok(verifyMetaProductionBoundary({sources}).some(p=>p.startsWith(path)),path)
 }
})
test('direct imports and silent SDK additions to live app are rejected',()=>{
 for(const snippet of [
  "import {completeExplicitMetaOptIn} from './features/marketing/metaConsentRegistrationFlow.mjs'",
  "import {createMetaConsentTransport} from './features/marketing/metaConsentTransport.mjs'",
  "import {MetaConsentChoice} from './features/marketing/MetaConsentChoice'",
  "const sdk='https://connect.facebook.net/en_US/fbevents.js'",
  "fbq('track','CompleteRegistration')",
  "fetch('https://graph.facebook.com/v24.0/123456/events')",
  "fetch('/functions/v1/pazo-meta-worker')",
 ]) {
  const sources=readMetaBoundarySources()
  sources['src/App.tsx']+='\n'+snippet
  const problems=verifyMetaProductionBoundary({sources})
  assert.ok(problems.some(p=>p.startsWith('src/App.tsx:')),snippet)
 }
})
test('missing release entrypoint never passes as an empty source',()=>{
 const sources=readMetaBoundarySources()
 delete sources[ENTRYPOINTS[0]]
 delete sources[Object.keys(OFF_FLAGS)[0]]
 const problems=verifyMetaProductionBoundary({sources})
 assert.equal(problems.filter(p=>p.includes('source unavailable')).length,2)
})
