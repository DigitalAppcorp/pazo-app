import fs from 'node:fs/promises'
import path from 'node:path'
const root=process.argv[2]
const read=async name=>JSON.parse((await fs.readFile(path.join(root,name),'utf8')).replace(/^\uFEFF/,''))
const readSource=async name=>JSON.parse((await fs.readFile(path.join(process.argv[3]||root,name),'utf8')).replace(/^\uFEFF/,''))
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b))
const source=await readSource('source-catalog.private.json'),restored=await read('restored-catalog.private.json')
const extraSource=await readSource('source-extra.private.json'),extraRestored=await read('restored-extra.private.json')
const differences=[]
for(const key of Object.keys(source).filter(k=>!['tables','database'].includes(k))){if(!equal(source[key],restored[key]))differences.push(key)}
const tableDifferences=[]
const tableKey=t=>`${t.nspname}.${t.relname}`
const left=new Map(source.tables.map(t=>[tableKey(t),t.evidence])),right=new Map(restored.tables.map(t=>[tableKey(t),t.evidence]))
for(const key of new Set([...left.keys(),...right.keys()]))if(left.get(key)!==right.get(key))tableDifferences.push(key)
const databaseDifferences=[]
for(const key of Object.keys(source.database)){
 let a=source.database[key],b=restored.database[key]
 if(key==='acl'){
  const acl=v=>v==null?v:v.slice(1,-1).split(',').sort()
  a=acl(a);b=acl(b)
 }
 if(!equal(a,b))databaseDifferences.push(key)
}
const extraDifferences=[]
for(const key of Object.keys(extraSource))if(!equal(extraSource[key],extraRestored[key]))extraDifferences.push(key)
const hasDefinitions=await fs.stat(path.join(root,'source-definitions.private.json')).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e})
const definitionDifferences=[]
if(hasDefinitions){
 const sourceDefinitions=await read('source-definitions.private.json'),restoredDefinitions=await read('restored-definitions.private.json')
 for(const key of Object.keys(sourceDefinitions))if(!equal(sourceDefinitions[key],restoredDefinitions[key]))definitionDifferences.push(key)
}
const result={catalogDifferences:differences,tableSequenceDifferences:tableDifferences,databaseDifferences,extraDifferences,definitionDifferences,definitionComparison:hasDefinitions?'CHECKED':'NOT_REQUESTED',
 tablesAndSequences:source.tables.length,functions:source.functions,policies:source.policies,constraints:source.constraints,triggers:source.triggers,
 extensions:source.extensions.length,p42SourceRows:extraSource.p42_rows,p42RestoredRows:extraRestored.p42_rows,vaultRowsPreserved:extraSource.vault_rows===extraRestored.vault_rows,
 result:differences.length+tableDifferences.length+databaseDifferences.length+extraDifferences.length+definitionDifferences.length===0?'PASS':'DIFFERENCES_REQUIRE_REVIEW'}
await fs.writeFile(path.join(root,'comparison-summary.private.json'),JSON.stringify(result,null,2))
console.log(JSON.stringify(result))
if(result.result!=='PASS')process.exitCode=1
