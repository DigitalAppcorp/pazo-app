import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import ts from 'typescript'
const base='ee10cd98',read=p=>fs.readFileSync(p,'utf8'),released=p=>execFileSync('git',['show',base+':'+p],{encoding:'utf8',maxBuffer:5e6})
const hash=s=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex')
const allowed=new Set(['src/features/admin/components/AdminDashboard.tsx','src/features/admin/testing/adminDashboard.test.mjs','src/features/admin/testing/adminMarketingDashboard.test.mjs','src/features/marketing/BehaviorPanel.tsx','src/features/marketing/IntelligencePanel.tsx','src/features/marketing/behaviorSummary.ts','src/features/marketing/intelligenceSummary.ts'])
const paths=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>p.startsWith('src/')&&!allowed.has(p)||p.startsWith('supabase/migrations/')||p.startsWith('supabase/functions/'))
for(const p of paths)assert.equal(hash(read(p)),hash(released(p)),p+' must preserve released behavior')
// Keep the native controller, effects, auth, operations and focus trap intact.
const controller=s=>{const f=ts.createSourceFile('AdminDashboard.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const n=f.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='AdminDashboard');assert.ok(n?.body);const printer=ts.createPrinter({removeComments:true});return n.body.statements.filter(n=>!ts.isReturnStatement(n)).map(n=>printer.printNode(ts.EmitHint.Unspecified,n,f)).join('\n')}
assert.equal(hash(controller(read('src/features/admin/components/AdminDashboard.tsx'))),hash(controller(released('src/features/admin/components/AdminDashboard.tsx'))),'native controller changed outside return JSX')
const responsiveTest='src/features/admin/testing/adminDashboard.test.mjs'
const expectedResponsiveTest=released(responsiveTest).replace("assert.ok(board.includes('overflow-x-auto'),'Small-screen tabs remain accessible')","assert.ok(board.includes('id=\"pazo-admin-section\"')&&board.includes('onChange={e=>selectSection(e.target.value as Section)}'),'Native mobile selector exposes every section without clipped horizontal tabs')")
assert.equal(hash(read(responsiveTest)),hash(expectedResponsiveTest),'Only the obsolete clipped-tabs assertion may change')
const marketingTest='src/features/admin/testing/adminMarketingDashboard.test.mjs'
assert.equal(hash(read(marketingTest)),hash(released(marketingTest).replace("(section!=='behavior'&&)?loading","(section!=='behavior'&&)?(section!=='summary'&&)?loading").replace("(section!=='behavior'&&)?error","(section!=='behavior'&&)?(section!=='summary'&&)?error")),'Only summary loading independence assertions may change')
for(const p of ['src/features/marketing/BehaviorPanel.tsx','src/features/marketing/IntelligencePanel.tsx','src/features/marketing/ExecutiveAnalytics.tsx'])assert.doesNotMatch(read(p),/AdminPaypalMfaStepUp|auth\.mfa\./)
const manifest=JSON.parse(read('docs/admin-visual/PREPARED_MIGRATIONS.json'))
assert.equal(manifest.status,'PREPARED_NOT_DEPLOYED');assert.equal(manifest.productionPushAllowed,false);assert.equal(manifest.collectionChanges,false)
assert.deepEqual(manifest.records.map(r=>r.version),['20261029120000','20261029121000'])
for(const r of manifest.records){assert.equal(r.hostedVersion,null);assert.equal(hash(read(r.path)),r.sha256NormalizedLF)}
const projection=read(manifest.records[1].path)
assert.doesNotMatch(projection,/\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\s+(INTO|FROM|TABLE|FUNCTION|SCHEMA|marketing_private\.)/i)
assert.match(projection,/IF NOT public\.pazo_is_admin\(\) THEN/)
assert.match(projection,/SECURITY DEFINER[\s\S]*SET search_path=''/)
assert.match(projection,/REVOKE ALL[\s\S]*FROM PUBLIC,anon,authenticated,service_role/)
assert.match(projection,/GRANT EXECUTE[\s\S]*TO authenticated/)
assert.ok(/INTELLIGENCE_COLLECTION_ENABLED\s*=\s*true/.test(read('src/features/marketing/intelligenceCatalog.ts')),'Preserve the already released collection setting')
const result={status:'PASS',protectedFiles:paths.length,base,controller:'unchanged outside return JSX',collection:'released settings preserved',migrations:'two prepared read-only/access projections',hostedWrites:0}
fs.mkdirSync('artifacts/admin-visual',{recursive:true});fs.writeFileSync('artifacts/admin-visual/contract.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
