import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {encryptPayload,fromBase64Url,toBase64Url,vapidAuthorization,generateVapidKeys,publicJwk} from '../_shared/webPush.mjs'
import {classifyStatus,createPushWorker,pushMessage} from './workerCore.mjs'

test('payload encryption matches the RFC 8291 appendix A vector',async()=>{
  const asPublic=fromBase64Url('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8')
  const jwk={...publicJwk(asPublic),d:'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'}
  const algorithm={name:'ECDH',namedCurve:'P-256'}
  const serverKeys={
    privateKey:await crypto.subtle.importKey('jwk',jwk,algorithm,false,['deriveBits']),
    publicKey:await crypto.subtle.importKey('raw',asPublic,algorithm,true,[]),
  }
  const message=await encryptPayload({
    plaintext:'When I grow up, I want to be a watermelon',
    p256dh:'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    auth:'BTBZMqHH6r4Tts7J_aSIgg',
    serverKeys,
    salt:fromBase64Url('DGv6ra1nlYgDCS1FRnbzlw'),
  })
  assert.equal(toBase64Url(message),'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN')
})

test('the VAPID token verifies against the published key and targets the push service',async()=>{
  const keys=await generateVapidKeys()
  const header=await vapidAuthorization({endpoint:'https://fcm.googleapis.com/fcm/send/abc',publicKey:keys.publicKey,privateJwk:keys.privateJwk,subject:'mailto:a@b.c',nowSeconds:1000})
  const [,token,key]=header.match(/^vapid t=([^,]+), k=(.+)$/)
  assert.equal(key,keys.publicKey)
  const [head,claims,signature]=token.split('.')
  const parsed=JSON.parse(new TextDecoder().decode(fromBase64Url(claims)))
  assert.deepEqual(parsed,{aud:'https://fcm.googleapis.com',exp:1000+43200,sub:'mailto:a@b.c'})
  const verifier=await crypto.subtle.importKey('raw',fromBase64Url(keys.publicKey),{name:'ECDSA',namedCurve:'P-256'},false,['verify'])
  assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verifier,fromBase64Url(signature),new TextEncoder().encode(head+'.'+claims)),true)
})

test('lock-screen copy is fixed per kind and language',()=>{
  assert.match(JSON.parse(pushMessage('sighting','en','x').payload).title,/saw your pet/)
  assert.match(JSON.parse(pushMessage('sighting','es','x').payload).title,/vio a tu mascota/)
  assert.equal(pushMessage('supporter_campaign','es','x'),null)
})

test('response codes decide whether to retry, drop the device or give up',()=>{
  assert.equal(classifyStatus(201),'ok')
  assert.equal(classifyStatus(410),'gone')
  assert.equal(classifyStatus(404),'gone')
  assert.equal(classifyStatus(429),'retry')
  assert.equal(classifyStatus(503),'retry')
  assert.equal(classifyStatus(403),'failed')
})

const subscriberKeys=async()=>{
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits'])
  return {p256dh:toBase64Url(await crypto.subtle.exportKey('raw',pair.publicKey)),auth:toBase64Url(crypto.getRandomValues(new Uint8Array(16)))}
}
const request=()=>new Request('https://x.test/',{method:'POST',headers:{authorization:'Bearer token'}})

test('a refused token stops before keys, the queue or any device',async()=>{
  const calls=[]
  const worker=createPushWorker({rpc:async name=>{calls.push(name);return false},fetchImpl:()=>assert.fail('no send'),subject:'mailto:a@b.c'})
  assert.equal((await worker(request())).status,401)
  assert.deepEqual(calls,['pazo_push_worker_admit'])
  assert.equal((await worker(new Request('https://x.test/'))).status,405)
})

test('delivery results reach the report, and only allowed hosts are contacted',async()=>{
  const keys=await subscriberKeys(),vapid=await generateVapidKeys()
  const subs=[
    {id:'ok',endpoint:'https://fcm.googleapis.com/fcm/send/ok',lang:'es',...keys},
    {id:'gone',endpoint:'https://web.push.apple.com/gone',lang:'en',...keys},
    {id:'busy',endpoint:'https://updates.push.services.mozilla.com/busy',lang:'es',...keys},
    {id:'evil',endpoint:'https://internal.example.com/x',lang:'es',...keys},
  ]
  const contacted=[];let report=null
  const rpc=async(name,args)=>{
    if(name==='pazo_push_worker_admit')return true
    if(name==='pazo_push_worker_vapid')return vapid
    if(name==='pazo_push_worker_lease')return [{id:'one',kind:'sighting',subscriptions:subs}]
    if(name==='pazo_push_worker_report'){report=args.p_results;return null}
    assert.fail(name)
  }
  const fetchImpl=async(url,options)=>{
    contacted.push(url)
    assert.equal(options.headers['content-encoding'],'aes128gcm')
    assert.equal(options.redirect,'error')
    return new Response(null,{status:url.endsWith('ok')?201:url.endsWith('gone')?410:503})
  }
  const response=await createPushWorker({rpc,fetchImpl,subject:'mailto:a@b.c'})(request())
  assert.equal(response.status,200)
  assert.deepEqual(report,[{id:'one',retry:true,ok:['ok'],gone:['gone','evil'],failed:['busy']}])
  assert.ok(!contacted.some(url=>url.includes('example.com')))
})

test('the first run creates the server key once and never returns it',async()=>{
  let stored=null
  const rpc=async(name,args)=>{
    if(name==='pazo_push_worker_admit')return true
    if(name==='pazo_push_worker_vapid')return stored
    if(name==='pazo_push_worker_store_vapid'){stored={publicKey:args.p_public,privateJwk:args.p_private};return true}
    if(name==='pazo_push_worker_lease')return []
    assert.fail(name)
  }
  const response=await createPushWorker({rpc,fetchImpl:()=>assert.fail('no send'),subject:'mailto:a@b.c'})(request())
  assert.ok(stored?.publicKey)
  const body=await response.text()
  assert.ok(!body.includes(stored.privateJwk)&&!body.includes(JSON.parse(stored.privateJwk).d))
})

test('migration keeps the private data server-only and starts switched off',()=>{
  const sql=readFileSync(new URL('../../migrations/20261103100000_pazo_web_push.sql',import.meta.url),'utf8')
  assert.match(sql,/enabled boolean not null default false/)
  for(const name of ['pazo_push_worker_admit(text)','pazo_push_worker_vapid()','pazo_push_worker_store_vapid(text,text)','pazo_push_worker_lease(integer)','pazo_push_worker_report(jsonb)']){
    assert.ok(sql.includes(`revoke all on function public.${name} from public, anon, authenticated;`),name)
    assert.ok(!sql.includes(`on function public.${name} to authenticated`),name)
  }
  assert.ok(!/grant .* on (schema )?push_private/i.test(sql))
  // The queue stores a reference and a fixed kind, never the notification's text.
  const outbox=sql.match(/create table push_private\.outbox\(([\s\S]*?)\n\);/)[1]
  assert.doesNotMatch(outbox,/\b(title|body|message|location)\b/)
})
