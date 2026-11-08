// Sends queued pushes. Admitted only by the scheduler's single-use token.
// Copy is fixed per kind, so nothing a user wrote ever reaches a lock screen or a push service.
// Every kind is high urgency: each one shows a notification, and Android holds normal
// messages while the phone sleeps (observed on the PO's phone, documented by FCM).
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
    urgency:'high',ttl:86400,
  },
  care_reminder:{
    es:{title:'Recordatorio de cuidado',body:'Tu mascota tiene un cuidado pendiente.'},
    en:{title:'Care reminder',body:'Your pet has a care task coming up.'},
    urgency:'high',ttl:43200,
  },
  new_follower:{
    es:{title:'Tienes un nuevo seguidor',body:'Toca para ver quién es.'},
    en:{title:'You have a new follower',body:'Tap to see who it is.'},
    urgency:'high',ttl:86400,
  },
  health_alert:{
    es:{title:'Tenemos un aviso de salud para tu mascota',body:'Toca para ver si aplica a tu mascota.'},
    en:{title:'We have a health alert for your pet',body:'Tap to see if it applies to your pet.'},
    urgency:'high',ttl:43200,
  },
  admin_vigilante_pending:{
    es:{title:'Hay una alerta esperando tu aprobación',body:'Abre la bandeja del Vigilante.'},
    en:{title:'An alert is waiting for your approval',body:'Open the Vigilante inbox.'},
    urgency:'high',ttl:43200,
  },
  admin_vigilante_approved:{
    es:{title:'Se aprobó una alerta del Vigilante',body:'Si no fuiste tú, cancélala en la bandeja.'},
    en:{title:'A Vigilante alert was approved',body:'If it was not you, cancel it in the inbox.'},
    urgency:'high',ttl:43200,
  },
  admin_new_pet:{
    es:{title:'Nueva mascota en PAZO',body:'Toca para ver su perfil.'},
    en:{title:'New pet on PAZO',body:'Tap to see its profile.'},
    urgency:'high',ttl:86400,
  },
  admin_new_account:{
    es:{title:'Nueva cuenta en PAZO',body:'Alguien confirmó su registro.'},
    en:{title:'New account on PAZO',body:'Someone confirmed their sign-up.'},
    urgency:'high',ttl:86400,
  },
  return_no_pet:{
    es:{title:'Gracias por visitar PAZO',body:'Si te apetece, crea el perfil de tu mascota para tener su foto y su agenda a mano.'},
    en:{title:'Thanks for visiting PAZO',body:'If you like, create your pet’s profile to keep their photo and care schedule handy.'},
    urgency:'high',ttl:3600,
  },
  return_share:{
    es:{title:'Comparte el perfil de tu mascota',body:'Si te apetece, preséntasela a tus amigos con su enlace de PAZO.'},
    en:{title:'Share your pet’s profile',body:'If you like, introduce them to your friends with their PAZO link.'},
    urgency:'high',ttl:3600,
  },
  return_care:{
    es:{title:'Ten a mano su próximo cuidado',body:'Cuando te venga bien, guarda la fecha en su agenda.'},
    en:{title:'Keep their next care date handy',body:'Whenever it suits you, save the date in their care schedule.'},
    urgency:'high',ttl:3600,
  },
  return_home:{
    es:{title:'Tu mascota tiene su espacio en PAZO',body:'Cuando quieras, aquí tienes a mano su perfil y su agenda.'},
    en:{title:'Your pet has a place on PAZO',body:'Their profile and care schedule are here whenever you need them.'},
    urgency:'high',ttl:3600,
  },
}

export function pushMessage(kind,lang,id){
  const copy=COPY[kind]
  if(!copy)return null
  const text=copy[lang==='en'?'en':'es']
  return {payload:JSON.stringify({title:text.title,body:text.body,tag:'pazo-'+id,...(kind.startsWith('return_')?{tip:kind}:{})}),urgency:copy.urgency,ttl:copy.ttl}
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
        if(item.kind.startsWith('return_')&&await rpc('pazo_push_worker_return_allowed',{p_outbox_id:item.id,p_subscription_id:subscription.id})!==true)continue
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
