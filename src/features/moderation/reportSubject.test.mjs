import test from 'node:test'
import assert from 'node:assert/strict'
import {describeReportSubject,reportTargetShortId} from './reportSubject.ts'
test('distinct posts by same author have distinct labels',()=>{
 assert.notEqual(describeReportSubject('feed_post','Pancho','publicación nueva','es'),describeReportSubject('feed_post','Pancho','publicación vieja','es'))
})
test('all five report targets are readable in both languages',()=>{
 for(const kind of ['feed_post','feed_comment','pet_profile','community_post','community_comment']){
  assert.ok(describeReportSubject(kind,'Pancho','contenido','es').length>5)
  assert.ok(describeReportSubject(kind,'Pancho','content','en').length>5)
 }
 assert.equal(describeReportSubject('pet_profile','Pancho','no debe salir','es'),'Perfil · Pancho')
})
test('whitespace, long content and immutable ID suffix',()=>{
 const label=describeReportSubject('community_comment','Daisy',' uno\n dos '+ 'x'.repeat(180),'es')
 assert.ok(label.includes('uno dos'));assert.ok(label.endsWith('…»'))
 assert.ok(label.length<150)
 assert.match(describeReportSubject('community_post',null,'','en'),/no text/)
 assert.equal(reportTargetShortId('2158592e-627e-4ff1-af17-82db400a487d'),'400a487d')
})
