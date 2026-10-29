import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import ts from 'typescript'
const source=fs.readFileSync('src/features/marketing/intelligenceCatalog.ts','utf8'),sql=fs.readFileSync('supabase/migrations/20261029010000_pazo_product_intelligence.sql','utf8')
const catalog=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText).toString('base64'))
const vocabulary=name=>[...sql.match(new RegExp('CREATE FUNCTION marketing_private.'+name+'[\\s\\S]*?ARRAY\\[([^\\]]+)'))[1].matchAll(/'([^']+)'/g)].map(x=>x[1]).sort()
assert.deepEqual(Object.keys(catalog.intelligenceTasks).sort(),vocabulary('intelligence_task_valid'))
assert.deepEqual([...catalog.anonymousSignals].sort(),vocabulary('experience_signal_valid'))
assert.equal(catalog.INTELLIGENCE_COLLECTION_ENABLED,false)
assert.match(fs.readFileSync('supabase/functions/pazo-marketing-landing/index.ts','utf8'),/INTELLIGENCE_EXPERIENCE_RELEASED=false/)
assert.match(fs.readFileSync('src/features/legal/legalCopy.ts','utf8'),/INTELLIGENCE_NOTICE_RELEASED=false/)
assert.match(sql,/intelligence_enabled boolean NOT NULL DEFAULT false/)
const base='98f6d599b622803bcf495d8f6d3fa0e0d8490f69'
const mutableMarketing=new Set(['behaviorRuntime.ts','behavior.test.mjs','BehaviorPanel.tsx','BehaviorPanel.css','useBehaviorObservation.ts','preregRuntime.ts'])
const paths=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('src/features/feed/')||p.startsWith('src/features/supporter/')||p.startsWith('src/features/admin/')||p.startsWith('src/features/auth/')||p.startsWith('supabase/migrations/')||p==='src/context/AuthContext.tsx'||p==='src/services/featureExperimentService.ts'||p.startsWith('src/features/validation/')||p.startsWith('src/components/validation/')||p.endsWith('/CommunityFutureGate.tsx')||p.endsWith('/PlacesWorkspace.tsx')||p.startsWith('src/features/pwa/')&&!p.endsWith('/PazoInstallControl.tsx')||p.startsWith('src/features/marketing/')&&!mutableMarketing.has(p.split('/').at(-1)))
const digest=b=>createHash('sha256').update(b.replaceAll('\r\n','\n')).digest('hex')
for(const p of paths)assert.equal(digest(fs.readFileSync(p,'utf8')),digest(execFileSync('git',['show',base+':'+p],{encoding:'utf8',maxBuffer:5e6})),p+' must preserve released behavior')
const matrix=JSON.parse(fs.readFileSync('docs/product-intelligence/EVENT_COVERAGE_MATRIX.json','utf8'))
assert.ok(matrix.controls.length>=639)
assert.ok(matrix.controls.every(c=>!['PROPOSED','NEEDS_REVIEW'].includes(c.status)&&c.reason&&c.source&&c.test))
fs.mkdirSync('artifacts/issue153',{recursive:true})
const result={status:'PASS',protectedFiles:paths.length,catalogTasks:Object.keys(catalog.intelligenceTasks).length,anonymousSignals:catalog.anonymousSignals.length,classifiedControls:matrix.controls.length,unclassified:0,base,hostedWrites:0}
fs.writeFileSync('artifacts/issue153/contract.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
