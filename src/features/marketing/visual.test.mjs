import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source=fs.readFileSync(new URL('./visualSummary.ts',import.meta.url),'utf8')
const fixture=JSON.parse(fs.readFileSync(new URL('../../../supabase/tests/marketing/visual-synthetic.json',import.meta.url),'utf8'))
const catalog=['all','perfil_es','perfil_en','qr_es','qr_en','comunidad_es','comunidad_en']
let answer,calls=[]
const module={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:name=>name.includes('supabaseClient')?{supabase:{rpc:(name,args)=>{calls.push({name,args});return{abortSignal:async()=>answer}}}}:{creatives:catalog},Error,AbortSignal})
const {parseVisualSummary,visualScope,adminVisualSummary,largestFunnelGap,displayVisualCount}=module.exports
const clone=()=>structuredClone(fixture)
test('accepts the real synthetic PostgreSQL envelope and keeps units',()=>{const r=parseVisualSummary(clone());assert.equal(r.totals.accounts,120);assert.equal(r.landing_requests,1280);assert.equal(r.segments.unknown,40);assert.equal(r.funnel[0].accounts,80)})
for(const value of [1,9,-1,NaN,Infinity,'120'])test('rejects unsafe or coerced account count '+String(value),()=>{const r=clone();r.totals.accounts=value;assert.throws(()=>parseVisualSummary(r))})
for(const [key,value]of [['days','14'],['days',30],['version',2],['timezone','America/Guatemala'],['segment','organic'],['creative','email@example.com'],['audience','new']])test('rejects unsupported scope '+key+':'+value,()=>{const r=clone();r[key]=value;assert.throws(()=>parseVisualSummary(r))})
for(const family of ['last_steps','moves','return_modules','creatives'])test('rejects duplicate '+family,()=>{const r=clone();r[family].push({...r[family][0]});assert.throws(()=>parseVisualSummary(r))})
test('rejects owner IDs or unexpected nested fields',()=>{const r=clone();r.owner_id='not-for-the-report';assert.throws(()=>parseVisualSummary(r));delete r.owner_id;r.moves[0].owner='not-for-the-report';assert.throws(()=>parseVisualSummary(r))})
test('rejects an unrecognized screen or a self-transition',()=>{const r=clone();r.moves[0].to='private_medical_document';assert.throws(()=>parseVisualSummary(r));r.moves[0].to=r.moves[0].from;assert.throws(()=>parseVisualSummary(r))})
test('rejects a funnel assembled from incompatible cohorts',()=>{const r=clone();r.funnel[2].accounts=90;assert.throws(()=>parseVisualSummary(r));r.funnel[2].accounts=55;assert.throws(()=>parseVisualSummary(r))})
test('rejects a hidden small complementary cohort',()=>{const r=clone();r.totals.returning=119;assert.throws(()=>parseVisualSummary(r));r.totals.returning=120;r.creatives[0].pet=r.creatives[0].verified-1;assert.throws(()=>parseVisualSummary(r))})
test('a protected gap is null, never coerced to zero',()=>{const r=clone();r.trend[3].accounts=null;r.trend[3].returning=null;assert.equal(parseVisualSummary(r).trend[3].accounts,null)})
test('rejects unordered, duplicated or incomplete dates',()=>{const r=clone();r.trend.reverse();assert.throws(()=>parseVisualSummary(r));r.trend.reverse();r.trend[1].day=r.trend[0].day;assert.throws(()=>parseVisualSummary(r));r.trend.pop();assert.throws(()=>parseVisualSummary(r))})
test('rejects a zero creative denominator',()=>{const r=clone();Object.assign(r.creatives[0],{verified:0,pet:0,viewed:0,useful:0});assert.throws(()=>parseVisualSummary(r))})
test('zero is accepted when actually reported in a qualified cohort',()=>{const r=clone();r.totals.useful=0;assert.equal(parseVisualSummary(r).totals.useful,0)})
test('organic is not silently treated as unattributed',()=>{assert.throws(()=>visualScope('organic'));assert.equal(visualScope('unknown').segment,'unknown');assert.equal(visualScope('returning').audience,'returning')})
test('insight selects the largest observed gap, breaking ties by proportion',()=>{assert.equal(largestFunnelGap(fixture.funnel).from,2);const r=clone();r.funnel[1].accounts=20;r.funnel[2].accounts=20;r.funnel[3].accounts=20;assert.equal(largestFunnelGap(r.funnel).from,0);assert.equal(largestFunnelGap([]),null)})
test('read RPC binds its closed scope and never starts an MFA challenge',async()=>{answer={data:clone(),error:null};calls=[];const r=await adminVisualSummary(14,'all','all',new AbortController().signal);assert.equal(r.totals.accounts,120);assert.equal(calls.length,1);assert.equal(calls[0].name,'pazo_admin_visual_summary_v1');assert.equal(calls[0].args.p_audience,'all')})
test('rejects a response for another filter/window',async()=>{answer={data:clone(),error:null};await assert.rejects(adminVisualSummary(7,'all','all',new AbortController().signal),/scope mismatch/);await assert.rejects(adminVisualSummary(14,'ads','all',new AbortController().signal),/scope mismatch/)})
test('admin denial remains denial; no authenticator detour',async()=>{answer={data:null,error:{code:'42501'}};await assert.rejects(adminVisualSummary(14,'all','all',new AbortController().signal),/admin_required/)})
test('large values have a readable compact presentation; null stays unknown',()=>{assert.equal(displayVisualCount(120,'es'),'120');assert.equal(displayVisualCount(null,'es'),'—');assert.equal(displayVisualCount(1200000,'en'),'1.2M')})
