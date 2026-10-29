// Source inventory, not runtime autocapture. Never reads user/browser data.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import ts from 'typescript'
const out=process.env.PAZO_INTELLIGENCE_INVENTORY||'artifacts/issue153/inventory'
fs.mkdirSync(out,{recursive:true})
const files=[]
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.tsx')&&!/\/testing\//.test(p.replaceAll('\\','/')))files.push(p.replaceAll('\\','/'))}}
walk('src')
const controls=[],surfaces=[]
for(const file of files.sort()){
 const source=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 let ordinal=0
 const literal=node=>{const parts=[];function scan(n){if(ts.isJsxAttribute(n)&&!['aria-label','title','placeholder'].includes(n.name.getText(tree)))return;if(ts.isJsxText(n))parts.push(n.text.trim());else if(ts.isStringLiteral(n))parts.push(n.text);ts.forEachChild(n,scan)}scan(node);return parts.filter(Boolean).join(' / ').replace(/\s+/g,' ').slice(0,220)}
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(tree),native=['button','a','input','select','textarea','form','summary'].includes(tag)
   const attrs=node.attributes.properties.filter(ts.isJsxAttribute),handlers=attrs.filter(a=>/^on[A-Z]/.test(a.name.getText(tree)))
   if(native||handlers.length&&/on(Click|Submit|Open|Create|Save|Like|Join|Search|Download|Share|Interest)/.test(handlers.map(a=>a.name.getText(tree)).join(' '))){
    const handler=handlers.map(a=>`${a.name.getText(tree)}=${a.initializer?.getText(tree)||''}`).join(' | ').replace(/\s+/g,' ').slice(0,450)
    const labelAttribute=attrs.find(a=>['aria-label','title','placeholder'].includes(a.name.getText(tree)))
    const label=labelAttribute?literal(labelAttribute):ts.isJsxOpeningElement(node)?literal(node.parent):''
    const digest=createHash('sha256').update([file,tag,handler,label].join('\n')).digest('hex').slice(0,12)
    controls.push({id:`${digest}-${++ordinal}`,file,line:tree.getLineAndCharacterOfPosition(node.getStart(tree)).line+1,tag,definition:native?'native_control':'component_binding',label,handler,status:'NEEDS_REVIEW',task:null,source:null,identity:null,question:null,reason:null,priority:null,test:null})
   }
  }
  ts.forEachChild(node,visit)
 }
 visit(tree);surfaces.push({file,controls:ordinal,sha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex')})
}
fs.writeFileSync(out+'/controls.json',JSON.stringify({scope:'All runtime TSX source control definitions; repeated list items counted as one definition. No DOM/user capture.',surfaces,controls},null,2)+'\n')
const perFile=surfaces.filter(x=>x.controls).sort((a,b)=>b.controls-a.controls)
console.log(JSON.stringify({surfaces:surfaces.length,controlDefinitions:controls.length,native:controls.filter(x=>x.definition==='native_control').length,bindings:controls.filter(x=>x.definition==='component_binding').length,top:perFile.slice(0,15).map(({file,controls})=>({file,controls}))},null,2))
