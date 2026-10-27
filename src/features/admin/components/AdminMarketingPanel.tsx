import { useCallback,useEffect,useState } from 'react'
import { adminMarketingSummary,type AdminMarketingSummary } from '../adminDashboardService'
import { AdminGlyph } from './AdminVisuals'

/** Read/collection are independently gated. No RPC call until the privacy,
 * migration and report-access review receive an explicit release GO.
 */
export const PAZO_MARKETING_ADMIN_REPORT_ENABLED=true

const campaigns:Record<string,{es:string;en:string}>={
 perfil_es:{es:'Perfil · español',en:'Profile · Spanish'},
 perfil_en:{es:'Perfil · inglés',en:'Profile · English'},
 qr_es:{es:'QR · español',en:'QR · Spanish'},
 qr_en:{es:'QR · inglés',en:'QR · English'},
 comunidad_es:{es:'Comunidades · español',en:'Communities · Spanish'},
 comunidad_en:{es:'Comunidades · inglés',en:'Communities · English'},
}

function SummaryStat({label,value,note}:{
 label:string;value:number|string;note?:string
}){
 return <div className="min-w-0 rounded-[21px] bg-white p-4 shadow-[0_7px_25px_rgba(32,78,74,0.055)]">
  <p className="text-[12px] font-semibold text-[#597269]">{label}</p>
  <p className="mt-2 text-[25px] font-black text-[#183F34]">{value}</p>
  {note&&<p className="mt-1 text-[11px] leading-relaxed text-[#71857F]">{note}</p>}
 </div>
}

