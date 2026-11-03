// Sends queued pushes. Admitted only by the scheduler's single-use token.
// Copy is fixed per kind, so nothing a user wrote ever reaches a lock screen or a push service.
import {encryptPayload,generateVapidKeys,vapidAuthorization} from '../_shared/webPush.mjs'

const ENDPOINT=/^https:\/\/(fcm\.googleapis\.com|[a-z0-9-]+\.google\.com\/fcm|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)\//
const COPY={
  sighting:{
    es:{title:'Alguien vio a tu mascota',body:'Abre PAZO para ver el aviso.'},
    en:{title:'Someone saw your pet',body:'Open PAZO to see the report.'},
    urgency:'high',ttl:86400,
  },
  community_join:{
    es:{title:'Nuevo miembro en tu comunidad',body:'Abre PAZO para saludar.'},
    en:{title:'New member in your community',body:'Open PAZO to say hello.'},
    urgency:'normal',ttl:86400,
  },
  care_reminder:{
    es:{title:'Recordatorio de cuidado',body:'Tu mascota tiene un cuidado pendiente.'},
    en:{title:'Care reminder',body:'Your pet has a care task coming up.'},
    urgency:'normal',ttl:43200,
  },
  new_follower:{
    es:{title:'Tienes un nuevo seguidor',body:'Toca para ver quién es.'},
    en:{title:'You have a new follower',body:'Tap to see who it is.'},
    urgency:'normal',ttl:86400,
  },
  admin_new_pet:{
    es:{title:'Nueva mascota en PAZO',body:'Toca para ver su perfil.'},
    en:{title:'New pet on PAZO',body:'Tap to see its profile.'},
    urgency:'normal',ttl:86400,
  },
  admin_new_account:{
    es:{title:'Nueva cuenta en PAZO',body:'Alguien confirmó su registro.'},
    en:{title:'New account on PAZO',body:'Someone confirmed their sign-up.'},
    urgency:'normal',ttl:86400,
  },
}

export function pushMessage(kind,lang,id){
  const copy=COPY[kind]
  if(!copy)return null
  const text=copy[lang==='en'?'en':'es']
  return {payload:JSON.stringify({title:text.title,body:text.body,tag:'pazo-'+id}),urgency:copy.urgency,ttl:copy.ttl}
}

// 404 and 410 mean the device is gone. 429 and 5xx are worth retrying. Anything else
// is a request the service will keep refusing, so retrying only wastes attempts.
export function classifyStatus(status){
  if(status>=200&&status<300)return 'ok'
  if(status===404||status===410)return 'gone'
  if(status===429||status>=500)return 'retry'
  return 'failed'
}

export function createPushWorker({rpc,fetchImpl=fetch,subject,nowSeconds=()=>Math.floor(Date.now()/1000)}){
  const ensureVapid=async()=>{
    const current=await rpc('pazo_push_worker_vapid')
    if(current)return current
    await rpc('pazo_push_worker_store_vapid',(({publicKey,privateJwk})=>({p_public:publicKey,p_private:privateJwk}))(await generateVapidKeys()))
    return rpc('pazo_push_worker_vapid')
  }
  const send=async(subscription,message,vapid)=>{
    if(!ENDPOINT.test(subscription.endpoint))return 'gone'
    try{
      const body=await encryptPayload({plaintext:message.payload,p256dh:subscription.p256dh,auth:subscription.auth})
      const authorization=await vapidAuthorization({endpoint:subscription.endpoint,publicKey:vapid.publicKey,privateJwk:vapid.privateJwk,subject,nowSeconds:nowSeconds()})
      const response=await fetchImpl(subscription.endpoint,{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
        headers:{authorization,'content-encoding':'aes128gcm','content-type':'application/octet-stream',ttl:String(message.ttl),urgency:message.urgency},
        body,
      })
      await response.body?.cancel?.()
      return classifyStatus(response.status)
    }catch{return 'retry'}
  }
  return async request=>{
    if(request.method!=='POST')return new Response(null,{status:405})
    const token=(request.headers.get('authorization')??'').replace(/^Bearer /,'')
    if(await rpc('pazo_push_worker_admit',{p_token:token})!==true)return new Response(null,{status:401})
    const vapid=await ensureVapid()
    if(!vapid)return new Response(null,{status:503})
    const leased=await rpc('pazo_push_worker_lease',{p_limit:20})
    const results=[]
    for(const item of leased){
      const result={id:item.id,retry:false,ok:[],gone:[],failed:[]}
      for(const subscription of item.subscriptions){
        const message=pushMessage(item.kind,subscription.lang,item.id)
        const outcome=message?await send(subscription,message,vapid):'failed'
        if(outcome==='ok')result.ok.push(subscription.id)
        else if(outcome==='gone')result.gone.push(subscription.id)
        else{
          result.failed.push(subscription.id)
          if(outcome==='retry')result.retry=true
        }
      }
      results.push(result)
    }
    if(results.length)await rpc('pazo_push_worker_report',{p_results:results})
    return new Response(JSON.stringify({processed:results.length}),{status:200,headers:{'content-type':'application/json'}})
  }
}
