import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {VISUAL_CASES,VISUAL_VIEWPORTS,VISUAL_LANGUAGES,selectVisualCases,selectVisualViewports} from './cases.mjs'

const read=(path)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')
const harness=read('supabase/tests/visual/browser-harness.html')
const runner=read('scripts/visual-lab/capture.mjs')
const workflow=read('.github/workflows/pazo-visual-lab.yml')
const vite=read('vite.config.ts')
const config=read('src/lib/publicConfig.ts')

test('all visual fixture identifiers unique, explicitly typed and actually rendered',()=>{
  const ids=VISUAL_CASES.map(c=>c.id)
  assert.equal(new Set(ids).size,ids.length)
  assert.equal(ids.length,86,'86 named QA states must be registered')
  assert.deepEqual(VISUAL_LANGUAGES,['es','en'])
  for(const s of VISUAL_CASES){
    assert.match(s.id,/^[a-z][a-z-]*$/)
    assert.ok(['component','synthetic','blocked'].includes(s.level),s.id)
    assert.ok(s.template?['feed','communities','community-feature','search','nav','pet','care','documents','lost-review','lost-active','public-rescue','passport','sighting','report','map','map-suggest','feature-intent','notifications','messages','offer','benefits','wall','admin'].includes(s.template):harness.includes("case '"+s.id+"'"),s.id+' must have an implemented component renderer')
  }
})
test('pilot matrix is a representative subset; full matrix is labeled, not 86 completed',()=>{
  assert.ok(selectVisualCases('pilot').length>0)
  assert.ok(selectVisualCases('pilot').length<VISUAL_CASES.length)
  assert.equal(selectVisualCases('full').length,VISUAL_CASES.length)
  assert.equal(selectVisualCases('full').length,86)
  assert.deepEqual(Object.keys(VISUAL_VIEWPORTS),['320','390','430','768','1440'])
  assert.deepEqual(Object.keys(selectVisualViewports('pilot')),['390'])
  assert.match(runner,/inventory_target:86/)
  assert.match(runner,/NOT WCAG certification/)
  assert.match(harness,/installSyntheticReadGateway/)
  assert.match(read('scripts/visual-lab/synthetic-read-gateway.mjs'),/noWrite=\(\)=>\{throw Error/)
})
test('harness is guarded by localhost AND development build; real app not mutated',()=>{
  assert.match(harness,/import\.meta\.env\.DEV/)
  assert.match(harness,/127\.0\.0\.1/)
  assert.match(harness,/VISUAL_CASES\.some/)
  assert.match(harness,/synthetic:true,readOnly:true/)
  assert.match(harness,/const neverWrite=async\(\)=>\{throw new Error/)
  assert.doesNotMatch(vite,/browser-harness\.html/)
})
test('capture sandbox intercepts all requests and never follows external origins',()=>{
  assert.match(runner,/serviceWorkers:'block'/)
  assert.match(runner,/ctx\.route\('\*\*\/\*'/)
  assert.match(runner,/req\.method\(\)==='GET'/)
  assert.match(runner,/route\.abort\('blockedbyclient'\)/)
  assert.match(runner,/assert\.equal\(u\.protocol,'http:'/)
  assert.match(runner,/127\.0\.0\.1/)
  assert.ok(runner.includes("ORIGIN+'/supabase/tests/visual/browser-harness.html?case='"),'fixture navigation must include the URL path separator')
  assert.doesNotMatch(runner,/request\.continue\(\)/)
  assert.doesNotMatch(runner,/page\.goto\('https:\/\//)
})
test('workflow cannot deploy or mutate hosted PAZO',()=>{
  assert.match(workflow,/permissions:\s*\n  contents: read/)
  assert.match(workflow,/127\.0\.0\.1/)
  assert.match(workflow,/pazo-visual-lab\.yml/)
  assert.match(workflow,/workflow_dispatch:/)
  assert.match(workflow,/upload-artifact@v6/)
  assert.match(workflow,/sb_publishable_SYNTHETIC_VISUAL_LAB_NO_NETWORK/)
  assert.doesNotMatch(workflow,/vercel --prod|supabase db push|supabase migration repair|paypal.*create|checkout.*create/i)
  // Application's publicConfig pins the Supabase host, but browser blocks outbound I/O.
  assert.match(config,/const expectedHost = 'mrybvqdebbgcayuvgkkr\.supabase\.co'/)
})
