import {useEffect,useState,type ReactNode} from 'react'
import {ChartPanel,PairBars,RankBars} from '../admin/components/AdminClarity'
import {EXPERIENCE_DETAILS_ENABLED,adminExperienceDetails,type ExperienceDetailsReport} from './experienceDetails'
import {CAMPAIGN_EXPERIENCE_ENABLED,adminCampaignExperience,type CampaignExperienceReport} from './campaignExperience'
import {adminIntelligenceSummary,factLabels,type IntelligenceSummary} from './intelligenceSummary'
import {intelligenceTasks} from './intelligenceCatalog'
import type {BehaviorSegment} from './behaviorSummary'
export function IntelligencePanel({lang,period,segment,creative,revision,failures:failurePanel,usage}:{failures:ReactNode;usage:ReactNode;lang:'es'|'en';period:7|30|90;segment:BehaviorSegment;creative:string;revision:number}){
 const l=(es:string,en:string)=>lang==='es'?es:en,index=lang==='es'?0:1
 const [retry,setRetry]=useState(0)
 const key=`${period}:${segment}:${creative}:${revision}:${retry}`
 const [response,setResponse]=useState<{key:string;data?:IntelligenceSummary;error?:boolean}>()
 const current=response?.key===key?response:undefined,data=current?.data
 useEffect(()=>{
  const controller=new AbortController();let active=true
  void adminIntelligenceSummary(period,segment,creative,AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]))
   .then(data=>{if(active)setResponse({key,data})}).catch(()=>{if(active)setResponse({key,error:true})})
  return()=>{active=false;controller.abort()}
 },[key,period,segment,creative])
 const [byAd,setByAd]=useState<{key:string;data?:CampaignExperienceReport;error?:boolean}>()
 useEffect(()=>{
  if(!CAMPAIGN_EXPERIENCE_ENABLED)return
  const controller=new AbortController();let active=true
  void adminCampaignExperience(period,creative,AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]))
   .then(data=>{if(active)setByAd({key,data})}).catch(()=>{if(active)setByAd({key,error:true})})
  return()=>{active=false;controller.abort()}
 },[key,period,creative])
 const adReport=byAd?.key===key?byAd:undefined
 const [details,setDetails]=useState<{key:string;data?:ExperienceDetailsReport;error?:boolean}>()
 const scope=creative!=='all'?creative:segment==='paid_attributed'?'ads':'all'
 useEffect(()=>{
  if(!EXPERIENCE_DETAILS_ENABLED)return
  const controller=new AbortController();let active=true
  void adminExperienceDetails(period,scope,AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]))
   .then(data=>{if(active)setDetails({key,data})}).catch(()=>{if(active)setDetails({key,error:true})})
  return()=>{active=false;controller.abort()}
 },[key,period,scope])
 const detailNow=details?.key===key?details:undefined
 const detailLabels:Record<string,string>={unconfirmed_login:l('Quiso entrar sin confirmar el correo','Tried to sign in before confirming'),missing_fields:l('Faltan correo o contraseña','Missing email or password'),age_required:l('No marcó 18+','18+ not checked'),password_mismatch:l('Contraseñas distintas','Passwords differ'),weak_password:l('Contraseña débil','Weak password'),email_taken:l('Correo ya registrado','Email already registered'),invalid_email:l('Correo no válido','Invalid email'),rate_limited:l('Demasiados intentos','Too many attempts'),network:l('Sin conexión','No connection'),google_age:l('Google sin marcar 18+','Google without 18+'),google_cancelled:l('Canceló Google','Cancelled Google'),google_failed:l('Falló Google','Google failed'),other:l('Otro','Other'),home:l('Inicio','Home'),pet:l('Mascota','Pet'),communities:l('Comunidades','Communities'),places:l('Lugares','Places'),explore:l('Explorar','Explore'),search:l('Buscador','Search engine'),social:l('Red social','Social network'),direct:l('Directa o sin dato','Direct or unknown'),installed:l('App instalada','Installed app')}
 const detailRows=(kind:string)=>(detailNow?.data?.rows??[]).filter(r=>r.kind===kind).map(r=>({key:r.value,label:detailLabels[r.value]??r.value,value:r.requests,display:number(r.requests)}))
 const detailBody=(kind:string)=>detailNow?.data?<RankBars empty={detailNow.data.status==='paused'?l('Medición pausada','Measurement paused'):empty} rows={detailRows(kind)}/>:<p className="ac-empty" role={detailNow?.error?'alert':'status'}>{detailNow?.error?l('Este informe no está disponible','This report is unavailable'):l('Consultando…','Loading…')}</p>
 const number=(n:number)=>n.toLocaleString(lang==='es'?'es-US':'en-US')
 const anonLabels:Record<string,string>={signup_cta:l('Crear cuenta · sin campaña','Create account · no campaign'),signup_start:l('Formulario · sin campaña','Form · no campaign'),signup_requested:l('Registro enviado · sin campaña','Signup sent · no campaign'),signup_error:l('Error de registro · sin campaña','Signup error · no campaign'),welcome:l('Bienvenida','Welcome'),login_open:l('Pantalla de acceso','Login screen'),login_attempt:l('Inicio de sesión enviado','Login sent'),login_error:l('Error de acceso','Login error'),reset_attempt:l('Recuperar contraseña','Password recovery'),reset_error:l('Error de recuperación','Recovery error'),demo_enter:l('Entró a Demo','Entered Demo'),demo_home:l('Demo · Inicio','Demo · Home'),demo_pet:l('Demo · Mascota','Demo · Pet'),demo_communities:l('Demo · Comunidades','Demo · Communities'),demo_places:l('Demo · Lugares','Demo · Places'),demo_explore:l('Demo · Explorar','Demo · Explore'),demo_action:l('Demo · Tocó un ejemplo','Demo · Tapped a sample'),demo_signup:l('Demo · Crear cuenta','Demo · Create account'),demo_exit:l('Salió de Demo','Left Demo')}
 const social=/^(feed_|community_|profile_)/,tools=/^(pet_|care_|qr_|document_|map_|search_)/
 const by=<T,>(rows:T[],value:(r:T)=>number)=>[...rows].sort((a,b)=>value(b)-value(a))
 const tasks=data?.tasks??[],facts=data?.facts??[]
 const failures=by(tasks.filter(r=>r.kind==='failure'),r=>r.accounts),attempts=by(tasks.filter(r=>r.kind==='attempt'),r=>r.accounts)
 const attemptsOf=(task:string)=>attempts.find(r=>r.task===task)?.accounts
 const empty=l('Aún sin datos suficientes','Not enough data yet')
 const factRows=(rows:typeof facts)=>by(rows,r=>r.accounts).slice(0,6).map(r=>({key:r.metric,label:factLabels[r.metric][index],value:r.accounts,display:number(r.accounts)}))
 return <section className="intelligence-section" aria-label={l('Tareas y uso de la app','App tasks and usage')} data-testid="intelligence-panel">
  {!current&&<p role="status" className="pa-section-note">{l('Consultando tareas…','Loading product tasks…')}</p>}
  {current?.error&&<div role="alert" className="pa-recovery" style={{gridColumn:'1/-1'}}><div><strong>{l('Este informe no está disponible','This report is unavailable')}</strong></div><button type="button" onClick={()=>setRetry(x=>x+1)}>{l('Reintentar tareas','Retry tasks')}</button></div>}
  {data?.status==='paused'&&<p role="status" className="pa-section-note intelligence-paused">{l('Medición pausada','Measurement paused')}</p>}
  <h3 id="pa-sec-fails" className="pa-section-title">{l('Qué falla','What fails')}</h3>
  {failurePanel}
  {data&&data.status!=='paused'&&<ChartPanel title={l('Qué está fallando','What is failing')} unit={l('cuentas','accounts')} infoLabel={l('Cómo leer los fallos','How to read failures')} info={l('Cuentas por tarea con un fallo observado. No calculamos una tasa de éxito entre fuentes distintas.','Accounts per task with an observed failure. We do not calculate success rates across different sources.')} className="intelligence-failures"><RankBars empty={l('Sin fallos con muestra suficiente','No failures with enough sample')} rows={failures.slice(0,6).map(r=>{const tried=attemptsOf(r.task);return {key:r.task,label:intelligenceTasks[r.task][index],value:r.accounts,display:number(r.accounts),meta:tried?number(tried)+l(' intentos',' attempts'):undefined}})}/></ChartPanel>}
  {EXPERIENCE_DETAILS_ENABLED&&segment!=='unknown'&&<ChartPanel title={l('Por qué falla el registro','Why signup fails')} unit={l('veces','times')} infoLabel={l('Cómo leer este gráfico','How to read this chart')} info={l('Conteos por motivo, no personas. No guardamos lo que escriben. Un correo ya registrado no siempre se detecta: Supabase puede ocultarlo por seguridad. Grupos con menos de 10 no se muestran.','Counts per reason, not people. We do not store what is typed. An existing email is not always detected: Supabase may hide it for security. Groups under 10 are hidden.')} className="detail-signup-failure pa-span">{detailBody('signup_failure')}</ChartPanel>}
  <h3 id="pa-sec-uses" className="pa-section-title">{l('Qué usan','What they use')}</h3>
  {usage}
  {data&&data.status!=='paused'&&<>
   <ChartPanel title={l('Qué intentan hacer','What they try to do')} unit={l('cuentas','accounts')} infoLabel={l('Cómo leer los intentos','How to read attempts')} info={l('Puede haber varias acciones por cuenta; no sumes las filas como personas distintas.','An account can perform several actions; do not add rows as distinct people.')} className="intelligence-attempts"><RankBars empty={empty} rows={attempts.slice(0,6).map(r=>({key:r.task,label:intelligenceTasks[r.task][index],value:r.accounts,display:number(r.accounts)}))}/></ChartPanel>
   <ChartPanel title={l('Herramientas que usan','Tools they use')} unit={l('cuentas','accounts')} infoLabel={l('Cómo leer las herramientas','How to read tools')} info={l('Cuentas con registros confirmados; los borrados pueden reducir estas cifras.','Accounts with confirmed records; deletions can reduce these figures.')} className="intelligence-tools"><RankBars empty={empty} rows={factRows(facts.filter(r=>tools.test(r.metric)))}/></ChartPanel>
   <ChartPanel title={l('Feed y comunidades','Feed and communities')} unit={l('cuentas','accounts')} infoLabel={l('Cómo leer la participación','How to read participation')} info={l('Que una tarjeta aparezca no demuestra lectura ni satisfacción. No medimos tiempo de lectura. El ranking no cambia automáticamente.','A card appearing does not prove reading or satisfaction. Reading time is not measured. Ranking does not change automatically.')} className="intelligence-social pa-span"><RankBars empty={empty} rows={factRows(facts.filter(r=>social.test(r.metric)))}/></ChartPanel>
  </>}
  {(((EXPERIENCE_DETAILS_ENABLED||CAMPAIGN_EXPERIENCE_ENABLED)&&segment!=='unknown')||(data&&data.status!=='paused'&&segment==='all'&&creative==='all'))&&<h3 id="pa-sec-anon" className="pa-section-title">{l('Sin cuenta','Without an account')}</h3>}
  {EXPERIENCE_DETAILS_ENABLED&&segment!=='unknown'&&<>
   <ChartPanel title={l('Última pantalla en Demo','Last screen in Demo')} unit={l('salidas','exits')} infoLabel={l('Cómo leer este gráfico','How to read this chart')} info={l('Pantalla donde estaba al salir de la Demo o dejar la pestaña en segundo plano. Cambiar de app momentáneamente también cuenta. No demuestra abandono ni su causa. Puede faltar si el navegador cierra antes de enviarlo.','Screen in use when leaving the Demo or sending the tab to the background. Briefly switching apps also counts. It does not prove abandonment or its cause. It may be missing if the browser closes before sending.')} className="detail-demo-last">{detailBody('demo_last_screen')}</ChartPanel>
   <ChartPanel title={l('De dónde llegan sin anuncio','Where they come from without an ad')} unit={l('visitas','visits')} infoLabel={l('Cómo leer este gráfico','How to read this chart')} info={l('Visitas sin sesión, no personas ni cuentas: esto no llena el grupo Orgánico de cuentas. Muchos navegadores y apps no informan la procedencia, así que Directa incluye lo desconocido. Solo guardamos la categoría, nunca la dirección.','Signed-out visits, not people or accounts: this does not fill the Organic account group. Many browsers and apps do not report the source, so Direct includes unknown traffic. Only the category is kept, never the address.')} className="detail-arrival">{detailBody('arrival_source')}</ChartPanel>
  </>}
  {CAMPAIGN_EXPERIENCE_ENABLED&&segment!=='unknown'&&<>
   <ChartPanel title={l('Qué hacen antes de registrarse','What they do before signing up')} unit={l('solicitudes','requests')} infoLabel={l('Cómo leer este gráfico','How to read this chart')} info={l('Conteos por pantalla, no personas: no se puede seguir a nadie. Un navegador conserva su anuncio hasta 72 horas. Sin campaña no significa orgánico: incluye directo, compartido y anuncios sin etiqueta. Grupos con menos de 10 no se muestran.','Counts per screen, not people: nobody can be followed. A browser keeps its ad for up to 72 hours. No campaign does not mean organic: it includes direct, shared and untagged ads. Groups under 10 are hidden.')} className="intelligence-by-ad pa-span">{adReport?.data?<PairBars empty={adReport.data.status==='paused'?l('Medición pausada','Measurement paused'):empty} first={l('Ads','Ads')} second={creative==='all'?l('Sin campaña','No campaign'):undefined} rows={adReport.data.rows.map(r=>({key:r.signal,label:anonLabels[r.signal],a:r.ads,b:r.other}))}/>:<p className="ac-empty" role={adReport?.error?'alert':'status'}>{adReport?.error?l('Este informe no está disponible','This report is unavailable'):l('Consultando…','Loading…')}</p>}</ChartPanel>
  </>}
  {data&&data.status!=='paused'&&segment==='all'&&creative==='all'&&<>
   <ChartPanel title={l('Demo y acceso','Demo and login')} unit={l('solicitudes','requests')} infoLabel={l('Cómo leer Demo y acceso','How to read Demo and login')} info={l('Solicitudes anónimas; pueden incluir visitas propias anteriores a la exclusión. Sin vínculo comprobable con cuentas o anuncios: incluyen ads y orgánicos sin distinguirlos. No se infiere abandono ni visitantes únicos.','Anonymous requests may include your own earlier visits. No verified link to accounts or ads: ads and organic are not distinguished. No abandonment or unique visitors are inferred.')} className="intelligence-anonymous pa-span"><RankBars empty={empty} rows={by(data.anonymous,r=>r.requests).slice(0,10).map(r=>({key:r.signal,label:anonLabels[r.signal],value:r.requests,display:number(r.requests)}))}/></ChartPanel>
  </>}
 </section>
}
