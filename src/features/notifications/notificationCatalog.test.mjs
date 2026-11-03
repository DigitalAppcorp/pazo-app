import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {NOTIFICATION_KINDS,describeNotification} from './notificationCatalog.ts'
import {mapNotificationRow} from './notificationSource.ts'
import {pushMessage} from '../../../supabase/functions/pazo-push-worker/workerCore.mjs'

const migrationsDir=new URL('../../../supabase/migrations/',import.meta.url)
const migrations=readdirSync(migrationsDir).filter(name=>name.endsWith('.sql')).sort()
  .map(name=>readFileSync(new URL(name,migrationsDir),'utf8'))
// The most recent migration that redefines a constraint is the one in force.
const latestList=(pattern)=>{
  let found=null
  for(const sql of migrations)for(const match of sql.matchAll(pattern))found=match[1]
  assert.ok(found,'constraint not found: '+pattern)
  return [...found.matchAll(/'([a-z_]+)'/g)].map(m=>m[1])
}
const notificationTypes=latestList(/notifications_type_check\s+check\s*\(\s*type\s*=\s*any\s*\(\s*array\[([^\]]+)\]/gi)
const pushKinds=latestList(/outbox_kind_check\s+check\s*\(\s*kind\s+in\s*\(([^)]+)\)/gi)
const catalogTypes=Object.keys(NOTIFICATION_KINDS)

const uuid='0f8fad5b-d9cb-469f-a165-70867728950e'
const row=(type,extra={})=>mapNotificationRow({id:'n1',type,title:'Stored title',body:'Stored body',read_at:null,created_at:'2026-11-03',pet_id:null,source_id:null,...extra})

test('every notification type the database allows has a catalog entry, and only those',()=>{
  assert.deepEqual([...catalogTypes].sort(),[...notificationTypes].sort())
})

test('every push kind is a notification type with a catalog entry and fixed worker copy',()=>{
  for(const kind of pushKinds){
    assert.ok(notificationTypes.includes(kind),kind)
    assert.ok(catalogTypes.includes(kind),kind)
    assert.ok(pushMessage(kind,'es','x'),kind)
  }
})

test('the Vigilante templates are reserved until their types exist',()=>{
  for(const [type,kind] of Object.entries(NOTIFICATION_KINDS))
    assert.ok(kind.template==='info'||kind.template==='open',type)
})

test('an unknown type is a plain notice that cannot be opened',()=>{
  const view=describeNotification(row('something_new',{source_id:uuid,pet_id:'pet-1'}),'es')
  assert.deepEqual(view,{title:'Stored title',subtitle:'Stored body',template:'info',icon:'bell',tone:'neutral',action:null,target:null})
})

test('a sighting opens the sighting and is highlighted only while it can be opened',()=>{
  assert.deepEqual(describeNotification(row('sighting',{source_id:'s1'}),'es'),
    {title:'Stored title',subtitle:'Stored body',template:'open',icon:'chat',tone:'highlight',action:null,target:{kind:'sighting',sightingId:'s1'}})
  const orphan=describeNotification(row('sighting'),'es')
  assert.equal(orphan.target,null)
  assert.equal(orphan.icon,'bell')
  assert.equal(orphan.tone,'neutral')
})

test('a community join opens that community',()=>{
  const view=describeNotification(row('community_join',{source_id:'c1'}),'en')
  assert.deepEqual(view.target,{kind:'community',communityId:'c1'})
  assert.equal(view.icon,'community')
  assert.equal(view.tone,'highlight')
  assert.equal(describeNotification(row('community_join'),'en').icon,'bell')
})

test('a care reminder keeps the calendar and its fixed title even without a reference',()=>{
  const view=describeNotification(row('care_reminder',{source_id:'care-1'}),'en')
  assert.equal(view.title,'Care reminder')
  assert.equal(view.subtitle,'Stored body')
  assert.deepEqual(view.target,{kind:'care',careId:'care-1'})
  const orphan=describeNotification(row('care_reminder'),'es')
  assert.equal(orphan.target,null)
  assert.equal(orphan.icon,'calendar')
  assert.equal(orphan.tone,'care')
})

test('follower and new-pet notices open a profile with fixed copy; new accounts open nothing',()=>{
  const follower=describeNotification(row('new_follower',{pet_id:'mine',source_id:'follower'}),'en')
  assert.equal(follower.title,'You have a new follower')
  assert.deepEqual(follower.target,{kind:'pet_profile',petId:'follower'})
  const pet=describeNotification(row('admin_new_pet',{pet_id:'pet-1'}),'es')
  assert.equal(pet.title,'Nueva mascota en PAZO')
  assert.deepEqual(pet.target,{kind:'pet_profile',petId:'pet-1'})
  const account=describeNotification(row('admin_new_account',{pet_id:'pet-1',source_id:uuid}),'en')
  assert.equal(account.title,'New account on PAZO')
  assert.equal(account.target,null)
  assert.equal(account.template,'info')
})

test('supporter notices open the supporter screen only with a valid reference',()=>{
  const verified=describeNotification(row('supporter_verified',{source_id:uuid}),'es')
  assert.deepEqual(verified.target,{kind:'supporter'})
  assert.equal(verified.action,'Revisar mis beneficios')
  assert.equal(verified.title,'¡Ya eres Amigo de PAZO!')
  const campaign=describeNotification(row('supporter_campaign',{source_id:uuid}),'en')
  assert.equal(campaign.action,'View my participation')
  const invalid=describeNotification(row('supporter_campaign',{source_id:'not-a-uuid'}),'es')
  assert.equal(invalid.target,null)
  assert.equal(invalid.action,null)
  assert.equal(invalid.title,'Stored title')
})

test('the welcome notice names the pet inside the app and opens its edit form',()=>{
  const petName=id=>id==='pet-1'?'Max':undefined
  const view=describeNotification(row('welcome',{pet_id:'pet-1'}),'es',{petName})
  assert.equal(view.title,'Te damos la bienvenida a PAZO')
  assert.match(view.subtitle,/Cuéntanos más de Max/)
  assert.equal(view.action,'Completar el perfil de Max')
  assert.deepEqual(view.target,{kind:'pet_edit',petId:'pet-1'})
  assert.equal(view.icon,'paw')
  const unknownPet=describeNotification(row('welcome',{pet_id:'gone'}),'en',{petName})
  assert.match(unknownPet.subtitle,/your pet/)
  assert.equal(unknownPet.action,'Complete the profile')
  assert.equal(describeNotification(row('welcome'),'es').target,null)
})

test('the welcome notice is in-app only and created once per account',()=>{
  assert.ok(!pushKinds.includes('welcome'))
  const sql=readFileSync(new URL('20261103202000_pazo_welcome_notification.sql',migrationsDir),'utf8')
  assert.match(sql,/not exists\(select 1 from public\.notifications n where n\.user_id=new\.owner_id and n\.type='welcome'\)/)
  assert.match(sql,/exception when others then/)
  assert.match(sql,/select distinct on \(p\.owner_id\)/)
  assert.match(readFileSync(new URL('./markSeen.ts',import.meta.url),'utf8'),/'welcome'\] as const/)
})

test('the bell and the app take every decision from the catalog',()=>{
  const modal=readFileSync(new URL('../../components/modals/NotificationsModal.tsx',import.meta.url),'utf8')
  const app=readFileSync(new URL('../../App.tsx',import.meta.url),'utf8')
  for(const source of [modal,app]){
    assert.match(source,/describeNotification\(/)
    assert.doesNotMatch(source,/getNotification(Sighting|Community|Care|AdminPet|Follower)Id|isSupporterNotification|adminNotificationCopy/)
  }
})
