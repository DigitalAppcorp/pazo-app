import type {ReactNode} from 'react'
import {ChartPanel,RankBars} from '../admin/components/AdminClarity'
import type {BehaviorSegment,BehaviorSummary} from './behaviorSummary'
import {IntelligencePanel} from './IntelligencePanel'

export function BehaviorPanel({lang,period,segment,creative,revision,behavior,online,onRetry,usage}:{usage:ReactNode;lang:'es'|'en';period:7|30|90;segment:BehaviorSegment;creative:string;revision:number;behavior:{data:BehaviorSummary|null;error:boolean}|null;online:boolean;onRetry:()=>void}){
 const l=(es:string,en:string)=>lang==='es'?es:en
 const names:Record<string,string>={home:l('Inicio','Home'),pet:l('Mi mascota','My pet'),qr:l('Pasaporte QR','QR passport'),agenda:l('Agenda','Care planner'),communities:l('Comunidades','Communities'),places:l('Lugares','Places'),explore:l('Explorar','Explore'),first_pet:l('Primera mascota','First pet'),care_created:l('Cuidado guardado','Care saved'),qr_share_confirmed:l('QR compartido','QR shared'),loading:l('Espera','Loading'),error:l('Error','Error'),retry:l('Reintento','Retry'),network:l('Conexión','Connection'),unavailable:l('Servicio caído','Service down')}
 const label=(value:string)=>names[value]??value
 const format=(n:number)=>n.toLocaleString(lang==='es'?'es-US':'en-US')
 const percent=(n:number,d:number)=>d?Math.round(100*n/d)+'%':'—'
 const data=behavior?.data
 const none=<p className="ac-empty">{l('Aún sin datos suficientes','Not enough data yet')}</p>
 const issues=(data?.issues??[]).filter(r=>r.event!=='loading').sort((a,b)=>b.accounts-a.accounts)
 return <div className="behavior-panel pa-chart-grid" data-testid="behavior-panel">
  {!online&&<p role="status" className="pa-section-note">{l('Sin conexión. Comprueba la red y vuelve a actualizar.','Offline. Check your connection and refresh again.')}</p>}
  {!behavior&&<p role="status" className="pa-section-note">{l('Consultando recorridos…','Loading aggregate journeys…')}</p>}
  {behavior?.error&&<div role="alert" className="pa-recovery" style={{gridColumn:'1/-1'}}><div><strong>{l('No pudimos consultar este informe','This report could not be loaded')}</strong></div><button type="button" onClick={onRetry}>{l('Reintentar informe','Retry report')}</button></div>}
  <IntelligencePanel lang={lang} period={period} segment={segment} creative={creative} revision={revision} failures={data?<ChartPanel title={l('Errores en pantalla','Errors on screen')} unit={l('cuentas','accounts')} infoLabel={l('Cómo leer los errores','How to read errors')} info={l('Cuentas que encontraron un error o volvieron a intentarlo. Una espera no cuenta como error.','Accounts that encountered an error or tried again. Waiting does not count as an error.')} className="behavior-issues"><RankBars empty={l('Sin errores con muestra suficiente','No errors with enough sample')} rows={issues.slice(0,6).map((r,i)=>({key:r.screen+r.event+r.category+i,label:label(r.screen)+' · '+label(r.event)+(r.category!=='none'?' · '+label(r.category):''),value:r.accounts,display:format(r.accounts)}))}/></ChartPanel>:null} usage={<>{usage}{data&&<ChartPanel title={l('Vuelven a PAZO','They come back')} unit={l('de cuentas maduras','of mature accounts')} infoLabel={l('Cómo leer el regreso','How to read returns')} info={l('Días de Los Ángeles; solo cohortes cuya ventana terminó. Ancla: primera sesión observada, no primera visita histórica. D30/D90 no están disponibles con retención de 14 días.','Los Angeles calendar days; only completed windows. Anchor: first observed session, not historical first visit. D30/D90 are unavailable with 14-day retention.')} className="behavior-retention">{data.retention.length?<RankBars rows={data.retention.flatMap(r=>[{key:r.day+'o',label:l('Día ','Day ')+r.day+l(' · abrieron',' · reopened'),value:r.matured?r.reopened/r.matured:0,display:percent(r.reopened,r.matured),meta:format(r.reopened)+'/'+format(r.matured)},{key:r.day+'u',label:l('Día ','Day ')+r.day+l(' · algo útil',' · useful'),value:r.matured?r.useful/r.matured:0,display:percent(r.useful,r.matured),meta:format(r.useful)+'/'+format(r.matured)}])}/>:none}</ChartPanel>}</>}/>
 </div>
}
