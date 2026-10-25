import test from 'node:test'
import assert from 'node:assert/strict'
import {supporterNotificationCopy,isSupporterNotification} from '../../../src/features/notifications/supporterNotification.ts'
import {mapNotificationRow} from '../../../src/features/notifications/notificationSource.ts'
const base={id:'82000000-0000-4000-8000-000000000002',sourceId:'82000000-0000-4000-8000-000000000003',sourceType:'supporter_campaign',title:'Stored title',subtitle:'Stored body',category:'todas',read:false,timeAgo:'Reciente'}
test('historical invitation thread and public reminder use current voluntary copy without commercial restrictions',()=>{
 for(const supporterState of ['invited','waiting','slot_granted','expired','declined']){
  const es=supporterNotificationCopy({...base,supporterState},'es'),en=supporterNotificationCopy({...base,supporterState},'en')
  assert.notEqual(es.title,en.title);assert.match(es.subtitle,/sigue siendo gratis/);assert.match(en.subtitle,/stays free/)
 }
 assert.doesNotMatch(supporterNotificationCopy({...base,supporterState:'slot_granted'},'es').title,/cupo/)
})
test('original review_v1 remains available; future thanks_v2 never rewrites its copy',()=>{
 const original=supporterNotificationCopy({...base,sourceType:'supporter_verified',supporterCopyVersion:'review_v1'},'es')
 assert.match(original.subtitle,/experiencia excelente/);assert.match(original.subtitle,/revisarlos/)
 const next=supporterNotificationCopy({...base,sourceType:'supporter_verified',supporterCopyVersion:'thanks_v2'},'es')
 assert.notEqual(original.subtitle,next.subtitle)
 assert.deepEqual(supporterNotificationCopy({...base,sourceType:'supporter_verified'},'es'),original)
})
test('untyped or malformed sources never navigate to the membership flow',()=>{
 assert.equal(isSupporterNotification({...base,sourceId:'-'.repeat(36)}),false)
 assert.equal(isSupporterNotification({...base,sourceType:'system'}),false)
 assert.deepEqual(supporterNotificationCopy({...base,sourceType:'system'},'en'),{title:base.title,subtitle:base.subtitle})
})
test('notification projection retains state and copy version for the inbox, without financial IDs',()=>{
 const n=mapNotificationRow({id:base.id,type:'supporter_campaign',title:'t',body:'b',created_at:'2026-10-23',read_at:null,pet_id:null,source_id:base.sourceId,supporter_state:'slot_granted',supporter_copy_version:'review_v1'})
 assert.equal(n.supporterState,'slot_granted');assert.equal(n.supporterCopyVersion,'review_v1');assert.equal(n.read,false)
})
