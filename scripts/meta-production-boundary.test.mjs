import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyMetaProductionBoundary,readMetaBoundarySources,ENTRYPOINTS,OFF_FLAGS}
  from './meta-production-boundary.mjs'
test('current PAZO entrypoints contain no Meta provider, SDK or consent imports',()=>{
 const sources=readMetaBoundarySources()
 const problems=verifyMetaProductionBoundary({sources})
 assert.deepEqual(problems,[])
})
test('a released flag is rejected even if browser entrypoints remain unchanged',()=>{
 const sources=readMetaBoundarySources()
 const path='supabase/functions/pazo-meta-worker/index.ts'
 sources[path]=sources[path].replace('const META_WORKER_PROVIDER_APPROVED=false',
   'const META_WORKER_PROVIDER_APPROVED=true')
 const problems=verifyMetaProductionBoundary({sources})
 assert.ok(problems.some(p=>p.includes('META_WORKER_PROVIDER_APPROVED=false')))
})
test('releasing isolated UI without review is rejected',()=>{
 const sources=readMetaBoundarySources()
 const path='src/features/marketing/MetaConsentChoice.tsx'
 sources[path]=sources[path].replace('export const META_CHOICES_RELEASED=false',
   'export const META_CHOICES_RELEASED=true')
 assert.ok(verifyMetaProductionBoundary({sources}).some(p=>p.includes('META_CHOICES_RELEASED=false')))
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