export function AdminMarketingPanel({lang,period}:{lang:'es'|'en';period:7|30|90}){
 const l=(es:string,en:string)=>lang==='es'?es:en
 const [response,setResponse]=useState<{key:string;data:AdminMarketingSummary|null;error:string}|null>(null)
 const [revision,setRevision]=useState(0)
 const requestKey=`${period}:${revision}:${lang}`
 const current=response?.key===requestKey?response:null
 const data=current?.data??null
 const error=current?.error??''
 const loading=PAZO_MARKETING_ADMIN_REPORT_ENABLED&&current===null
 const format=(x:number)=>Number.isFinite(x)?x.toLocaleString(lang==='es'?'es-US':'en-US'):'—'

 const reload=useCallback(()=>{
  if(PAZO_MARKETING_ADMIN_REPORT_ENABLED)setRevision(v=>v+1)
 },[])
 useEffect(()=>{
  if(!PAZO_MARKETING_ADMIN_REPORT_ENABLED)return
  let cancelled=false
  void adminMarketingSummary(period).then(result=>{
   if(!cancelled)setResponse({key:requestKey,data:result,error:''})
  }).catch(()=>{
   if(!cancelled)setResponse({key:requestKey,data:null,error:lang==='es'?'No pudimos consultar los datos autorizados.':'Authorized metrics are unavailable.'})
  })
  return ()=>{cancelled=true}
 },[period,requestKey,lang])

 return <section aria-busy={loading} aria-label={l('Medición publicitaria','Campaign measurement')} className="min-w-0 space-y-4">
  <div className="rounded-[21px] bg-[#E8F2E6] px-5 py-4">
   <div className="flex items-start gap-3">
    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#166D54]"><AdminGlyph name="chart" size={21}/></span>
    <div className="min-w-0 flex-1">
     <h3 className="text-[17px] font-black text-[#204E4A]">{l('Campañas de PAZO','PAZO campaigns')}</h3>
     <p className="mt-1 text-[12px] leading-relaxed text-[#597269]">{l(
      'Atribución interna por anuncio. No se envían conversiones individuales a Meta.',
      'Internal per-ad attribution. No individual conversions are sent to Meta.'
     )}</p>
    </div>
   </div>
  </div>

  {!PAZO_MARKETING_ADMIN_REPORT_ENABLED&&<div role="status" className="rounded-[21px] bg-white p-5 shadow-sm">
   <p className="text-[15px] font-black text-[#204E4A]">{l('En preparación · no hay recopilación activa','In preparation · collection is inactive')}</p>
   <p className="mt-2 text-[13px] leading-relaxed text-[#647C75]">{l(
    'El panel de métricas está programado, pero su lectura y la recopilación permanecen desactivadas hasta instalar y autorizar el sistema. No se muestran cifras ficticias.',
    'The report interface is prepared, but reading and collection remain disabled until a separate installation and release approval. No placeholder numbers are presented.'
   )}</p>
  </div>}

  {PAZO_MARKETING_ADMIN_REPORT_ENABLED&&<>
   <div className="flex flex-wrap items-center justify-between gap-2">
    <span className="text-[12px] font-bold text-[#5B736C]">{l('Período: últimos','Period: last')} {period} {l('días','days')}</span>
    <button type="button" onClick={reload} disabled={loading}
     className="min-h-11 rounded-full bg-white px-4 text-[12px] font-bold text-[#204E4A] shadow-sm hover:bg-[#E1E53F] disabled:opacity-50">
     {l('Actualizar métricas','Refresh metrics')}
    </button>
   </div>
   {loading&&<p role="status" className="rounded-[19px] bg-white p-4 text-[13px]">{l('Consultando métricas autorizadas…','Loading authorized metrics…')}</p>}
   {error&&<p role="alert" className="rounded-[19px] bg-[#F9E7DE] p-4 text-[13px] text-[#823E2D]">{error}</p>}
   {data&&<div className="space-y-4">
    <p role="status" className="text-[12px] font-semibold text-[#647C75]">
     {data.status==='not_configured'
      ?l('Sin configurar: recopilación desactivada','Not configured: collection disabled')
      :data.status==='paused'
       ?l('Recopilación pausada','Collection paused')
       :l('Recopilación activa','Collection active')}
     {' · '}{l('Actualizado','Updated')} {new Date(data.as_of).toLocaleString(lang==='es'?'es-US':'en-US')}
     {' · '}{l('Días calendario de Los Ángeles','Los Angeles calendar days')}
    </p>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
     <SummaryStat label={l('Señales de llegada','Landing signals')} value={format(data.totals.landing_signals)}
      note={l('No son visitantes únicos','Not unique visitors')}/>
     <SummaryStat label={l('Registros confirmados','Verified signups')} value={format(data.totals.verified_signups)}/>
     <SummaryStat label={l('Primera mascota en 7 días','First pet within 7 days')} value={format(data.totals.first_pet_within_7d)}/>
     <SummaryStat label={l('Actividad observada D7','Observed D7 activity')} value={format(data.totals.d7_screen_activity_proxy)}
      note={l('Proxy de navegación, no retención real','Navigation proxy, not true retention')}/>
    </div>
    <div className="min-w-0 rounded-[21px] bg-white p-4 shadow-[0_7px_25px_rgba(32,78,74,0.055)] sm:p-5">
     <h3 className="text-[16px] font-black text-[#204E4A]">{l('Resultados por anuncio y día','Results by ad and day')}</h3>
     <p className="mt-1 text-[12px] text-[#6F837A]">{l(
      'Las llegadas y las altas pueden suceder en fechas distintas. No se calcula una tasa de conversión a partir de señales aproximadas.',
      'Landing signals and signups may occur on different dates. No conversion rate is calculated from approximate signals.'
     )}</p>
     {data.daily.length===0?<p className="mt-4 text-[13px] text-[#647C75]">{l('Sin mediciones en este período.','No measurements in this period.')}</p>:
      <div className="mt-4 w-full overflow-x-auto">
       <table className="w-full min-w-[560px] text-left text-[12px]">
        <thead><tr className="bg-[#F3F7EF] text-[#4B6B61]">
         <th scope="col" className="rounded-l-xl px-3 py-3 font-bold">{l('Fecha','Date')}</th>
         <th scope="col" className="px-3 py-3 font-bold">{l('Anuncio','Ad')}</th>
         <th scope="col" className="px-3 py-3 text-right font-bold">{l('Señales','Signals')}</th>
         <th scope="col" className="px-3 py-3 text-right font-bold">{l('Registros','Signups')}</th>
         <th scope="col" className="rounded-r-xl px-3 py-3 text-right font-bold">{l('Mascotas','Pets')}</th>
        </tr></thead>
        <tbody>{data.daily.map((entry,i)=><tr key={entry.day+'-'+entry.creative+'-'+i} className="text-[#35574C]">
         <td className="whitespace-nowrap px-3 py-3">{entry.day}</td>
         <td className="px-3 py-3">{campaigns[entry.creative]?.[lang]??entry.creative}</td>
         <td className="px-3 py-3 text-right tabular-nums">{format(entry.landing_signals)}</td>
         <td className="px-3 py-3 text-right tabular-nums">{format(entry.verified_signups)}</td>
         <td className="px-3 py-3 text-right tabular-nums">{format(entry.first_pet_within_7d)}</td>
        </tr>)}</tbody>
       </table>
      </div>}
    </div>
   </div>}
   <p className="text-[12px] leading-relaxed text-[#6B8078]">{l(
    'Conteos internos orientativos. No son resultados oficiales de Meta, gasto publicitario, retorno financiero ni visitantes únicos. Se excluyen cuentas QA del embudo de registro.',
    'Directional internal counts only. Not official Meta results, advertising spend, financial returns or unique visitors. QA accounts are excluded from signup cohorts.'
   )}</p>
  </>}
 </section>
}
