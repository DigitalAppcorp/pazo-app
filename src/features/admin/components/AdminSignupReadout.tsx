import {useEffect,useState,type ReactNode} from 'react'
import {type AdminUser} from '../adminDashboardService'
import {adminSignupSummary,type AdminSignupSummary} from '../adminSignupSummary'
import {ChartPanel,PairBars,RankBars} from './AdminClarity'

export function AdminSignupReadout({lang,users,children}:{
 lang:'es'|'en'; users:AdminUser[]
 children:(accounts:AdminSignupSummary['accounts'])=>ReactNode
}){
 const [read,setRead]=useState<{page:AdminUser[];result:AdminSignupSummary|null}|null>(null)
 const signup=read?.page===users?read.result:null
 const signupError=read?.page===users&&read.result===null
 const l=(es:string,en:string)=>lang==='es'?es:en
 const n=(value:number)=>value.toLocaleString(lang==='es'?'es-US':'en-US')
 const email=signup?.methods.find(method=>method.method==='email')
 const google=signup?.methods.find(method=>method.method==='google')
 const other=signup?.methods.find(method=>method.method==='other')
 useEffect(()=>{
  const controller=new AbortController()
  void adminSignupSummary(users.map(user=>user.user_id),controller.signal).then(result=>{
   if(!controller.signal.aborted)setRead({page:users,result})
  }).catch(()=>{
   if(!controller.signal.aborted)setRead({page:users,result:null})
  })
  return ()=>controller.abort()
 },[users])
 return <>
  <ChartPanel title={l('¿Cómo se registraron?','How did people sign up?')} info={l('Cuentas actuales, sin pruebas ni administradores. «Envío registrado» es el dato de Auth y no confirma que el mensaje llegó al buzón. Google puede confirmar una cuenta sin un correo de PAZO.','Current accounts, excluding test and admin accounts. “Send recorded” is an Auth status and does not confirm inbox delivery. Google can verify an account without a PAZO email.')}>
   {signup?<div className="space-y-3">
    <PairBars first={l('Correo','Email')} second="Google" rows={([
     ['registered',l('Registraron una cuenta','Registered')],
     ['confirmed',l('Confirmaron la cuenta','Verified')],
     ['signed_in',l('Iniciaron sesión','Signed in')],
     ['with_pet',l('Agregaron mascota','Added a pet')],
    ] as const).map(([key,label])=>({key,label,a:email?.[key]??0,b:google?.[key]??0}))}/>
    <p className="text-sm font-semibold">{l('Correo de confirmación con envío registrado','Confirmation email send recorded')} · {n(email?.email_sent??0)}</p>
    {!!other?.registered&&<p className="text-sm font-semibold">{l('Cuentas con otro método','Accounts using another method')} · {n(other.registered)}</p>}
   </div>:<p role="status" className="ac-empty">{signupError?l('No pudimos cargar el registro. Usa Actualizar para reintentar.','Could not load signup data. Use Refresh to try again.'):l('Cargando registros…','Loading signups…')}</p>}
  </ChartPanel>
  {signup&&<ChartPanel title={l('Intentos de entrar sin confirmar','Sign-in attempts before confirmation')} info={l('Últimos 7 días en horario de Los Ángeles. Señales anónimas observadas, hasta una por carga de página, sin vínculo a cuentas. Solo se muestran días con al menos 10 señales.','Past 7 days in Los Angeles time. Anonymous observed signals, at most one per page load, with no account link. Only days with at least 10 signals are shown.')}>
   {signup.attempts_active?<RankBars empty={l('Sin días con suficientes señales para mostrar.','No days with enough signals to show.')} rows={signup.attempts.flatMap(({day,requests})=>requests===null?[]:[{
    key:day,label:new Date(day+'T00:00:00Z').toLocaleDateString(lang==='es'?'es-US':'en-US',{month:'short',day:'numeric',timeZone:'UTC'}),value:requests,
   }])}/>:<p className="ac-empty">{l('Medición pausada.','Measurement paused.')}</p>}
  </ChartPanel>}
  {children(signup?.accounts??{})}
 </>
}
