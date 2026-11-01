import { useEffect, useState } from 'react'
import {InfoTip,RankBars} from '../admin/components/AdminClarity'
import { firstUtilitySummary, type UtilitySummary, utilityMetrics } from './firstUtility'

/** Aggregate extension of the existing marketing panel; no account rows. */
export function FirstUtilityPanel({lang,period}:{lang:'es'|'en';period:7|30|90}) {
  const l=(es:string,en:string)=>lang==='es'?es:en
  const [revision,setRevision]=useState(0)
  const [response,setResponse]=useState<{key:string;data:UtilitySummary|null;error:boolean}|null>(null)
  const key=`${period}:${revision}`
  const current=response?.key===key?response:null
  const data=current?.data
  useEffect(()=>{
    let current=true
    void firstUtilitySummary(period).then(data=>{if(current)setResponse({key,data,error:false})})
      .catch(()=>{if(current)setResponse({key,data:null,error:true})})
    return ()=>{current=false}
  },[period,key])
  const totals=Object.fromEntries(utilityMetrics.map(metric=>[metric,data?.groups.reduce((n,row)=>n+row[metric],0)??0]))
  const insufficient=(totals.first_pet_accounts??0)<10 || totals.matured_first_pet_accounts===0
  const labels:Record<string,string>={organic:l('Sin campaña atribuida','No attributed campaign'),
    qr_v2_en:'QR · EN · v2',cuidados_v2_en:l('Cuidados · EN · v2','Care · EN · v2'),app_v2_en:'PAZO · EN · v2',qr_es:'QR · ES',qr_en:'QR · EN',perfil_es:l('Perfil · ES','Profile · ES'),perfil_en:l('Perfil · EN','Profile · EN'),
    comunidad_es:l('Comunidades · ES','Communities · ES'),comunidad_en:l('Comunidades · EN','Communities · EN')}
  return <section aria-label={l('Primera utilidad','First useful action')} className="space-y-4 rounded-[18px] bg-white p-5 text-[#204E4A] shadow-[0_7px_25px_rgba(32,78,74,0.055)]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[16px] font-bold">{l('Primera utilidad','First useful action')}</h3>
      <button type="button" onClick={()=>setRevision(v=>v+1)} aria-label={l('Actualizar resultados','Refresh outcomes')} className="ac-refresh"><span aria-hidden="true">↻</span></button>
    </div>
    {!current&&<p role="status">{l('Consultando resultados…','Loading outcomes…')}</p>}
    {current?.error&&<p role="alert">{l('Estos resultados aún no están disponibles. Las demás métricas siguen funcionando.','These outcomes are not available yet. Other metrics remain available.')}</p>}
    {data&&<>
      <div className="flex items-center gap-2"><p role="status" className="text-[13px] font-bold">{data.status==='paused'?l('Recopilación pausada','Collection paused'):
        insufficient?l('Datos insuficientes para evaluar activación','Insufficient data to evaluate activation'):l('Resultados observados; sin inferencia causal','Observed outcomes; no causal inference')}</p>
       <InfoTip label={l('Cómo leer Primera utilidad','How to read first useful action')}><span className="block">{l('Cobertura disponible: hasta','Available coverage: up to')} {data.effective_days} {l('días. Solo cuentas verificadas elegibles desde el inicio de esta medición; QA y equipo excluidos.','days. Only eligible verified accounts since measurement began; QA and team excluded.')}</span><span className="block">{l('Confirmado: cuidado guardado o Web Share resuelto, dentro de 7 días de la primera mascota. QR visible y descarga iniciada son señales auxiliares: no prueban que se guardó un archivo. Compartir no prueba entrega en otra app. El QR puede ser útil de forma ocasional; no volver no demuestra fracaso.','Confirmed: persisted care item or resolved Web Share, within 7 days of the first pet. QR visibility and download initiation are auxiliary signals: they do not prove a file was saved. Sharing does not prove delivery in another app. QR can provide occasional value; not returning does not imply failure.')}</span><span className="block">{l('Umbral operativo de lectura: 10 cuentas y una ventana cerrada; no es significancia estadística. D7 usa como denominador solo quienes alcanzaron ese día tras su primera utilidad. Sin muestra o ventana adecuada no inferimos retención.','Operational reading threshold: 10 accounts and a closed window; not statistical significance. D7 uses only accounts that reached that day after their first useful action. Without an adequate sample or window we do not infer retention.')}</span></InfoTip></div>
      <div className="grid gap-5 md:grid-cols-2"><RankBars rows={[
        ['verified_registrations',l('Registros verificados','Verified registrations')],
        ['first_pet_accounts',l('Con primera mascota ≤7 días','First pet within 7 days')],
        ['first_utility_accounts',l('Primera utilidad confirmada','First useful action confirmed')],
        ['d7_return_accounts',l('Uso confirmado en días 7–13','Confirmed use on days 7–13')],
       ].map(([metric,label])=>({key:metric,label,value:totals[metric],display:totals[metric].toLocaleString()}))}/>
       <RankBars rows={[
        ['qr_visible_accounts',l('QR visible','QR visible')],
        ['qr_download_initiated_accounts',l('Descarga QR iniciada','QR download initiated')],
        ['qr_share_confirmed_accounts',l('Compartición QR confirmada','QR share confirmed')],
        ['care_created_accounts',l('Cuidado persistido','Care item persisted')],
       ].map(([metric,label])=>({key:metric,label,value:totals[metric],display:totals[metric].toLocaleString()}))}/></div>
      <p className="sr-only">{l('Ventana de primera utilidad cerrada','First-action window closed')}: {totals.matured_first_pet_accounts}. {l('Cuentas que ya alcanzaron D7','Accounts that reached D7')}: {totals.d7_matured_accounts}.</p>
      <div className="ac-chips">{data.groups.map(group=><span key={group.segment} className="ac-chip" title={l('con mascota; conteo abierto, no tasa de conversión','with a pet; open count, not a conversion rate')}>{labels[group.segment]}: {group.first_utility_accounts} / {group.first_pet_accounts}</span>)}</div>
    </>}
  </section>
}
