import type {BehaviorSummary} from './behaviorSummary'

/** Product decisions in plain language; observations never presented as causes. */
export function BehaviorReadout({data,lang,view}:{data:BehaviorSummary;lang:'es'|'en';view:'ads'|'return'}){
 const l=(es:string,en:string)=>lang==='es'?es:en
 const errors=data.prereg.find(r=>r.step==='signup_error')?.signals
 const gaps=data.funnel.filter(r=>r.accounts!==null&&r.denominator!==null).map(r=>({step:r.step,lost:r.denominator!-r.accounts!,sample:r.denominator!})).sort((a,b)=>b.lost-a.lost)
 const gap=gaps[0]
 const labels:Record<string,string>={first_pet:l('guardar la primera mascota','saving the first pet'),tool_view:l('abrir una herramienta','opening a tool'),utility:l('completar una utilidad','completing a useful action'),verified:l('verificar el correo','verifying email')}
 const mature=data.retention.find(r=>r.day===7)
 return <section className="behavior-readout" aria-label={l('Lectura rápida','Quick read')}>
  <p className="behavior-eyebrow">{l('QUÉ SABEMOS AHORA','WHAT WE KNOW NOW')}</p>
  <h3>{data.status==='paused'?l('La nueva medición está pausada','New measurement is paused'):data.status==='insufficient'?l('Aún faltan datos para sacar conclusiones','More data is needed before drawing conclusions'):view==='ads'?l('Revisa el paso donde menos cuentas continúan','Review the step where fewer accounts continue'):l('Separa volver a abrir de volver a usar','Separate reopening from useful return')}</h3>
  <p>{data.status!=='collecting'?l('Los guiones indican datos aún no disponibles o una muestra protegida; no significan cero usuarios.','Dashes mean unavailable data or a protected sample; they do not mean zero users.'):view==='ads'&&gap&&gap.lost>0?l(`Entre estas cuentas, ${gap.lost} de ${gap.sample} cuentas no tienen el siguiente paso observado: ${labels[gap.step]}. Es un punto para revisar, no una causa demostrada.`,`In this group, ${gap.lost} of ${gap.sample} accounts have no next observed step: ${labels[gap.step]}. This is a place to review, not a proven cause.`):view==='return'&&mature?l(`De ${mature.matured} cuentas con una semana completa observable, ${mature.reopened} volvieron a abrir y ${mature.useful} completaron una utilidad el día 7.`,`Of ${mature.matured} accounts with a complete observable week, ${mature.reopened} reopened and ${mature.useful} completed a useful action on day 7.`):l('Todavía no hay un tramo comparable suficiente para señalar una pérdida o un patrón de regreso.','There is not yet a sufficient comparable window to identify a gap or return pattern.')}</p>
  {view==='ads'&&errors!==undefined&&<p>{l(`${errors} solicitudes de registro terminaron con error. Revisa ese formulario antes de atribuir la diferencia al anuncio. Son solicitudes, no personas únicas.`,`${errors} signup requests ended in error. Review the form before attributing the gap to the ad. These are requests, not unique people.`)}</p>}
  {view==='return'&&data.totals&&<p>{l(`Primera observación: ${data.totals.first_observed_sessions} sesiones. Regreso observado: ${data.totals.return_sessions}. Promedio: ${(data.totals.sessions/data.totals.accounts).toFixed(1)} sesiones por cuenta en esta ventana.`, `First observation: ${data.totals.first_observed_sessions} sessions. Observed return: ${data.totals.return_sessions}. Average: ${(data.totals.sessions/data.totals.accounts).toFixed(1)} sessions per account in this window.`)}</p>}
 </section>
}
