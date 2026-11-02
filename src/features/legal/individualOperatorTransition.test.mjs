import test from 'node:test'
import assert from 'node:assert/strict'
import {legalPreview,resolveLegalCopy} from './legalCopy.ts'
const approved={VITE_PAZO_INDIVIDUAL_OPERATOR_TRANSFER_APPROVED:'true',VITE_PAZO_INDIVIDUAL_OPERATOR_EFFECTIVE_DATE:'2026-11-05'}
for(const lang of ['es','en'])for(const kind of ['privacy','terms']){
 test(kind+' '+lang+': existing published copy stays unchanged without approved transition',()=>{
   assert.deepEqual(resolveLegalCopy(kind,lang,null,{}),legalPreview[kind][lang])
   assert.deepEqual(resolveLegalCopy(kind,lang,null,{VITE_PAZO_INDIVIDUAL_OPERATOR_EFFECTIVE_DATE:'2026-11-05'}),legalPreview[kind][lang])
   assert.deepEqual(resolveLegalCopy(kind,lang,null,{...approved,VITE_PAZO_INDIVIDUAL_OPERATOR_EFFECTIVE_DATE:'invalid'}),legalPreview[kind][lang])
 })
 test(kind+' '+lang+': stage individual identity only after both explicit gates',()=>{
   const draft=resolveLegalCopy(kind,lang,null,approved)
   assert.match(draft.introduction,/2026-11-05/)
   const operator=draft.sections.find(s=>s.heading===(lang==='es'?(kind==='privacy'?'Responsable de PAZO':'Operador del servicio'):(kind==='privacy'?'PAZO operator':'Service operator')))
   assert.ok(operator)
   assert.match(operator.text,/Brandon Estuardo Alvarado Vasquez/)
   assert.doesNotMatch(operator.text,/Alvarado Solutions LLC/)
   assert.match(operator.text,lang==='es'?/persona física/:/an individual/)
   assert.match(draft.alert,/2026-11-05/)
   assert.equal(draft.sections.length,legalPreview[kind][lang].sections.length+(kind==='privacy'?1:0))
   assert.ok(legalPreview[kind][lang].sections.some(s=>s.text.includes('Alvarado Solutions LLC')))
 })
}
