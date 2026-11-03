import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {inflateSync} from 'node:zlib'
import {bytesToUrlBase64,detectPushEnvironment,urlBase64ToBytes} from './pushSupport.ts'
import {adminNotificationCopy,careNotificationTitle,formatNotificationTime,getNotificationAdminPetId,getNotificationCareId,getNotificationFollowerId,mapNotificationRow} from '../notifications/notificationSource.ts'

const android='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1'
const ready={platform:'Linux',maxTouchPoints:5,standalone:false,hasServiceWorker:true,hasPushManager:true,hasNotification:true,permission:'default'}

test('Android Chrome can activate without installing',()=>{
 assert.equal(detectPushEnvironment({...ready,userAgent:android}),'available')
 assert.equal(detectPushEnvironment({...ready,userAgent:android,permission:'denied'}),'denied')
})
test('iPhone needs the Home Screen app, whatever the browser reports',()=>{
 const safari={...ready,userAgent:iphone,platform:'iPhone',hasPushManager:false,hasNotification:false,permission:null}
 assert.equal(detectPushEnvironment(safari),'ios-needs-install')
 assert.equal(detectPushEnvironment({...safari,hasPushManager:true,hasNotification:true,permission:'default',standalone:true}),'available')
 assert.equal(detectPushEnvironment({...ready,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.1 Safari/605.1.15',platform:'MacIntel'}),'ios-needs-install')
})
test('ad traffic inside Instagram or Facebook is sent to a real browser, even on iPhone',()=>{
 for(const suffix of [' Instagram 350.0',' [FBAN/FBIOS;FBAV/480.0]',' [FB_IAB/FB4A;FBAV/480.0]'])
  assert.equal(detectPushEnvironment({...ready,userAgent:iphone+suffix}),'in-app-browser')
 assert.equal(detectPushEnvironment({...ready,userAgent:'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}),'in-app-browser')
})
test('a desktop without the APIs simply offers nothing',()=>{
 assert.equal(detectPushEnvironment({...ready,userAgent:'Mozilla/5.0 (X11; Linux x86_64)',maxTouchPoints:0,hasPushManager:false}),'unsupported')
})
test('key encoding round-trips',()=>{
 const key='BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
 assert.equal(bytesToUrlBase64(urlBase64ToBytes(key).buffer),key)
 assert.equal(bytesToUrlBase64(null),'')
})
test('the bell shows real time and opens care reminders by their typed source',()=>{
 const now=Date.parse('2026-11-01T12:00:00Z')
 assert.match(formatNotificationTime('2026-11-01T11:55:00Z','es',now),/5 minutos/)
 assert.match(formatNotificationTime('2026-11-01T09:00:00Z','en',now),/3 hours ago/)
 assert.match(formatNotificationTime('2026-10-30T12:00:00Z','en',now),/2 days ago/)
 assert.equal(formatNotificationTime('not a date','es',now),'')
 const row={id:'1',type:'care_reminder',title:'t',body:'Vacuna',read_at:null,created_at:'2026-11-01',pet_id:null,source_id:'care-1'}
 const mapped=mapNotificationRow(row)
 assert.equal(mapped.category,'cuidados')
 assert.equal(getNotificationCareId(mapped),'care-1')
 assert.equal(getNotificationCareId(mapNotificationRow({...row,type:'sighting'})),null)
 assert.equal(careNotificationTitle('en'),'Care reminder')
})
test('only the typed administrator notice opens a pet profile',()=>{
 const row={id:'1',type:'admin_new_pet',title:'t',body:'b',read_at:null,created_at:'2026-11-01',pet_id:'pet-1',source_id:null}
 assert.equal(getNotificationAdminPetId(mapNotificationRow(row)),'pet-1')
 assert.equal(getNotificationAdminPetId(mapNotificationRow({...row,type:'sighting'})),null)
 assert.equal(getNotificationAdminPetId(mapNotificationRow({...row,type:'admin_new_account',pet_id:null})),null)
 assert.equal(adminNotificationCopy('admin_new_account','en').title,'New account on PAZO')
 assert.equal(adminNotificationCopy('sighting','es'),null)
})
test('a follower notice opens the follower, and only that typed notice does',()=>{
 const row={id:'1',type:'new_follower',title:'t',body:'b',read_at:null,created_at:'2026-11-02',pet_id:'mine',source_id:'follower'}
 assert.equal(getNotificationFollowerId(mapNotificationRow(row)),'follower')
 assert.equal(getNotificationFollowerId(mapNotificationRow({...row,type:'sighting'})),null)
 assert.equal(adminNotificationCopy('new_follower','en').title,'You have a new follower')
})
test('closing the bell clears notices without silencing what must be opened',()=>{
 const source=readFileSync(new URL('../notifications/markSeen.ts',import.meta.url),'utf8')
 const types=source.match(/SEEN_ON_CLOSE_TYPES = \[([^\]]+)\]/)[1]
 for(const type of ['admin_new_account','admin_new_pet','care_reminder','community_join','new_follower'])assert.ok(types.includes(type),type)
 assert.doesNotMatch(types,/sighting|supporter/)
 assert.match(source,/\.is\('read_at', null\)/)
 assert.match(readFileSync(new URL('../../App.tsx',import.meta.url),'utf8'),/onClose=\{handleCloseNotifications\}/)
})
test('the service worker opens the bell and never follows a URL from a message',()=>{
 const sw=readFileSync(new URL('../../../public/sw.js',import.meta.url),'utf8')
 assert.match(sw,/addEventListener\('push'/)
 assert.match(sw,/showNotification/)
 assert.match(sw,/openWindow\('\/\?open=notifications'\)/)
 assert.doesNotMatch(sw,/data\.url|caches\.|localStorage/)
})
test('the Android status-bar icon is a transparent white paw, not the opaque app icon',()=>{
 const sw=readFileSync(new URL('../../../public/sw.js',import.meta.url),'utf8')
 assert.match(sw,/badge: '\/pwa-badge-96\.png'/)
 const png=readFileSync(new URL('../../../public/pwa-badge-96.png',import.meta.url))
 assert.equal(png.readUInt32BE(16),96)
 const idat=png.indexOf('IDAT')
 const raw=inflateSync(png.subarray(idat+4,idat+4+png.readUInt32BE(idat-4)))
 const alpha=(x,y)=>raw[y*(1+96*4)+1+x*4+3]
 assert.equal(alpha(0,0),0,'corners stay transparent')
 assert.equal(alpha(95,95),0,'corners stay transparent')
 let solid=0
 for(let y=0;y<96;y++)for(let x=0;x<96;x++)if(alpha(x,y)===255)solid++
 assert.ok(solid>96*96*0.2&&solid<96*96*0.6,'a recognizable silhouette, not a square')
})
test('signing out releases the device on every normal path',()=>{
 for(const file of ['../../context/AuthContext.tsx','../../components/views/PetView.tsx']){
  const source=readFileSync(new URL(file,import.meta.url),'utf8')
  assert.match(source,/await releasePushForSignOut\(\)\s+await supabase\.auth\.signOut\(\)/,file)
 }
})
